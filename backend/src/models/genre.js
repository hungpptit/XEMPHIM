module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Genre', {
    id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false }
  }, {
    tableName: 'genres',
    timestamps: false
  });
};
