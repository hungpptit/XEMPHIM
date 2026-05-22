export default (sequelize, DataTypes) => {
  const Movie = sequelize.define('Movie', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    poster_url: {
      type: DataTypes.STRING
    },
    age_rating: {
      type: DataTypes.STRING(50)
    }
  }, {
    tableName: 'movies',
    timestamps: false
  });

  return Movie;
};
