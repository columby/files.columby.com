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
exports.serve = function(req, res) {
  console.log('Serve file ' + req.path);
  /**
   /assets/filename.png
   /datasets/filename.csv
   /uploads/document.pdf
   /uploads/image.png
   /uploads/small/image.png

  **/

  var availableStyles = ['thumbnail', 'small', 'medium', 'large', 'xlarge'];
  var params = req.params;
  var type = params.type;
  var filename = params.filename;
  var style = params.style;
  var filepath = req.path;
  var s3url = '/' + config.env + '/files/' + filepath;

  // Try to get the file
  s3client.getFile(s3url, function(err,s3res) {
    if (err){ return handleError(res,err); }
    if (s3res.statusCode===403) { return sendStatus(s3.statusCode); }

    // Not found or no access
    if (s3res.statusCode === 404) {
      // Check if a derivative needs to be created.
      if ( ((params.type==='assets') || (params.type==='uploads')) &&
        // Check if the requested style is available
        (availableStyles.indexOf(params.style) !== -1) ) {
        // Create the desired style
        var url = '/files/' + type + '/' + filename;
        createDerivative({
          type: type,
          filename: filename,
          style: style
        }, function(result,err){
          if (err || !result){ return handleError(res,err); }
          s3client.getFile(s3url, function(err,s3res){
            if (err){ return handleError(res,err); }
            if ( (s3res.statusCode===403) || (s3res.statusCode===403)) {
              return sendStatus(s3res.statusCode);
            } else if (s3res.statusCode === 200) {
              s3res.pipe(res);
            }
          });
        });
      } else {
        console.log(filepath + ' not found ');
        return res.sendStatus(s3res.statusCode);
      }
    } else if (s3res.statusCode === 200) {
      response.pipe(res);
      response.on('error', function(err){
        return handleError(res,err);
      });
    };
  });
}


//
exports.sign = function(req,res){
  var request = req.body;
  var filename = request.filename
  var filesize = request.filesize
  var filetype = request.filetype
  request.meta = request.meta || {};

  // assume all upload checks are done in previous middleware

  var path = '/files/uploads/' + filename;

  var media = {
    type: filetype,
    path: path,
    filename: filename,
    status: false,
    user_id: req.user.id,
    title: request.meta.title,
    description: request.meta.description,
    meta: JSON.stringify({
      license: request.meta.license,
      source: request.meta.source,
    })
  };
  console.log(media);
  // create file object
  Media.create(media).then(function(result){

    var expiration = moment().add(15, 'm').toDate(); //15 minutes
    var readType = 'private';

    var s3Policy = {
      'expiration': expiration,
      'conditions': [{ 'bucket': config.aws.bucket },
      ['starts-with', '$key', config.node_env + path],
      { 'acl': readType },
      { 'success_action_status': '201' },
      ['starts-with', '$Content-Type', request.filetype],
      ['content-length-range', 2048, request.filesize], //min and max
    ]};

    var stringPolicy = JSON.stringify(s3Policy);
    var base64Policy = new Buffer(stringPolicy, 'utf-8').toString('base64');

    // sign policy
    var signature = crypto.createHmac('sha1', config.aws.secret)
        .update(new Buffer(base64Policy, 'utf-8')).digest('base64');

    var credentials = {
      url: config.aws.s3Url,
      fields: {
        key: config.node_env + path,
        AWSAccessKeyId: config.aws.key,
        acl: readType,
        policy: base64Policy,
        signature: signature,
        'Content-Type': request.filetype,
        success_action_status: 201
      }
    };
    return res.json({media: result, credentials:credentials});
  }).catch(function(err){
    return handleError(res,err);
  });
}


//
exports.finish = function(req,res){
  Media.update({
    status: true
  },{
    where: {
      id: req.body.id
    }
  }).then(function(result){
    console.log('finish upload result: ', result);
    return res.json(result);
  }).catch(function(err){
    return res.json({status:'err', msg:err});
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


function createDerivative(params, callback) {
  var url = '/' + config.env + '/files/' + params.type + '/' + params.filename;
  console.log('Trying to create derivative from ' + url);
  // Try to create a derivative
  // Create a temporary local file for download
  var tmpPath = path.join(__dirname, '../tmp/' + params.filename);
  console.log('Local path: ' + tmpPath);
  var file = fs.createWriteStream(tmpPath);
  s3client.getFile(url, function(err, res) {
    // Handle error or not found
    if (err){ return callback(null,err); }
    if (res.statusCode === 404){ return callback(null, 'Original file not found'); }
    // Handle success
    if (res.statusCode === 200) {
      console.log('Original file found, downloading');
      // save s3 file to local tmp location
      res.pipe(file);
      // handle save error
      res.on('error', function(err){
        return callback(null, 'Error downloading original file from S3. ');
      });
      // handle save finished
      res.on('end', function(){
        console.log('S3 original file downloaded to local.')
        // Create local derivative
        var w=1600;
        switch(style){
          case 'thumbnail': w=80; break;
          case 'small': w=400; break;
          case 'medium': w=800; break;
          case 'large': w=1200; break;
          case 'xlarge': w=1600; break;
          default: return callback(null,'Not a valid style: ' + style);
        }

        var resizedFilePath = path.join(__dirname, '../tmp/resized/' + filename);
        console.log('Creating derivative ' + style + ' from ' + tmpPath + ' at ' + resizedFilePath);
        gm(tmpPath).resize(w).write(resizedFilePath, function(err) {
          if (err) { return callback(null, err); }
          // Get filesize
          fs.stat(resizedFilePath, function(err,stats){
            if (err) { return callback(null,err); }
            // Send file to S3
            console.log('Sending derived file to S3 from: ' + resizedFilePath);
            s3client.putFile(resizedFilePath, '/files/' + params.type + '/' + params.style + '/' + params.filename, function(err, res) {
              if (err) { return callback(null,err); }
              console.log('Upload complete, status: ' + res.statusCode);
              callback(res);
            });
          });
        });
      });
    }
  });
}


function handleError(res,err) {
  console.log('File controller error: ', err);
  return res.json({
    status: 'error',
    msg: err
  });
}
