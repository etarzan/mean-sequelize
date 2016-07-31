'use strict';
/**
 * Module dependencies.
 */


var path = require('path');
var appRoot = require('app-root-path');
var Sequelize = require('sequelize');
var _ = require('lodash');
var config = require('../config');
var winston = require('./winston');
var db = {};


winston.info('Initializing Sequelize...');



var sequelize =  new Sequelize(config.db.sequelize);

// loop through all files in models directory ignoring hidden files and this file
config.files.server.sqlModels
  // import model files and save model names
  .forEach(function(modelPath) {
    var model = sequelize.import(path.resolve(appRoot + "/" + modelPath));
    db[model.name] = model;
  });

// invoke associations on each of the models
Object.keys(db).forEach(function(modelName) {
  if (db[modelName].options.hasOwnProperty('associate')) {
    db[modelName].options.associate(db)
  }
});

// Synchronizing any model changes with database.
// set FORCE_DB_SYNC=true in the environment, or the program parameters to drop the database,
//   and force model changes into it, if required;
// Caution: Do not set FORCE_DB_SYNC to true for every run to avoid losing data with restarts
sequelize
  .sync({
    force: config.db.sequelize.forceDbSync === 'true',
    logging: config.enableSequelizeLog === 'true' ? winston.verbose : false
  })
  .then(function() {
    winston.info("Database " + (config.db.sequelize.forceDbSync === 'true' ? "*DROPPED* and " : "") + "synchronized");
  }).catch(function(err) {
    winston.error("An error occurred: ", err);
  });

// assign the sequelize variables to the db object and returning the db.
module.exports = _.extend({
  sequelize: sequelize,
  Sequelize: Sequelize
}, db);
