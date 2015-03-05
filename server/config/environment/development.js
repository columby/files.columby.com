'use strict';

// Development specific configuration
// ==================================
module.exports = {

  port: process.env.NODE_FILES_PORT,

  db:{
    cms: {
      uri: process.env.DATABASE_URL
    },
    postgis: {
      uri: process.env.DATABASE_POSTGIS_URL
    }
  },

  jwt: {
    secret: process.env.JWT_SECRET
  },

  mandrill : {
    key: process.env.MANDRILL_API_KEY
  }
};
