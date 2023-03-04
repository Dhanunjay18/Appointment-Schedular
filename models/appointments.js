'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Appointments extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here      
      Appointments.belongsTo(models.Users, {
        foreignKey: "id",
      });
    }
  }
  Appointments.init({
    name: DataTypes.STRING,
    startTime: DataTypes.TIME,
    endTime: DataTypes.TIME,
    uid: DataTypes.INTEGER,
  }, {
    sequelize,
    modelName: 'Appointments',
  });
  return Appointments;
};