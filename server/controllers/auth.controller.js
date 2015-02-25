'use strict';

/**
 *
 * Dependencies
 *
 * @type {exports}
 */
var config = require('../config/environment/index'),
    jwt    = require('jwt-simple'),
    moment = require('moment'),
    models = require('../models/index');

exports.validateUser = function(req,res,next){
  if (!req.user) { req.user={}; }

  // Decode the token if present
  if (req.headers.authorization){
    console.log('Checking header.');
    var token = req.headers.authorization.split(' ')[1];
    var payload = jwt.decode(token, config.jwt.secret);
    // Check token expiration date
    if (payload.exp <= moment().unix()) {
      console.log('Token has expired');
    }
    // Attach user id to req
    if (!payload.sub) {
      res.send('No user found from token').end();
    }
    req.jwt = payload;
    console.log('user-id found ' + payload.sub);
    // validate User
    models.User.find(req.jwt.sub).then(function(user){
      if (!user){ res.send('No user found.').end(); }

      var u = user.dataValues;
      var a = [];

      // get accounts
      user.getAccounts().then(function(accounts){
        for (var i=0;i<accounts.length;i++){
          a.push(accounts[ i].dataValues.id);
        }
        req.user = u;
        req.user.accounts = a;

        next();

      }).catch(function(err){
        console.log('err', err);
        res.send(err);
      });
    }).catch(function(err){
      console.log('err', err);
      res.send(err);
    });
  } else {
    res.send('Unauthorized').end();
  }
}
