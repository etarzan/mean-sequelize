'use strict';

/**
 * Module dependencies
 */
var crypto = require('crypto'),
  generatePassword = require('generate-password'),
  owasp = require('owasp-password-strength-test');
//validation for checking if the password passes the owasp-password-strength-test
var owaspStrengthtest = function() {
  if (this.provider === 'local' && this.password /*&& this.isModified('password')*/ ) {
    var result = owasp.test(this.password);
    if (result.errors.length) {
      var error = result.errors.join(' ');
      this.invalidate('password', error);
    }
  }
};

module.exports = function(sequelize, DataTypes) {
  var User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      validate: {
        isUUID: 4
      }
    },
    firstName: {
      type: DataTypes.STRING,
      field: "first_name",
      allowNull: false,
      defaultValue: '',
      validate: {
        isAlpha: true,
        notEmpty: {
          msg: 'Please fill in your first name'
        }
      }
    },
    lastName: {
      type: DataTypes.STRING,
      field: "last_name",
      defaultValue: '',
      validate: {
        isAlpha: true,
        notEmpty: {
          msg: 'Please fill in your last name'
        }
      }
    },
    displayName: {
      type: DataTypes.STRING,
      field: "display_name",
      defaultValue: '',

    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Please fill in your email address'
        },
        isLowercase: {
          msg: 'Email address needs to be completely in the lowercase'
        },
        isEmail: {
          msg: 'Please enter a valid email address'
        }
      }
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Please enter a username to proceed'
        },
        isLowercase: {
          msg: 'username needs to be completely in the lowercase'
        },
      }
    },
    password: {
      type: DataTypes.STRING
    },
    salt: {
      type: DataTypes.STRING
    },
    profileImageURL: {
      type: DataTypes.STRING(1024),
      field: "profile_image_url",
      defaultValue: JSON.stringify('modules/users/client/img/profile/default.png')
    },
    provider: {
      type: DataTypes.STRING
    },
    providerData: {
      type: DataTypes.TEXT,
      field: "provider_data"
    },
    additionalProvidersData: {
      type: DataTypes.TEXT,
      field: "addl_provider_data"
    },
    roles: {
      type: DataTypes.ENUM,
      values: ['user', 'admin'],
      defaultValue: ['user']
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      field: "reset_password_token"
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      field: "reset_password_expires"
    }

  }, {
    //instance methods
    instanceMethods: {
      setSaltAndEncPass: function() {
        if (this.password) {
          this.salt = crypto.randomBytes(16).toString('base64');
          this.password = this.hashPassword(this.password);
        }
      },
      hashPassword: function(password) {
        if (this.salt && password) {
          return crypto.pbkdf2Sync(password, new Buffer(this.salt, 'base64'), 10000, 64).toString('base64');
        } else {
          return password;
        }
      },
      authenticate: function(password) {
        return this.password === this.hashPassword(password);
      },
    },
    //class methods
    classMethods: {
      /**
       * Find possible unique username
       */
      findUniqueUsername: function(username, suffix, callback) {
        var _this = this;
        var possibleUsername = username.toLowerCase() + (suffix || '');
        console.log("possibleUsername!!!"+possibleUsername);
        _this.findOne({
          where: {
            username: possibleUsername
          }
        }).then(function(user) {
          console.log("User !!!" + JSON.stringify(user));
          if (!user) {
            console.log("Internal possibleUsername:::::::"+possibleUsername);
            return callback(possibleUsername);
          } else {
            return _this.findUniqueUsername(username, (suffix || 0) + 1);
          }
        }).catch(function(err) {
          console.error("User Model:findUniqueUsername:"+err);
          return callback(null);
        });
      },



      /**
       * Generates a random passphrase that passes the owasp test
       * Returns a promise that resolves with the generated passphrase, or rejects with an error if something goes wrong.
       * NOTE: Passphrases are only tested against the required owasp strength tests, and not the optional tests.
       */
      generateRandomPassphrase: function() {
        return new Promise(function(resolve, reject) {
          var password = '';
          var repeatingCharacters = new RegExp('(.)\\1{2,}', 'g');

          // iterate until the we have a valid passphrase
          // NOTE: Should rarely iterate more than once, but we need this to ensure no repeating characters are present
          while (password.length < 20 || repeatingCharacters.test(password)) {
            // build the random password
            password = generatePassword.generate({
              length: Math.floor(Math.random() * (20)) + 20, // randomize length between 20 and 40 characters
              numbers: true,
              symbols: false,
              uppercase: true,
              excludeSimilarCharacters: true
            });

            // check if we need to remove any repeating characters
            password = password.replace(repeatingCharacters, '');
          }

          // Send the rejection back if the passphrase fails to pass the strength test
          if (owasp.test(password).errors.length) {
            reject(new Error('An unexpected problem occured while generating the random passphrase'));
          } else {
            // resolve with the validated passphrase
            resolve(password);
          }
        });
      },

    },
    //Custom Validations
    validate: {
      owaspTest: owaspStrengthtest,
    },

    //Indexes should be named
    indexes: [
      // unique indexes
      {
        name: "uq_email",
        unique: true,
        fields: ['email']
      }, {
        name: "uq_username",
        unique: true,
        fields: ['username']
      }
    ],
    //Model Hooks
    hooks: {},

    //associations
    associate: function(models) {
  //    User.hasMany(models.Article);
    },




    // don't use camelcase for automatically added attributes but underscore style
    // so updatedAt will be updated_at
    underscored: true,

    // define the table's name
    tableName: 'tb_user'

  });

  return User;
};
