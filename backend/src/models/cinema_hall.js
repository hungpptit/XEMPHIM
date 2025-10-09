module.exports = (sequelize, DataTypes) => {
  return sequelize.define('CinemaHall', {
    id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    cinema_name: { type: DataTypes.STRING },
    total_seats: { type: DataTypes.INTEGER }
  }, {
    tableName: 'cinema_halls',
    timestamps: false
  });
};
