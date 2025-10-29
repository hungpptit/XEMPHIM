export default (sequelize, DataTypes) => {
  const Booking = sequelize.define('Booking', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER
    },
    showtime_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    booking_code: {
      type: DataTypes.STRING(100),
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
    expire_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE
    },

    // 🔹 Các cột mới để lưu mã QR
    qr_token: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Mã token bảo mật để xác thực QR'
    },
    qr_data: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Nội dung JSON dùng để sinh QR'
    },
    checked_in: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Đánh dấu vé đã được quét check-in'
    }
  }, {
    tableName: 'bookings',
    timestamps: false
  });

  return Booking;
};
