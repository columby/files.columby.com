'use strict';

var express = require('express'),
    controller = require('./../controllers/file.controller'),
    auth = require('./../controllers/auth.controller'),
    fs = require('fs'),
    router = express.Router();

module.exports = function(app) {

  app.route('/data/:id/:file').get(controller.serveFile);

  app.route('/*').get(function(req,res){
    return res.status(404).send('Not found');
  });
};
