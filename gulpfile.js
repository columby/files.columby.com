'use strict'

var gulp = require('gulp')

process.env.NODE_ENV = process.env.NODE_ENV || 'development'

gulp.task('default', ['serve'])
gulp.task('serve', ['watch'], require('./tasks/serve').nodemon)
gulp.task('watch', require('./tasks/watch'))
gulp.task('build', require('./tasks/build'))
gulp.task('bump', ['version'], require('./tasks/chore').bump)
gulp.task('version', require('./tasks/chore').version)
