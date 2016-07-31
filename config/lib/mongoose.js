'use strict';

/**
 * Module dependencies.
 */
var config = require('../config'),
  chalk = require('chalk'),
  path = require('path'),
  mongoose = require('mongoose');
var _ = require('lodash');


// Load the mongoose models
module.exports.loadModels = function(callback) {
  // Globbing model files
  config.files.server.mongooseModels.forEach(function(modelPath) {
    require(path.resolve(modelPath));
  });

  if (callback) callback();
};

// Initialize Mongoose
module.exports.connect = function(db,cb) {
  var _this = this;

  var mongo = mongoose.connect(config.db.mongo.uri, config.db.mongo.options, function(err) {
    // Log Error
    if (err) {
      console.error(chalk.red('Could not connect to MongoDB!'));
      console.log(err);
    } else {

    db['mongo']=mongo;
      // Call callback FN
      if (cb) cb(db);
    }
  });

};

module.exports.disconnect = function(cb) {
  mongoose.disconnect(function(err) {
    console.info(chalk.yellow('Disconnected from MongoDB.'));
    cb(err);
  });
};
