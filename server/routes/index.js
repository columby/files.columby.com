'use strict';

var fileCtrl = require('./../controllers/file.controller'),
    auth = require('./../controllers/auth.controller');

module.exports = function(app) {

  // route to a file
  app.get('/:type/:filename', fileCtrl.serve);
  // route to a derived file
  app.get('/:type/:style/:filename', fileCtrl.serve);

  // sign an s3 request
  //app.post('/sign', auth.ensureAuthenticated, filePerm.canUpload, fileCtrl.sign);
  // finish an uploaded file to s3
  //app.post('/finish', fileCtrl.finish);

  // convert a file or table
  //app.post('/convert', auth.validateRemoteHost, fileCtrl.convert);


  // Fallback for all other routes
  app.get('/*', function(req,res){
    return res.sendStatus(404);
  });
};
