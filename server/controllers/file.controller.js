'use strict';

var models = require('../models/index'),
    config = require('../config/environment/index'),
    path = require('path'),
    multer = require('multer'),
    mv = require('mv');



// Serve a static asset
exports.serveAsset = function(req, res) {

  // create local path based on request
  var filepath = config.root + '/files/a/' + req.params.shortid + '/' + req.params.style + '/' + req.params.file;

  // Try serving the file
  res.download(filepath, req.params.file, function(err){
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


// Handle file upload by multer middleware
exports.multer =  multer({
  dest: config.root + '/files/tmp/',
  limits: {
    files: 5,
    fileSize: 1000 * 1000 * 1000
  },
  onFileUploadStart: function (file, req, res) {

    console.log('onfileuploadstart');
    console.log('file ', file);

    // add file to res.locals for other middleware processing.
    res.locals.file=file;

    // Check if user can add files to requested account
    var a = req.user.accounts;
    if (a.indexOf(parseInt(req.body.accountId)) === -1) {
      res.send('No access');
      return false;
    } else {
      // Check file size
      console.log('next');
    }
  },
  onFileUploadData: function (file, data, req, res) {
    console.log(data.length + ' of ' + file.fieldname + ' arrived')
  },
  onFileUploadComplete: function (file, req, res) {
    console.log(file.fieldname + ' uploaded to  ' + file.path)
  },
  onParseStart: function () {
    console.log('Form parsing started at: ', new Date())
  },
  onParseEnd: function (req, next) {
    console.log('Form parsing completed at: ', new Date());

    // usage example: custom body parse
    //req.body = require('qs').parse(req.body);

    // call the next middleware
    next();
  },
  onError: function (error, next) {
    console.log(error)
    next(error)
  },
  onFileSizeLimit: function (file) {
    console.log('Failed: ', file.originalname)
    //fs.unlink('./' + file.path) // delete the partially written file
  }
  // onFileUploadComplete: function(file, req, res) {
  //   console.log('Upload complete');
  // },

  // onParseEnd: function(req, next) {
  //   console.log('parse end.');
  //   next();
  // }

});


// Save entry in db and move file to the permanent folder
exports.save = function(req,res){
  console.log(req.body);
  console.log(req.files);
  console.log('saving file');

  // Create file db-slot
  var f = req.body;
  f.account_id = req.body.accountId;
  f.size = f.filesize;

  console.log(f);
  models.File.create(f).then(function(newFile) {
    console.log('newfile', newFile.dataValues);

    // copy file to permanent location
    var fileTmpPath = config.root + '/files/tmp/' + res.locals.file.name;
    console.log('New path: ' + fileTmpPath);

    var folder;
    if (f.type === 'datafile') {
      folder='d';
    } else {
      folder = 'a';
    }

    var fileNewPath = config.root + '/files/' + folder + '/' + newFile.shortid + '/' + newFile.filename;
    console.log('New path: ' + fileNewPath);
    // mv(fileTmpPath, fileNewPath, {mkdirp: true}, function(err) {
    //   if (err) {
    //     console.log('error moving file', err);
    //     return res.send({status: 'error', msg:err});
    //   } else {
    //     res.send({status: 'ok', file:newFile.dataValues});
    //   }
    // });
  }).catch(function(err){
    console.log('err', err);
    res.send('end').end();
  });
}
