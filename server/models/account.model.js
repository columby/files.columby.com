'use strict';


module.exports = function(sequelize, DataTypes) {

  /**
   *
   * Schema definition
   *
   */
  var Account = sequelize.define('Account',
    {
      uuid: {
        type: DataTypes.UUID
      },
      shortid: {
        type: DataTypes.STRING,
        unique: true
      },
      name: {
        type: DataTypes.STRING
      },
      slug: {
        type: DataTypes.STRING
      },
      description: {
        type: DataTypes.TEXT
      },
      primary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      created_at:{
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        allowNull: false
      }
    },{
      classMethods: {
        // Create associations to other models
        associate: function(models) {

          // Each account can have a reference to a File (image) as avatarImage
          // creates Account.avatar_id
          // A user can have multiple accounts with roles
          Account.hasMany(models.User, {
            through: models.AccountsUsers
          });
        }
      }
    }
  );

  return Account;
};
