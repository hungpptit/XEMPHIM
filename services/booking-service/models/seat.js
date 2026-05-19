export default (sequelize, DataTypes) => {
  const Seat = sequelize.define('Seat', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false
    },
    hall_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    row_name: {
      type: DataTypes.CHAR,
      allowNull: false
    },
    seat_number: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    seat_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    price_modifier: {
      type: DataTypes.DECIMAL
    }
  }, {
    tableName: 'seats',
    timestamps: false
  });

  return Seat;
};
