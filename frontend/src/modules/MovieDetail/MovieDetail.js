import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  FaClock, 
  FaCalendar, 
  FaStar, 
  FaPlay, 
  FaTicketAlt, 
  FaArrowLeft,
  FaMapMarkerAlt,
  FaUsers
} from 'react-icons/fa';
import styles from './MovieDetail.module.css';

const MovieDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { getMovie } = await import('../../services/movieService');
        const m = await getMovie(id);
        if (!mounted) return;
        if (m) {
          // movieService.getMovie returns a normalized movie object (mapped fields)
          setMovie(m);
          // showtimes still mocked for now until showtime API implemented
          setShowtimes([
            {
              date: new Date().toISOString().slice(0,10),
              dateLabel: 'Hôm nay',
              times: [
                { time: '10:00', cinema: 'Rạp A', availableSeats: 40, totalSeats: 60 },
                { time: '13:30', cinema: 'Rạp B', availableSeats: 28, totalSeats: 50 },
                { time: '19:00', cinema: 'Rạp C', availableSeats: 0, totalSeats: 80 }
              ]
            }
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [id]);

  // if navigation requested scrolling to trailer, do it after movie loads
  useEffect(() => {
    if (!loading && movie && location && location.state && location.state.scrollToTrailer) {
      try {
        const el = document.getElementById('trailer');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) {
        console.error('Failed to auto-scroll to trailer', err);
      }
    }
  }, [loading, movie, location]);

  const handleTimeSlotClick = (date, time, cinema) => {
    navigate(`/movies/${id}/seat-selection`, {
      state: { movie, showtime: { date, time, cinema } }
    });
  };

  const handleTrailerPlay = () => {
    // Scroll smoothly to the trailer section on the page
    try {
      const el = document.getElementById('trailer');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err) {
      console.error('Failed to scroll to trailer', err);
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <FaStar 
          key={i} 
          color={i < fullStars ? '#FFD700' : '#404040'}
        />
      );
    }
    return stars;
  };

  if (loading) {
    return (
      <div className={styles.movieDetail}>
        <div className="container">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div className="loading"></div>
            <p>Đang tải thông tin phim...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className={styles.movieDetail}>
        <div className="container">
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <h2>Không tìm thấy phim</h2>
            <Link to="/" className="btn">Về trang chủ</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.movieDetail}>
      <button 
        className={styles.backBtn}
        onClick={() => navigate(-1)}
      >
        <FaArrowLeft />
      </button>

      {/* Movie Hero Section */}
      <section 
        className={styles.movieHero}
        style={{ backgroundImage: `url(${movie.backdrop})` }}
      >
        <div className={styles.heroContent}>
          <div className={styles.movieInfo}>
            <img 
              src={movie.poster} 
              alt={movie.title}
              className={styles.moviePoster}
            />
            
            <div className={styles.movieDetails}>
              <h1 className={styles.movieTitle}>{movie.title}</h1>
              
              <div className={styles.movieMeta}>
                <div className={styles.metaItem}>
                  <FaClock className={styles.metaIcon} />
                  {movie.duration} phút
                </div>
                <div className={styles.metaItem}>
                  <FaCalendar className={styles.metaIcon} />
                  {movie.releaseYear}
                </div>
                <div className={styles.rating}>
                  <div className={styles.stars}>
                    {renderStars(movie.rating)}
                  </div>
                  {movie.rating}/10
                </div>
              </div>

              <p className={styles.movieDescription}>
                {movie.description}
              </p>

              <div className={styles.movieGenres}>
                {movie.genres.map((genre, index) => (
                  <span key={index} className={styles.genre}>
                    {genre}
                  </span>
                ))}
              </div>

              <div className={styles.movieActions}>
                {movie.isAvailable && (
                  <Link 
                    to="#showtimes"
                    className={`${styles.actionBtn} ${styles.bookBtn}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('showtimes').scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    <FaTicketAlt />
                    Đặt vé ngay
                  </Link>
                )}
                <button 
                  className={`${styles.actionBtn} ${styles.trailerBtn}`}
                  onClick={handleTrailerPlay}
                >
                  <FaPlay />
                  Xem trailer
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trailer Section */}
  <section id="trailer" className={styles.trailerSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>Trailer</h2>
          <div className={styles.trailerContainer}>
            <iframe
              className={styles.trailerVideo}
              src={movie.trailerUrl}
              title={`${movie.title} Trailer`}
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </section>

      {/* Showtimes Section */}
      {movie.isAvailable && (
        <section id="showtimes" className={styles.contentSection}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Lịch Chiếu</h2>
            
            <div className={styles.showtimesGrid}>
              {showtimes.map((day, dayIndex) => (
                <div key={dayIndex} className={styles.dateSection}>
                  <div className={styles.dateHeader}>
                    <FaCalendar />
                    {day.dateLabel} ({day.date})
                  </div>
                  
                  <div className={styles.timesGrid}>
                    {day.times.map((slot, slotIndex) => (
                      <div
                        key={slotIndex}
                        className={`${styles.timeSlot} ${slot.availableSeats === 0 ? styles.unavailable : ''}`}
                        onClick={() => slot.availableSeats > 0 && handleTimeSlotClick(day.date, slot.time, slot.cinema)}
                      >
                        <div className={styles.showTime}>{slot.time}</div>
                        <div className={styles.cinemaInfo}>
                          <FaMapMarkerAlt style={{ marginRight: '5px' }} />
                          {slot.cinema}
                        </div>
                        <div className={styles.seatInfo}>
                          <FaUsers style={{ marginRight: '5px' }} />
                          {slot.availableSeats > 0 
                            ? `${slot.availableSeats}/${slot.totalSeats} ghế trống`
                            : 'Hết vé'
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default MovieDetail;