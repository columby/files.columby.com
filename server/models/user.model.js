'use strict';


module.exports = function(sequelize, DataTypes) {

  /**
   *
   * Schema definition
   *
   */
  var User = sequelize.define('User',
    {
      shortid: {
        type: DataTypes.STRING,
        unique: true
      },
      email : {
        type      : DataTypes.STRING,
        allowNull : false,
        unique    : true,
        validate  : {
          isEmail: true
        }
      },
      verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      admin: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      drupal_uuid:{
        type: DataTypes.STRING
      },

      created_at:{
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
      }
    },{
      classMethods: {
        associate: function(models) {
          // Use a specific table for extra fields (role).
          User.hasMany(models.Account, {through: models.AccountsUsers});
        }
      }
    }
  );

  return User;
};
