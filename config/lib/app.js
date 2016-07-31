'use strict';

/**'use strict';

/**
 * Module dependencies.
 */
var config = require('../config'),
  mongoose = require('./mongoose'),
  //Initializing the db with sequelize
  db = require('./sequelize'),
  express = require('./express'),
  chalk = require('chalk'),
  seed = require('./seed');

function seedDB() {
  if (config.seedDB && config.seedDB.seed) {
    console.log(chalk.bold.red('Warning:  Database seeding is turned on'));
    seed.start();
  }
}

// Initialize Models
mongoose.loadModels(seedDB);

/*the following method is not being used in the stack
It is present in case there is a synchronized db init required*/
module.exports.loadModels = function loadModels() {
  mongoose.loadModels();
};

module.exports.init = function init(callback) {
  mongoose.connect(db, function(db) {
    // Initialize express
    var app = express.init(db.mongo);
    if (callback) callback(app, db, config);
  });
};

module.exports.start = function start(callback) {
  var _this = this;

  _this.init(function(app, db, config) {

    // Start the app by listening on <port> at <host>
    app.listen(config.port, config.host, function() {
      // Create server URL
      var server = (process.env.NODE_ENV === 'secure' ? 'https://' : 'http://') + config.host + ':' + config.port;
      // Logging initialization
      console.log('--');
      console.log(chalk.green(config.app.title));
      console.log();
      console.log(chalk.green('Environment:     ' + process.env.NODE_ENV));
      console.log(chalk.green('Server:          ' + server));
      console.log(chalk.green('Mongo Database:        ' + config.db.mongo.uri));
      console.log(chalk.green('MySQL Database:        ' + config.db.sequelize.host +
        ":" + config.db.sequelize.port +
        "/" + config.db.sequelize.database));
      console.log(chalk.green('App version:     ' + config.meanjs.version));
      if (config.meanjs['meanjs-version'])
        console.log(chalk.green('MEAN.JS version: ' + config.meanjs['meanjs-version']));
      console.log('--');

      //The callback has not been used but is being retained to
      //prevent chains from being broken in calling files
      if (callback) callback(app, db, config);
    });

  });

};
