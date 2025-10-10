import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlay, FaStar, FaClock, FaCalendar } from 'react-icons/fa';
import styles from './MovieCard.module.css';

const MovieCard = ({ movie }) => {
  const navigate = useNavigate();

  const handleBookTicket = (e) => {
    e.stopPropagation();
    navigate(`/movies/${movie.id}/showtimes`);
  };

  const handleViewDetail = (e) => {
    e.stopPropagation();
    navigate(`/movies/${movie.id}`);
  };

  const handleCardClick = () => {
    navigate(`/movies/${movie.id}`);
  };

  const handleTrailerPlay = (e) => {
    e.stopPropagation();
    // Navigate to movie detail and request scrolling to trailer
    navigate(`/movies/${movie.id}`, { state: { scrollToTrailer: true } });
  };

  return (
    <div 
      className={`${styles.movieCard} ${!movie.isAvailable ? styles.disabled : ''}`}
      onClick={handleCardClick}
    >
      <div className={styles.posterContainer}>
        <img 
          src={movie.poster || '/api/placeholder/300/400'} 
          alt={movie.title}
          className={styles.poster}
        />
        
        <div className={styles.overlay}>
          <button className={styles.playButton} onClick={handleTrailerPlay}>
            <FaPlay className={styles.playIcon} />
          </button>
        </div>

        <div className={styles.rating}>
          <FaStar />
          {movie.rating || '8.5'}
        </div>

        <div className={styles.genre}>
          {movie.genre || 'Hành động'}
        </div>

        {!movie.isAvailable && (
          <div className={styles.comingSoon}>
            Sắp chiếu
          </div>
        )}
      </div>

      <div className={styles.content}>
        <h3 className={styles.title}>{movie.title}</h3>
        
        <div className={styles.info}>
          <div className={styles.duration}>
            <FaClock />
            {movie.duration || '120'} phút
          </div>
          <div className={styles.releaseYear}>
            <FaCalendar />
            {movie.releaseYear || '2024'}
          </div>
        </div>

        <p className={styles.description}>
          {movie.description || 'Một bộ phim hành động ly kỳ với những pha hành động nghẹt thở và cốt truyện hấp dẫn.'}
        </p>

        <div className={styles.actions}>
          {movie.isAvailable ? (
            <>
              <button className={styles.bookBtn} onClick={handleBookTicket}>
                Đặt vé
              </button>
              <button className={styles.detailBtn} onClick={handleViewDetail}>
                Chi tiết
              </button>
            </>
          ) : (
            <button className={styles.detailBtn} onClick={handleViewDetail}>
              Xem chi tiết
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieCard;