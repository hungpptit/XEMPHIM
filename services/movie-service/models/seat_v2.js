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
      allowNull: false,
      validate: {
        min: 1
      }
    },
    seat_type: {
      type: DataTypes.ENUM('Standard', 'VIP', 'Couple', 'Disabled', 'Premium'),
      defaultValue: 'Standard'
    },
    price_modifier: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: 'Giá = base_price + price_modifier. VD: VIP +50.000đ'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'seats',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        unique: true,
        fields: ['hall_id', 'row_name', 'seat_number']
      }
    ]
  });

  return Seat;
};
