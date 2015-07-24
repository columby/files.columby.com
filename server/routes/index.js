'use strict';

var fileCtrl = require('./../controllers/file.controller'),
    auth = require('./../controllers/auth.controller');

module.exports = function(app) {

  // Route to a file
  app.get('/:type/:filename',
    fileCtrl.serve
  );

  // Route to a derived file
  app.get('/:type/:style/:filename',
    fileCtrl.serve
  );

  // Sign an s3 request
  // app.post('/sign',
  //   auth.ensureAuthenticated,
  //   filePerm.canUpload,
  //   fileCtrl.sign
  // );

  // Finish an uploaded file to s3
  // app.post('/finish',
  //   fileCtrl.finish
  // );

  // convert a file or table
  app.post('/convert',
    auth.validateRemoteHost,
    fileCtrl.convert);

  // Fallback for all other routes
  app.get('/*', function(req,res){
    return res.sendStatus(404);
  });
};
