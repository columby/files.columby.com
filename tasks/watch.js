'use strict'

/**
 * Watch files, and do things when they changes.
 * Recompile scss if needed.
 * Reinject files
 */

var livereload = require('gulp-livereload')
var watch = require('gulp-watch')

module.exports = function () {
  livereload.listen({
    port: 35731
  })

  var coreFiles = [
    'server/**/*.js'
  ]

  watch(coreFiles, livereload.changed)
}
