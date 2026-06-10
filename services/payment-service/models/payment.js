export default (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    booking_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: false
    },
    payment_code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    qr_url: {
      type: DataTypes.STRING
    },
    expire_at: {
      type: DataTypes.STRING
    },
    status: {
      type: DataTypes.STRING
    },
    transaction_ref: {
      type: DataTypes.STRING
    },
    response_code: {
      type: DataTypes.STRING
    },
    secure_hash: {
      type: DataTypes.STRING
    },
    created_at: {
      type: DataTypes.STRING
    },
    updated_at: {
      type: DataTypes.STRING
    }
  }, {
    tableName: 'Payments',
    timestamps: false
  });

  return Payment;
};
