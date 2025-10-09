module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Showtime', {
    id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    movie_id: { type: DataTypes.INTEGER, allowNull: false },
    hall_id: { type: DataTypes.INTEGER, allowNull: false },
    start_time: { type: DataTypes.DATE },
    end_time: { type: DataTypes.DATE },
    base_price: { type: DataTypes.DECIMAL }
  }, {
    tableName: 'showtimes',
    timestamps: false
  });
};
