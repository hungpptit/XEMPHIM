module.exports = (sequelize, DataTypes) => {
  return sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    full_name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING, allowNull: false },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    phone_number: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE }
  }, {
    tableName: 'users',
    timestamps: false
  });
};
