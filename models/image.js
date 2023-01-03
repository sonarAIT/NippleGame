"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
    class Image extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            Image.hasOne(models.Nipple);
        }
    }
    Image.init(
        {
            path: {
                type: DataTypes.STRING,
                allowNull: false,
            },
        },
        {
            sequelize,
            modelName: "Image",
        }
    );
    return Image;
};
