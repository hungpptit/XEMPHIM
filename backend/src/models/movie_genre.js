export default (sequelize, DataTypes) => {
  const MovieGenre = sequelize.define('MovieGenre', {
    movie_id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    },
    genre_id: {
      type: DataTypes.INTEGER,
      primaryKey: true
    }
  }, {
    tableName: 'movie_genres',
    timestamps: false
  });

  return MovieGenre;
};
