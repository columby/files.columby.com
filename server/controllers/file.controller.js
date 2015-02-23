'use strict';

var models = require('../models/index'),
    config = require('../config/environment/index'),
    path = require('path');


exports.serveFile = function(req, res) {

  var filepath = path.join(__dirname, '../files/data/' + req.params.id + '/' + req.params.file);

  res.download(filepath, req.params.file, function(err){
    if (err) {
      // Handle error, but keep in mind the response may be partially-sent
      // so check res.headersSent
      if (err.status === 404){
        res.status(404).send('Not found at ' + new Date());
      }
    } else {
      console.log('Served file ' + req.params.file + ' at ' + new Date());
      // decrement a download credit, etc.
    }
  });
};
