export default (sequelize, DataTypes) => {
  const BookingSeat = sequelize.define('BookingSeat', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    seat_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL,
      allowNull: false
    }
  }, {
    tableName: 'booking_seats',
    timestamps: false
  });

  return BookingSeat;
};
