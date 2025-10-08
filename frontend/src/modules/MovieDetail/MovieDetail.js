import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

  // Mock movie data
  const mockMovie = {
    id: 1,
    title: "Spider-Man: No Way Home",
    description: "Peter Parker phải đối mặt với những thách thức lớn nhất khi danh tính Spider-Man bị tiết lộ. Với sự giúp đỡ của Doctor Strange, Peter cố gắng xóa bỏ sự thật này khỏi ký ức mọi người, nhưng điều này đã mở ra cánh cửa đa vũ trụ, mang theo những mối đe dọa nguy hiểm hơn bao giờ hết.",
    poster: "https://images.unsplash.com/photo-1635805737707-575885ab0820?ixlib=rb-4.0.3&w=400",
    backdrop: "https://images.unsplash.com/photo-1489599185395-bef5ad3c77e1?ixlib=rb-4.0.3&w=1200",
    rating: 8.9,
    duration: 148,
    releaseYear: 2024,
    genres: ["Hành động", "Phiêu lưu", "Sci-Fi"],
    director: "Jon Watts",
    cast: ["Tom Holland", "Zendaya", "Benedict Cumberbatch"],
    trailerUrl: "https://www.youtube.com/embed/JfVOs4VSpmA",
    isAvailable: true
  };

  // Mock showtimes data
  const mockShowtimes = [
    {
      date: "2024-10-08",
      dateLabel: "Hôm nay",
      times: [
        { time: "09:00", cinema: "Rạp A", availableSeats: 45, totalSeats: 60 },
        { time: "12:30", cinema: "Rạp B", availableSeats: 32, totalSeats: 50 },
        { time: "15:45", cinema: "Rạp A", availableSeats: 18, totalSeats: 60 },
        { time: "19:00", cinema: "Rạp C", availableSeats: 55, totalSeats: 80 },
        { time: "22:15", cinema: "Rạp B", availableSeats: 0, totalSeats: 50 }
      ]
    },
    {
      date: "2024-10-09",
      dateLabel: "Ngày mai",
      times: [
        { time: "10:00", cinema: "Rạp A", availableSeats: 60, totalSeats: 60 },
        { time: "13:30", cinema: "Rạp B", availableSeats: 48, totalSeats: 50 },
        { time: "16:45", cinema: "Rạp C", availableSeats: 75, totalSeats: 80 },
        { time: "20:00", cinema: "Rạp A", availableSeats: 42, totalSeats: 60 }
      ]
    },
    {
      date: "2024-10-10",
      dateLabel: "Thứ 5",
      times: [
        { time: "11:00", cinema: "Rạp B", availableSeats: 50, totalSeats: 50 },
        { time: "14:30", cinema: "Rạp C", availableSeats: 68, totalSeats: 80 },
        { time: "18:00", cinema: "Rạp A", availableSeats: 35, totalSeats: 60 },
        { time: "21:30", cinema: "Rạp B", availableSeats: 40, totalSeats: 50 }
      ]
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setMovie(mockMovie);
      setShowtimes(mockShowtimes);
      setLoading(false);
    }, 1000);
  }, [id]);

  const handleTimeSlotClick = (date, time, cinema) => {
    navigate(`/movies/${id}/seat-selection`, {
      state: { movie, showtime: { date, time, cinema } }
    });
  };

  const handleTrailerPlay = () => {
    // Open trailer in modal or new window
    console.log('Play trailer');
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
      <section className={styles.trailerSection}>
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