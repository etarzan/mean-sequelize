'use strict';

/**
 * Module dependencies
 */
var path = require('path'),
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller')),
  mongoose = require('mongoose'),
  passport = require('passport'),
  User = require(path.resolve('./config/lib/sequelize')).User;

// URLs for which user can't be redirected on signin
var noReturnUrls = [
  '/authentication/signin',
  '/authentication/signup'
];

/**
 * Signup
 */
exports.signup = function(req, res) {
  // For security measures we remove the roles from the req.body object
  delete req.body.roles;

  // Init user and add missing fields
  var user = User.build(req.body);
  user.provider = 'local';
  user.displayName = user.firstName + ' ' + user.lastName;
  //generates salt and assigns the hashed password in the user object via instance method
  user.setSaltAndEncPass();
  // Then save the user
  user.save().then(function(user) {
    // Remove sensitive data before login
    delete user.password;
    delete user.salt;

    req.login(user, function(err) {
      if (err) {
        res.status(400).send(err);
      } else {
        res.json(user);
      }
    });
  }).catch(function(err) {
    return res.status(400).send({
      message: errorHandler.getErrorMessage(err)
    });
  });
};

/**
 * Signin after passport authentication
 */
exports.signin = function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err || !user) {
      res.status(400).send(info);
    } else {
      // Remove sensitive data before login
      user.password = undefined;
      user.salt = undefined;
      user.roles = [user.roles];
      req.login(user, function(err) {
        if (err) {
          res.status(400).send(err);
        } else {
          res.json(user);
        }
      });
    }
  })(req, res, next);
};

/**
 * Signout
 */
exports.signout = function(req, res) {
  req.logout();
  res.redirect('/');
};

/**
 * OAuth provider call
 */
exports.oauthCall = function(strategy, scope) {
  return function(req, res, next) {
    // Set redirection path on session.
    // Do not redirect to a signin or signup page
    if (noReturnUrls.indexOf(req.query.redirect_to) === -1) {
      req.session.redirect_to = req.query.redirect_to;
    }
    // Authenticate
    passport.authenticate(strategy, scope)(req, res, next);
  };
};

/**
 * OAuth callback
 */
exports.oauthCallback = function(strategy) {
  return function(req, res, next) {
    // Pop redirect URL from session
    var sessionRedirectURL = req.session.redirect_to;
    delete req.session.redirect_to;

    passport.authenticate(strategy, function(err, user, info) {
      if (err) {
        return res.redirect('/authentication/signin?err=' + encodeURIComponent(errorHandler.getErrorMessage(err)));
      }
      if (!user) {
        return res.redirect('/authentication/signin');
      }
      req.login(user, function(err) {
        if (err) {
          return res.redirect('/authentication/signin');
        }

        return res.redirect(sessionRedirectURL || redirectURL || '/');
      });
    })(req, res, next);
  };
};

/**
 * Helper function to save or update a OAuth user profile
 */
exports.saveOAuthUserProfile = function(req, providerUserProfile, done) {
  //Will be using this variable to convert additional providers to
  //and from JSON arays and strings as these are stored as strings in sql
  var addlProvider4Storage = {};

  if (!req.user) {
    // Define a search query fields
    var searchMainProviderIdentifierField = 'providerData.' + providerUserProfile.providerIdentifierField;
    var searchAdditionalProviderIdentifierField = 'additionalProvidersData.' + providerUserProfile.provider + '.' + providerUserProfile.providerIdentifierField;
    // Define main provider search query
    var mainProviderSearchQuery = {};
    mainProviderSearchQuery.provider = providerUserProfile.provider;
    mainProviderSearchQuery[searchMainProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

    // Define additional provider search query
    var additionalProviderSearchQuery = {};
    additionalProviderSearchQuery[searchAdditionalProviderIdentifierField] = providerUserProfile.providerData[providerUserProfile.providerIdentifierField];

    // Define a search query to find existing user with current provider profile
    var searchQuery = {
      $or: [{
        provider: providerUserProfile.provider
      }, {
        email: providerUserProfile.email
      }]
    };
    User
      .findOne({
        where: searchQuery
      })
      .then(function(user) {
        if (!user) {
          var possibleUsername = providerUserProfile.username || ((providerUserProfile.email) ? providerUserProfile.email.split('@')[0] : '');

          User.findUniqueUsername(possibleUsername, null, function(availableUsername) {

            if (availableUsername) {
              var newUser = User.build();
              newUser.roles = ['user'];
              newUser.firstName = providerUserProfile.firstName;
              newUser.lastName = providerUserProfile.lastName;
              newUser.username = availableUsername;
              newUser.displayName = providerUserProfile.displayName;
              newUser.email = providerUserProfile.email;
              newUser.profileImageURL = providerUserProfile.profileImageURL;
              newUser.provider = providerUserProfile.provider;
              newUser.providerData = JSON.stringify(providerUserProfile.providerData);

            //  addlProvider4Storage[providerUserProfile.provider] = providerUserProfile.providerData;
            //  newUser.additionalProvidersData = JSON.stringify(addlProvider4Storage);
              // Then save the user
              newUser.save()
                .then(function(user) {
                  return done(null, user);
                })
                .catch(function(e) {
                  return done(e, null);
                });

            } else {
              return done("No availableUsername", null);
            }
          });

        } else {
          done(null, user);
          return null;
        }
        return null;
      })
      .catch(function(err) {
        done(err);
        return null;
      });

  } else {
    // User is already logged in, join the provider data to the existing user
    var user = req.user;
    addlProvider4Storage = JSON.parse(user.additionalProvidersData);
    // Check if user exists, is not signed in using this provider, and doesn't have that provider data already configured
    if (user.provider !== providerUserProfile.provider &&
      (!user.additionalProvidersData ||
        !addlProvider4Storage[providerUserProfile.provider])) {

      // Add the provider data to the additional provider data field
      if (!user.additionalProvidersData) {
        addlProvider4Storage = {};
        user.additionalProvidersData = JSON.stringify(addlProvider4Storage);
      }
      addlProvider4Storage[providerUserProfile.provider] = providerUserProfile.providerData;
      user.additionalProvidersData = JSON.stringify(addlProvider4Storage);

      // And save the user
      user
        .save()
        .then(function() {
          done(null, user, '/settings/accounts');
          return null;
        })
        .catch(function(err) {
          done(err);
          return null;
        });
    } else {
      done(new Error('User is already connected using this provider'), user);
    }
  }
};


/**
 * Remove OAuth provider
 */
exports.removeOAuthProvider = function(req, res, next) {
  var user = req.user;
  var provider = req.query.provider;

  if (!user) {
    return res.status(401).json({
      message: 'User is not authenticated'
    });
  } else if (!provider) {
    return res.status(400).send();
  }

  // Delete the additional provider
  if (user.additionalProvidersData) {
    var tempAdditionalDataProvider = JSON.parse(user.additionalProvidersData);
    delete tempAdditionalDataProvider[provider];
    user.additionalProvidersData = JSON.stringify(tempAdditionalDataProvider);
  }

  user.save().then(function(user) {
    req.login(user, function(err) {
      if (err) {
        res.status(400).send(err);
      } else {
        res.json(user);
      }
    });
  }).catch(function(err) {
    return res.status(400).send({
      message: errorHandler.getErrorMessage(err)
    });
  });

};
