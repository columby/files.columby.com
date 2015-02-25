'use strict';

var fileCtrl = require('./../controllers/file.controller'),
    auth = require('./../controllers/auth.controller');

module.exports = function(app) {

  app.route('/a/:shortid/:style/:file').get(fileCtrl.serveAsset);

  app.route('/d/:shortid/:file').get(fileCtrl.serveDatafile);

  app.post('/upload',
    // validate if user is logged in
    auth.validateUser,
    
    // add file slot in db and save
    fileCtrl.save
  );

  app.route('/*').get(function(req,res){
    return res.status(404).send('Columby files');
  });
};
