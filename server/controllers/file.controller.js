'use strict';

var models = require('../models'),
    config = require('../config/config'),
    crypto = require('crypto'),
    moment = require('moment'),
    knox = require('knox'),
    gm = require('gm').subClass({imageMagick:true}),
    path = require('path'),
    mv = require('mv'),
    formidable = require('formidable'),
    fs = require('fs'),
    pg = require('pg'),
    copyTo = require('pg-copy-streams').to;


var s3client = knox.createClient({
  key: config.aws.key,
  secret: config.aws.secret,
  bucket: config.aws.bucket
});


// Serve a static asset
/**
 /image/filename.png
 /image/small/image.png
 /dataset/set.csv
**/
exports.serve = function(req, res) {

  var availableStyles = ['thumbnail', 'small', 'medium', 'large', 'xlarge'];
  // validate style
  if (availableStyles.indexOf(req.params.style) !== -1) {
    var style = req.params.style;
  } else {
    var style;
  }

  var params = req.params;
  var type = params.type;
  var filename = params.filename;
  var filepath = req.path;
  var s3url = '/' + config.env + '/files' + filepath;

  // Try to get the file
  s3client.getFile(s3url, function(err,s3res) {
    if (err){ return handleError(res,err); }
    if (s3res.statusCode===403) { return sendStatus(s3.statusCode); }

    if (s3res.statusCode === 200) {
      s3res.pipe(res);
      s3res.on('error', function(err){ return handleError(res,err); });
    } else if((s3res.statusCode === 404) && !style) {
      return res.status(404).json('Not found');
    } else if ( (s3res.statusCode === 404) && (style) ) {
      var srcUrl = '/' + config.env + '/files/' + type + '/' + filename;
      console.log('Trying to create derivative from ' + srcUrl);
      // Try to create a derivative
      // Create a temporary local file for download
      var tmpPath = path.join(__dirname, '../tmp/' + filename);
      console.log('Local path: ' + tmpPath);
      var file = fs.createWriteStream(tmpPath);
      file.on('open', function(fd){
        console.log('file opened');
        s3client.getFile(srcUrl, function(err, origResponse) {          
          // Handle error or not found
          if (err){ return handleError(res,err); }
          if (origResponse.statusCode === 404){ return res.status(404).json('Original file not found'); }
          // Handle success
          if (origResponse.statusCode === 200) {
            console.log('Original file found, downloading');
            // save s3 file to local tmp location
            origResponse.pipe(file);
            // handle save error
            origResponse.on('error', function(err){ return handleError(res, 'Error downloading original file from S3. '); });
            // handle save finished
            origResponse.on('end', function(){
              console.log('S3 original file downloaded to local.')
              // Create local derivative
              var w=1600;
              switch(style){
                case 'thumbnail': w=80; break;
                case 'small': w=400; break;
                case 'medium': w=800; break;
                case 'large': w=1200; break;
                case 'xlarge': w=1600; break;
                default: return handleError(res,'Not a valid style: ' + style);
              }

              var resizedFilePath = path.join(__dirname, '../tmp/resized/' + filename);
              console.log('Creating derivative ' + style + ' from ' + tmpPath + ' at ' + resizedFilePath);
              gm(tmpPath).resize(w)
                .write(resizedFilePath, function(err) {
                  // Get filesize
                  fs.stat(resizedFilePath, function(err,stats){
                    if (err) { return handleError(res,err); }
                    // Send file to S3
                    console.log('Sending derived file to S3 from: ' + resizedFilePath);
                    console.log('to ' + s3url );
                    s3client.putFile(resizedFilePath, s3url, function(err, uploadResponse) {
                      if (err) { return handleError(res,err); }
                      console.log('Upload complete, status: ' + uploadResponse.statusCode);
                      // Serve the created and uploaded derivative
                      if (uploadResponse.statusCode === 200) {
                        console.log('Fetching file to stream to res: ' + s3url);
                        s3client.getFile(s3url, function(err, s3FinalResponse){
                          console.log('done ' + s3FinalResponse.statusCode);
                          if (s3FinalResponse.statusCode === 200) {
                            console.log('stream');
                            s3FinalResponse.pipe(res);
                            s3FinalResponse.on('error', function(err){
                              return handleError(res, 'Error downloading original file from S3. '); });
                            // handle save finished
                            s3FinalResponse.on('data', function(){
                              //console.log('data');
                            })
                            s3FinalResponse.on('end', function(){
                              console.log('end');
                            });
                          }
                        });
                      }
                    });
                  });
                });
            });
          }
        });
      }).on('error', function(err){
        return handleError(res,err);
      });
    } else {
      console.log(filepath + ' not found ');
      return res.sendStatus(s3res.statusCode);
    }
  });
}


/**
 * Convert a database table to a csv file for a primary source, based on a primary_id
 *
 **/
exports.convert = function(req,res){
  console.log(req.body.primaryId);
  console.log(req.body);
  if (!req.body.primaryId) {
    return res.json({status:'error', msg:'No primary id provided. '});
  }

  models.Primary.find({
    where: {
      id: req.body.primaryId
    },
    // include: [
    //   { model: models.Dataset },
    // ]
  }).then(function(primary){
    //console.log('primary', primary);
    if (!primary) { return res.json({status:'error', msg: 'No primary found'}); }
    pg.connect(config.db.postgis.uri, function (err, client, done) {
      console.log(err);
      console.log(client.host);
      //res.send(req.body.primaryId);
      var uploadFile = config.root + '/files/tmp' + '/primary_'+req.body.primaryId + '.csv';
      console.log(uploadFile);

      var stream = client.query(copyTo('COPY "primary_' + req.body.primaryId + '" TO STDOUT'));
      var fileStream = fs.createWriteStream(uploadFile);
      stream.pipe(fileStream);
      fileStream.on('finish', function(){
        console.log('finish');
        done();


        models.File.create({
          filename: 'primary_' + req.body.primaryId + '.csv'
        }).then(function(file) {
          // copy file to permanent location
          var fileNewPath = config.root + '/files/d/' + file.shortid + '/' + file.filename;

          file.updateAttributes({
            url: '/d/' + file.shortid + '/' + file.filename
          }).then(function(some){
            console.log('ok', file.dataValues);
          }).catch(function(err) {
            console.log('err', err);
          });

          mv(uploadFile, fileNewPath, {mkdirp: true}, function(err) {
            if (err) {
              console.log('error moving file', err);
              return res.json({status: 'error', msg:err});
            } else {

              // update file status at primary
              primary.setFile(file).then(function(some){
                res.json({status: 'ok', file: file.dataValues});
              }).catch(function(err) {
                return res.json({status: 'error', msg:err});
              });
            }
          });
        }).catch(function(err){
          console.log('err', err);
          return res.json({status: 'error', msg:err});
        });
      }).on('error', function(err){
        console.log('error endstream');
        done();
        return res.json({status: 'error', msg:err});
      });

    });

  }).catch(function(err){
    console.log('err',err);
  })

};



function handleError(res,err) {
  console.log('File controller error: ', err);
  return res.json({
    status: 'error',
    msg: err
  });
}
