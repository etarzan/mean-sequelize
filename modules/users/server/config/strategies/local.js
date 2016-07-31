'use strict';

/**
 * Module dependencies
 */
var passport = require('passport'),
  LocalStrategy = require('passport-local').Strategy,
  path = require('path'),
  User = require(path.resolve('./config/lib/sequelize')).User;

module.exports = function() {
  // Use local strategy
  passport.use(new LocalStrategy({
      usernameField: 'username',
      passwordField: 'password'
    },
    function(username, password, done) {
      User.findOne({
        where: {
          username: username.toLowerCase()
        }
      }).then(function(user) {
        if (!user || !user.authenticate(password)) {
          return done(null, false, {
            message: 'Invalid username or password'
          });
        } else {
          return done(null, user);
        }
      });




    }));
};
