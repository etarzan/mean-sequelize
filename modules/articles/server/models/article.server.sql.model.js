'use strict';

module.exports = function(sequelize, DataTypes) {

  var Article = sequelize.define('Article', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      content: DataTypes.TEXT
    },

    {
      associate: function(models) {
        Article.belongsTo(models.User);
      },

      // don't use camelcase for automatically added attributes but underscore style
      // so updatedAt will be updated_at
      underscored: true,

      tableName: "tb_article"
    }
  );

  return Article;
};
