export default (sequelize, DataTypes) => {
  const CinemaHall = sequelize.define('CinemaHall', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    total_seats: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    cinema_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cinemas',
        key: 'id'
      }
    }
  }, {
    tableName: 'cinema_halls',
    timestamps: false
  });

  return CinemaHall;
};
