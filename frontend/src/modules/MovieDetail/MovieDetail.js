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

  // Mock movies data - sẽ dựa vào ID để lấy đúng phim
  const mockMovies = [
    {
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
    },
    {
      id: 2,
      title: "Avatar: The Way of Water",
      description: "Jake Sully và gia đình phải đối mặt với những thách thức mới trên hành tinh Pandora. Họ phải rời bỏ ngôi nhà để khám phá các vùng đất mới của Pandora và bảo vệ gia đình khỏi những mối đe dọa từ con người trở lại.",
      poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?ixlib=rb-4.0.3&w=400",
      backdrop: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&w=1200",
      rating: 9.2,
      duration: 192,
      releaseYear: 2024,
      genres: ["Sci-Fi", "Phiêu lưu", "Fantasy"],
      director: "James Cameron",
      cast: ["Sam Worthington", "Zoe Saldana", "Sigourney Weaver"],
      trailerUrl: "https://www.youtube.com/embed/d9MyW72ELq0",
      isAvailable: true
    },
    {
      id: 3,
      title: "Top Gun: Maverick",
      description: "Pete 'Maverick' Mitchell trở lại với vai trò phi công huấn luyện cho thế hệ mới. Anh phải đối mặt với quá khứ và một nhiệm vụ đòi hỏi sự hy sinh tối thượng từ những người được chọn để bay.",
      poster: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&w=400",
      backdrop: "https://images.unsplash.com/photo-1540979388789-6cee28a1cdc9?ixlib=rb-4.0.3&w=1200",
      rating: 8.7,
      duration: 130,
      releaseYear: 2024,
      genres: ["Hành động", "Chính kịch", "Phiêu lưu"],
      director: "Joseph Kosinski",
      cast: ["Tom Cruise", "Miles Teller", "Jennifer Connelly"],
      trailerUrl: "https://www.youtube.com/embed/qSqVVswa420",
      isAvailable: true
    },
    {
      id: 4,
      title: "Black Panther: Wakanda Forever",
      description: "Wakanda phải bảo vệ quốc gia của mình trước những thế lực thù địch mới khi họ đang đối mặt với nỗi đau mất mát. Nữ hoàng Ramonda, Shuri và những người bảo vệ Wakanda chiến đấu để bảo vệ dân tộc của họ.",
      poster: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&w=400",
      backdrop: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?ixlib=rb-4.0.3&w=1200",
      rating: 8.5,
      duration: 161,
      releaseYear: 2024,
      genres: ["Hành động", "Sci-Fi", "Chính kịch"],
      director: "Ryan Coogler",
      cast: ["Letitia Wright", "Angela Bassett", "Lupita Nyong'o"],
      trailerUrl: "https://www.youtube.com/embed/_Z3QKkl1WyM",
      isAvailable: false
    },
    {
      id: 5,
      title: "Doctor Strange in the Multiverse of Madness",
      description: "Stephen Strange khám phá những thực tại khác nhau trong đa vũ trụ với sự giúp đỡ của các đồng minh thần bí cả cũ và mới, đi qua những thực tại thay đổi tâm trí và nguy hiểm của đa vũ trụ.",
      poster: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?ixlib=rb-4.0.3&w=400",
      backdrop: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?ixlib=rb-4.0.3&w=1200",
      rating: 8.3,
      duration: 126,
      releaseYear: 2024,
      genres: ["Fantasy", "Hành động", "Phiêu lưu"],
      director: "Sam Raimi",
      cast: ["Benedict Cumberbatch", "Elizabeth Olsen", "Chiwetel Ejiofor"],
      trailerUrl: "https://www.youtube.com/embed/aWzlQ2N6qqg",
      isAvailable: true
    },
    {
      id: 6,
      title: "The Batman",
      description: "Bruce Wayne trong những năm đầu làm Batman đối mặt với tội phạm tại Gotham City. Khi một kẻ giết người nhắm vào các quan chức thành phố, Batman phải khám phá những mối liên hệ đen tối của thành phố.",
      poster: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?ixlib=rb-4.0.3&w=400",
      backdrop: "https://images.unsplash.com/photo-1551913902-c92207136625?ixlib=rb-4.0.3&w=1200",
      rating: 8.8,
      duration: 176,
      releaseYear: 2024,
      genres: ["Hành động", "Tội phạm", "Chính kịch"],
      director: "Matt Reeves",
      cast: ["Robert Pattinson", "Zoë Kravitz", "Paul Dano"],
      trailerUrl: "https://www.youtube.com/embed/mqqft2x_Aa4",
      isAvailable: false
    }
  ];

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
      // Tìm phim dựa theo ID từ URL
      const foundMovie = mockMovies.find(m => m.id === parseInt(id));
      
      if (foundMovie) {
        setMovie(foundMovie);
        // Tạo showtimes cho phim này
        setShowtimes(mockShowtimes);
      }
      
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