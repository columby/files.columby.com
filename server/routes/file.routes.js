'use strict';

var express = require('express'),
    controller = require('./../controllers/file.controller'),
    auth = require('./../controllers/auth.controller'),
    router = express.Router();


module.exports = function(app) {

  router.get('/assets/:id/:filename', controller.serveAsset);

  router.get('/:id/:file', controller.serveFile);

  app.use('/', router);
};
