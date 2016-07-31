'use strict';

/**
 * Module dependencies
 */
var path = require('path'),
  mongoose = require('mongoose'),
  Article = require('../../../../config/lib/sequelize').Article,
  User = require('../../../../config/lib/sequelize').User,
  errorHandler = require(path.resolve('./modules/core/server/controllers/errors.server.controller'));

/**
 * Create an article
 */
exports.create = function(req, res) {
  // augment the article by adding the UserId
  console.log(JSON.stringify(req.body));
   req.body.UserId = req.user.id;
  // save and return and instance of article on the res object.
  Article.create(req.body).then(function(article) {
    if (!article) {
      return res.send('users/signup', {
        errors: new StandardError('Article could not be created')
      });
    } else {
      return res.jsonp(article);
    }
  }).catch(function(err) {
    return res.send('users/signup', {
      errors: err,
      status: 500
    });
  });
};


/**
 * Show the current article
 */
exports.read = function(req, res) {
  // convert mongoose document to JSON
  var article = req.article ? req.article.toJSON() : {};

  // Add a custom field to the Article, for determining if the current User is the "owner".
  // NOTE: This field is NOT persisted to the database, since it doesn't exist in the Article model.
//  article.isCurrentUserOwner = !!(req.user && article.user && article.user._id.toString() === req.user._id.toString());

  return res.json(article);
};

/**
 * Update an article
 */
exports.update = function(req, res) {
  var article = req.article;

  article.title = req.body.title;
  article.content = req.body.content;

  article.updateAttributes({
        title: req.body.title,
        content: req.body.content
    }).then(function(a){
        return res.jsonp(a);
    }).catch(function(err){
        return res.render('error', {
            error: err,
            status: 500
        });
    });
};

/**
 * Delete an article
 */
exports.delete = function(req, res) {
  var article = req.article;

  article.destroy().then(function(){
        return res.jsonp(article);
    }).catch(function(err){
        return res.render('error', {
            error: err,
            status: 500
        });
    });
};

/**
 * List of Articles
 */
exports.list = function(req, res) {
  Article.findAll(
    {
      include: [{
        model: User,
        attributes: ['id', 'username']
      }]
    }
  ).then(function(articles) {
    return res.jsonp(articles);
  }).catch(function(err) {
    return res.render('error', {
      error: err,
      status: 500
    });
  });
};

/**
 * Article middleware
 */
exports.articleByID = function(req, res, next, id) {
    Article.find({
                      where: {id: id},
                      include: [{model:User, attributes:['id', 'username']}]
                    })
            .then(function(article){
        if(!article) {
            return next(new Error('Failed to load article ' + id));
        } else {
            req.article = article;
            return next();
        }
    }).catch(function(err){
        return next(err);
    });
};
