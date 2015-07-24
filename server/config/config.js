'use strict';

var path = require('path');

module.exports = {

  root: path.normalize(__dirname + '/../..'),

  env: process.env.NODE_ENV || 'development',

  port: process.env.NODE_FILES_PORT || 8500,

  db:{
    cms: {
      uri: process.env.DATABASE_URL
    },
    postgis: {
      uri: process.env.DATABASE_POSTGIS_URL
    }
  },

  aws: {
    key: process.env.AWS_ACCESS_KEY_ID,
    secret: process.env.AWS_SECRET_ACCESS_KEY,
    bucket: process.env.AWS_S3_BUCKET_NAME,
    s3url: process.env.AWS_S3_ENDPOINT
  },

  jwt: {
    secret: process.env.JWT_SECRET
  },

  mandrill : {
    key: process.env.MANDRILL_API_KEY
  }
};