module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Payment', {
    id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    booking_id: { type: DataTypes.INTEGER, allowNull: false },
    payment_method: { type: DataTypes.STRING, allowNull: false },
    payment_code: { type: DataTypes.STRING, allowNull: false },
    amount: { type: DataTypes.DECIMAL, allowNull: false },
    qr_url: { type: DataTypes.STRING },
    expire_at: { type: DataTypes.DATE },
    status: { type: DataTypes.STRING },
    transaction_ref: { type: DataTypes.STRING },
    response_code: { type: DataTypes.STRING },
    secure_hash: { type: DataTypes.STRING },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  }, {
    tableName: 'Payments',
    timestamps: false
  });
};
