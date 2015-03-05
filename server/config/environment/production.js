'use strict';

// Production specific configuration
// =================================
module.exports = {
  // Server IP
  ip:       process.env.OPENSHIFT_NODEJS_IP ||
            process.env.IP ||
            undefined,

  // Server port
  port:     process.env.NODE_FILES_PORT,

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

  mandrill: {
    key: process.env.MANDRILL_API_KEY
  }
};
