// it works dont touch
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
  FaUsers,
  FaBuilding
} from 'react-icons/fa';
import styles from './MovieDetail.module.css';

const MovieDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rawShowtimes, setRawShowtimes] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [availableCinemas, setAvailableCinemas] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCinemaId, setSelectedCinemaId] = useState('');
  const [seatCounts, setSeatCounts] = useState({});
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
          // load real showtimes from backend
          try {
            const { moviesAPI } = await import('../../services/api');
            const response = await moviesAPI.getMovieShowtimes(id);
            console.log('API Response:', response); // Debug log
            // Handle both direct array and wrapped response
            const rows = response.data || response || [];
            console.log('Showtimes rows:', rows); // Debug log
            if (mounted) {
              setRawShowtimes(rows);

              // Extract unique cities and cinemas
              const citiesSet = new Set();
              const cinemasList = [];
              const cinemasSeen = new Set();

              rows.forEach(st => {
                if (st.CinemaHall?.Cinema) {
                  const c = st.CinemaHall.Cinema;
                  if (c.city) citiesSet.add(c.city);
                  if (!cinemasSeen.has(c.id)) {
                    cinemasSeen.add(c.id);
                    cinemasList.push({
                      id: c.id,
                      name: c.name,
                      address: c.address,
                      city: c.city
                    });
                  }
                }
              });

              setAvailableCities(Array.from(citiesSet));
              setAvailableCinemas(cinemasList);
            }
          } catch (e) {
            console.error('Failed to load showtimes from API', e);
            if (mounted) {
              setRawShowtimes([]);
            }
          }
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

  // Fetch seat availability counts for all loaded showtimes
  useEffect(() => {
    if (rawShowtimes.length === 0) return;
    
    let active = true;
    const fetchAllSeatCounts = async () => {
      try {
        const { bookingAPI } = await import('../../services/api');
        
        // Fetch in parallel for all showtimes
        const promises = rawShowtimes.map(async (st) => {
          try {
            const res = await bookingAPI.getSeatMap(st.id);
            const seatData = res.data || res;
            if (seatData && seatData.seatMap) {
              let total = 0;
              let available = 0;
              seatData.seatMap.forEach(r => {
                if (r.seats) {
                  r.seats.forEach(s => {
                    // Count only active seats
                    if (s.status !== 'inactive') {
                      total++;
                      if (s.status === 'available') {
                        available++;
                      }
                    }
                  });
                }
              });
              return { id: st.id, available, total };
            }
          } catch (err) {
            console.error(`Failed to fetch seat map for showtime ${st.id}`, err);
          }
          return { id: st.id, available: null, total: null };
        });

        const results = await Promise.all(promises);
        if (!active) return;

        const counts = {};
        results.forEach(res => {
          if (res.available !== null) {
            counts[res.id] = { available: res.available, total: res.total };
          }
        });
        setSeatCounts(counts);
      } catch (err) {
        console.error('Error fetching seat counts', err);
      }
    };

    fetchAllSeatCounts();
    return () => { active = false; };
  }, [rawShowtimes]);

  const filteredGroupedShowtimes = React.useMemo(() => {
    // 1. Filter rows
    const filteredRows = rawShowtimes.filter(st => {
      const cinema = st.CinemaHall?.Cinema;
      if (!cinema) return true; // Show fallback showtimes without cinema details just in case
      
      if (selectedCity && cinema.city !== selectedCity) {
        return false;
      }
      if (selectedCinemaId && cinema.id !== parseInt(selectedCinemaId, 10)) {
        return false;
      }
      return true;
    });

    // 2. Group by date
    const grouped = {};
    filteredRows.forEach(st => {
      const date = new Date(st.start_time).toISOString().slice(0,10);
      if (!grouped[date]) grouped[date] = { date, dateLabel: date === new Date().toISOString().slice(0,10) ? 'Hôm nay' : date, times: [] };
      
      const count = seatCounts[st.id];
      grouped[date].times.push({
        id: st.id,
        time: new Date(st.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cinema: st.CinemaHall?.Cinema
          ? `${st.CinemaHall.Cinema.name} - ${st.CinemaHall.name}`
          : `Rạp ${st.hall_id}`,
        address: st.CinemaHall?.Cinema?.address || '',
        availableSeats: count ? count.available : null,
        totalSeats: count ? count.total : null
      });
    });

    return Object.values(grouped);
  }, [rawShowtimes, selectedCity, selectedCinemaId, seatCounts]);

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

  const handleTimeSlotClick = (date, slot) => {
    // slot is expected to be { id, time, cinema, ... }
    console.log('Navigate to seat-selection', { movieId: id, showtime: slot });
    navigate(`/movies/${id}/seat-selection`, {
      state: { movie, showtime: { id: slot.id, date, time: slot.time, cinema: slot.cinema } }
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

            {/* Filter Section */}
            {rawShowtimes.length > 0 && (
              <div className={styles.filterSection}>
                <div className={styles.filterGroup}>
                  <label htmlFor="city-select">
                    <FaMapMarkerAlt style={{ color: 'var(--color-gold)' }} /> Thành Phố:
                  </label>
                  <select
                    id="city-select"
                    value={selectedCity}
                    onChange={(e) => {
                      setSelectedCity(e.target.value);
                      setSelectedCinemaId(''); // Reset cinema when city changes
                    }}
                    className={styles.filterSelect}
                  >
                    <option value="">Tất cả thành phố</option>
                    {availableCities.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.filterGroup}>
                  <label htmlFor="cinema-select">
                    <FaBuilding style={{ color: 'var(--color-gold)' }} /> Rạp Chiếu:
                  </label>
                  <select
                    id="cinema-select"
                    value={selectedCinemaId}
                    onChange={(e) => setSelectedCinemaId(e.target.value)}
                    className={styles.filterSelect}
                  >
                    <option value="">Tất cả rạp</option>
                    {availableCinemas
                      .filter(c => !selectedCity || c.city === selectedCity)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.address})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {filteredGroupedShowtimes.length === 0 ? (
              <div className={styles.noShowtimes}>
                Không có suất chiếu nào phù hợp với bộ lọc địa điểm đã chọn.
              </div>
            ) : (
              <div className={styles.showtimesGrid}>
                {filteredGroupedShowtimes.map((day, dayIndex) => (
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
                          onClick={() => (slot.availableSeats === null || slot.availableSeats > 0) && handleTimeSlotClick(day.date, slot)}
                          title={slot.address ? `Địa chỉ: ${slot.address}` : ''}
                        >
                          <div className={styles.showTime}>{slot.time}</div>
                          <div className={styles.cinemaInfo}>
                            <FaMapMarkerAlt style={{ marginRight: '5px' }} />
                            {slot.cinema}
                          </div>
                          <div className={styles.seatInfo}>
                            <FaUsers style={{ marginRight: '5px' }} />
                            {slot.availableSeats !== null
                              ? `${slot.availableSeats}/${slot.totalSeats} ghế trống`
                              : 'Đang tải số ghế...'
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default MovieDetail;