export default (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER
    },
    showtime_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    booking_code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    total_price: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE
    }
  }, {
    tableName: 'bookings',
    timestamps: false
  });

  return Booking;
};
