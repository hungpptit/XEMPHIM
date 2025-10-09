module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Movie', {
    id: { type: DataTypes.INTEGER, primaryKey: true, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    poster_url: { type: DataTypes.STRING },
    backdrop_url: { type: DataTypes.STRING },
    trailer_url: { type: DataTypes.STRING },
    duration_minutes: { type: DataTypes.INTEGER },
    release_date: { type: DataTypes.DATEONLY },
    rating: { type: DataTypes.DECIMAL },
    director: { type: DataTypes.STRING },
    status: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE }
  }, {
    tableName: 'movies',
    timestamps: false
  });
};
