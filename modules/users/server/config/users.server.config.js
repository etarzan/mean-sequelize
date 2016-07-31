'use strict';

/**
 * Module dependencies
 */
var passport = require('passport'),
  path = require('path'),
  User = require(path.resolve('./config/lib/sequelize')).User,
  config = require(path.resolve('./config/config'));

/**
 * Module init function
 */
module.exports = function (app, db) {
  // Serialize sessions
  passport.serializeUser(function (user, done) {
    done(null, user.id);
  });

  // Deserialize sessions
  passport.deserializeUser(function (id, done) {
    User.findOne({
      where:{id: id}
  }).then(function (user) {
      delete user.salt;
      delete user.password;
      done(null, user);
  }).catch(function(err) {
      done(err);
  });
});


  // Initialize strategies
  config.utils.getGlobbedPaths(path.join(__dirname, './strategies/**/*.js')).forEach(function (strategy) {
    require(path.resolve(strategy))(config);
  });

  // Add passport's middleware
  app.use(passport.initialize());
  app.use(passport.session());
};
