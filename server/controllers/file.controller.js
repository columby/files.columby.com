'use strict';

/**
 *
 *  Module dependencies
 *
 */
var _ = require('lodash'),
    models = require('../models/index'),
    config = require('../config/environment/index'),
    fs = require('fs'),
    gm = require('gm').subClass({ imageMagick: true }),
    request = require('request')
;


/** ------ FUNCTIONS ------------------------------------------------------- **/
function getImage(file, callback) {
  var localFile = fs.createWriteStream(config.root + '/server/tmp/' + file.id);

  localFile.on('open', function() {
    console.log('Fetching file: ', file.url);
    request(file.url).pipe(localFile).on('close', function(){
      console.log('localfile', localFile);
      callback(null, localFile);
    }).on('error', function(err){
      console.log('error', err);
      callback(err, null);
    });
  });
}

function createDerivative(file, callback) {
  console.log('Creating a new derivative for: ', file);
  console.log('Getting image');
  // Get remote image and store it locally
  getImage(file, function (err, tmpFile) {
    if (err) {
      callback('Could not fetch image.', null);
    }

    if (!err && tmpFile) {
      console.log('image fetched at ' + tmpFile.path);

      // Create a writestream for the derived image
      var u = config.root + '/server/tmp/' + file.id + '_' + file.style.name;
      console.log('Creating writestream: ' + u);

      var writeStream = fs.createWriteStream(u);

      writeStream.on('open', function(){

        gm(config.root + '/server/tmp/' + file.id)
          .options({imageMagick: true})
          .resize(file.style.width)
          .stream(function (err, stdout, stderr) {
            stdout.pipe(writeStream).on('error', function (err) {
              console.log(err);
              callback(err, null);
            }).on('close', function () {
              // Delete the tmp source file
              fs.unlink(config.root + '/server/tmp/'+file.id);
              console.log('Local derivative created. ');
              file.source = u;
              uploadImage(file, callback);
            });
          });
      }).on('error', function(err){
        console.log('error', err);
        callback(err, null);
      });
    }
  });
}



/* ------ ROUTES ---------------------------------------------------------- */

exports.serveAsset = function(req,res){
  console.log(req.params);

  var path = __dirname + '/files/' + req.params.id + '/' + req.params.filename;

  res.download(path);
}

// Get a single file
exports.serveFile = function(req, res) {
  console.log('File requested with id: ', req.params.id);
  console.log('File requested with style: ', req.query.style);

  // models.File.find(req.params.id).then(function (file) {
  //   if (!file || !file.id){
  //     return handleError(res, 'The requested image was not found.');
  //   }
  //   // TODO: make this work with https
  //   var s3Endpoint = config.aws.endpoint.replace('https://','http://');
  //   // Check for request params
  //   if (req.query.style){
  //     var style = req.query.style;
  //     var availableStyles = {
  //       xlarge : { width:1200 },
  //       large  : { width:800 },
  //       medium : { width:400 },
  //       small  : { width:200 },
  //       avatar : { width:80 }
  //     };
  //
  //     if (!availableStyles[ req.query.style]){
  //       return handleError(res, 'Requested style was not found. ');
  //     }
  //
  //     var width = availableStyles[ req.query.style].width;
  //
  //     s3Endpoint += 'styles/' + file.account_id + '/' + style + '/' + file.filename;
  //
  //   } else {
  //     s3Endpoint += 'accounts/' + file.account_id + '/images/' + file.filename;
  //   }
  //   console.log('Endpoint for file ' + file.id + ': ' + s3Endpoint);
  //   // Stream the file to the user
  //   var r = request(s3Endpoint);
  //   r.on('response', function (response) {
  //     console.log('responseCode: ', response.statusCode);
  //     if ( (req.query.style) && (response.statusCode === 403 || response.statusCode === 404) ){
  //       file = file.dataValues;
  //       file.style= {
  //         name: style,
  //         width: width
  //       };
  //       file.url = config.aws.endpoint.replace('https://','http://') + 'accounts/' + file.account_id + '/images/' + file.filename;
  //       console.log('Image style not found, creating a new derivative. ', file.url, file.style);
  //       createDerivative(file, function(err, derivative){
  //         if (err) { res.status(404).send(err); } else {
  //           var r2 = request(s3Endpoint);
  //           r2.on('response', function (response) {
  //             console.log('responseCode: ', response.statusCode);
  //             if (response.statusCode === 200) {
  //               r2.pipe(res);
  //             } else {
  //
  //               handleError(res,response.statusCode);
  //             }
  //           });
  //           r2.on('error', function(err){
  //             handleError(res,err);
  //           })
  //         }
  //       });
  //     } else {
  //       r.pipe(res);
  //     }
  //   })
  // });
};





function handleError(res, err) {
  console.log('Error: ', err);
  return res.send(500, err);
}
