export default (sequelize, DataTypes) => {
  const Seat = sequelize.define('Seat', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    hall_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'cinema_halls',
        key: 'id'
      }
    },
    row_name: {
      type: DataTypes.CHAR(1),
      allowNull: false
    },
    seat_number: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    seat_type: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    price_modifier: {
      type: DataTypes.DECIMAL(10, 2)
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'seats',
    timestamps: false
  });

  return Seat;
};
