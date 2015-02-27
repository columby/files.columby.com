'use strict';

var models = require('../models/index'),
    config = require('../config/environment/index'),
    path = require('path'),
    mv = require('mv'),
    formidable = require('formidable');



// Serve a static asset
exports.serveAsset = function(req, res) {

  // create local path based on request
  var filepath = config.root + '/files/a/' + req.params.shortid + '/' + req.params.file;

  // Check for style


  // Create file derivative if not existing



  // Try serving the file
  res.sendFile(filepath function(err){
    if (err) {
      // Handle error, but keep in mind the response may be partially-sent, so check res.headersSent
      if (err.status === 404){
        // Try creating a derivative


        res.status(404).send('Not found at ' + new Date());
      }
    } else {
      console.log('Served file ' + req.params.file + ' at ' + new Date());
      // decrement a download credit, etc.
    }
  });
}


/**
 *
 * Serve a downloadable file
 *
 **/
exports.serveDatafile = function(req, res) {

  var filepath = config.root + '/files/d/' + req.params.shortid + '/' + req.params.file;
  console.log('filepath', filepath);
  res.download(filepath, req.params.file, function(err){
    if (err) {
      // Handle error, but keep in mind the response may be partially-sent
      // so check res.headersSent
      if (err.status === 404){
        res.status(404).send('File not found.');
      } else {
        res.send({status: 'error', msg:'File not found.' + err.status});
      }
    } else {
      // console.log('Served file ' + req.params.file + ' at ' + new Date());
      // decrement a download credit, etc.
    }
  });
};


// Save entry in db and move file to the permanent folder
exports.save = function(req,res){
  console.log('save');

  var form = new formidable.IncomingForm();
  form.uploadDir = config.root + '/files/tmp';
  form.encoding = 'utf-8';
  form.keepExtensions = true;
  form.type = 'multipart';
  form.on('progress', function(bytesReceived, bytesExpected) {
    console.log('progress', bytesReceived, bytesExpected);
  });
  form.on('fileBegin', function(name, file) {
    console.log('begin');
  });
  form.on('file', function(name, file) {
    //console.log('file', name, file);
  });
  form.on('error', function(err) {
    console.log('error', err);
  });
  form.on('aborted', function() {
    console.log('aborted');
  });
  form.on('end', function() {
    console.log('end');
  });

  form.parse(req, function(err, fields, files) {
    console.log('err', err);
    console.log('fields', fields);
    //console.log(files);

    // Create file db-slot

    fields.account_id = fields.accountId;
    fields.size = fields.filesize;

    console.log('new fields', fields);
    models.File.create(fields).then(function(newFile) {
      console.log('newfile', newFile.dataValues);

      // copy file to permanent location
      var fileTmpPath = files.file.path;
      console.log('New path: ' + fileTmpPath);

      var folder;
      if (fields.type === 'datafile') {
        folder='d';
      } else {
        folder = 'a';
      }

      var fileNewPath = config.root + '/files/' + folder + '/' + newFile.shortid + '/' + newFile.filename;
      console.log('New path: ' + fileNewPath);
      mv(fileTmpPath, fileNewPath, {mkdirp: true}, function(err) {
        if (err) {
          console.log('error moving file', err);
          return res.send({status: 'error', msg:err});
        } else {
          res.send({status: 'ok', file:newFile.dataValues});
        }
      });
    }).catch(function(err){
      console.log('err', err);
      res.send('end').end();
    });
  });
}
