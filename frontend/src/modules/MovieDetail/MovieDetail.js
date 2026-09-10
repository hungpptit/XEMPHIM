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
  const [cityFilterOpen, setCityFilterOpen] = useState(false);
  const [cinemaFilterOpen, setCinemaFilterOpen] = useState(false);
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
      const date = new Date(st.start_time).toISOString().slice(0, 10);
      if (!grouped[date]) grouped[date] = { date, dateLabel: date === new Date().toISOString().slice(0, 10) ? 'Hôm nay' : date, times: [] };

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
      <div className="min-h-screen bg-[#121316] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin"></div>
        <p className="font-['Playfair_Display'] tracking-widest text-[#f2ca50] uppercase text-sm">
          Đang tải chi tiết phim thượng hạng...
        </p>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#121316] flex flex-col items-center justify-center text-white px-4">
        <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#f2ca50] mb-4">Không tìm thấy phim</h2>
        <Link to="/" className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#08090C] font-bold text-sm uppercase">
          Về Trang Chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#121316] min-h-screen text-[#e3e2e6] pt-20 pb-24">
      {/* Movie Hero Showcase */}
      <section className="relative w-full overflow-hidden bg-[#0d0e11]">
        {/* Background image & lighting */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center opacity-30 transform scale-105"
          style={{ backgroundImage: `url(${movie.backdrop || movie.poster})` }}
        ></div>
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-[#121316] via-[#121316]/85 to-transparent"></div>
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-[#121316] via-[#12161F]/75 to-transparent"></div>

        <div className="relative z-10 max-w-[1360px] mx-auto px-4 md:px-8 pt-10 pb-16">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] uppercase tracking-wider mb-8">
            <Link to="/" className="hover:text-[#f2ca50] transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">home</span>
              Trang Chủ
            </Link>
            <span>/</span>
            <Link to="/#now-section" className="hover:text-[#f2ca50] transition-colors">
              Phim Đang Chiếu
            </Link>
            <span>/</span>
            <span className="text-[#f2ca50] font-bold">{movie.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Col: Poster & Quick Action */}
            <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-[#12161F] p-1.5 bg-gradient-to-b from-[#D4AF37] via-[rgba(212,175,55,0.2)] to-transparent">
                <div className="relative rounded-xl overflow-hidden aspect-[2/3] group">
                  <img 
                    src={movie.poster} 
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3 bg-[#08090C]/85 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg border border-[rgba(212,175,55,0.3)]">
                    <span className="w-2 h-2 rounded-full bg-[#F3C644] animate-pulse"></span>
                    <span className="font-mono text-[10px] font-bold text-[#F3C644] tracking-widest uppercase">
                      VIP PREMIÈRE
                    </span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-[#12161F] via-[#12161F]/80 to-transparent flex items-center justify-between">
                    <span className="text-xs text-[#f2ca50] font-semibold">IMAX 3D Laser • Dolby Atmos</span>
                    <span className="material-symbols-outlined text-[#f2ca50] text-[18px]">verified</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons below Poster */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleTrailerPlay}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#1b1b1f] hover:bg-[#252830] text-[#f2ca50] border border-[rgba(212,175,55,0.3)] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <span className="material-symbols-outlined text-[20px]">play_circle</span>
                  XEM TRAILER
                </button>
                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(window.location.href);
                      alert('Đã sao chép liên kết phim vào bộ nhớ tạm!');
                    }
                  }}
                  title="Chia sẻ phim"
                  className="w-12 h-12 rounded-xl bg-[#1b1b1f] hover:bg-[#252830] text-[#9CA3AF] hover:text-[#f2ca50] border border-[rgba(212,175,55,0.2)] flex items-center justify-center transition-all shadow-md"
                >
                  <span className="material-symbols-outlined text-[20px]">share</span>
                </button>
              </div>
            </div>

            {/* Right Col: Title, 4 Indicators, Synopsis */}
            <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#f2ca50]/10 text-[#f2ca50] font-mono text-xs uppercase tracking-widest font-semibold border border-[#f2ca50]/20">
                    {movie.genres?.join(' • ') || 'Hành Động • Khoa Học Viễn Tưởng'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-[#292a2d] text-[#d5c78e] font-mono text-xs uppercase">
                    2D • 3D • IMAX • GOLD CLASS
                  </span>
                </div>

                <h1 className="font-['Playfair_Display'] text-3xl sm:text-5xl text-white font-extrabold tracking-tight mt-1">
                  {movie.title}
                </h1>
                <p className="text-sm text-[#d5c78e] italic font-serif">
                  Phát hành: {movie.releaseYear || '2026'}
                </p>
              </div>

              {/* 4 Luxury Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#12161F]/90 backdrop-blur-md border border-[rgba(212,175,55,0.2)] shadow-xl">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider">Đánh Giá Thượng Khách</span>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#f2ca50] text-[22px]">hotel_class</span>
                    <span className="text-xl text-white font-bold">{movie.rating || '8.9'}</span>
                    <span className="text-xs text-[#9CA3AF]">/10</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#9CA3AF]">LƯỢT VOTE VIP</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider">Thời Lượng Chiếu</span>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#d5c78e] text-[22px]">schedule</span>
                    <span className="text-xl text-white font-bold">{movie.duration} Phút</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#9CA3AF]">CHUẨN BẢN GỐC</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider">Độ Tuổi Giới Hạn</span>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#FF8C00] text-[22px]">explicit</span>
                    <span className="text-xl text-[#F3C644] font-bold">T16</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#9CA3AF]">TRÊN 16 TUỔI</span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider">Âm Thanh & Ngôn Ngữ</span>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#f2ca50] text-[22px]">language</span>
                    <span className="text-sm text-white font-semibold">Phụ đề & Lồng tiếng</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#f2ca50]">TIÊU CHUẨN QUỐC TẾ</span>
                </div>
              </div>

              {/* Story Synopsis */}
              <div className="flex flex-col gap-3 bg-[#1b1b1f]/70 border border-[rgba(212,175,55,0.15)] p-6 rounded-2xl shadow-lg">
                <h2 className="font-['Playfair_Display'] text-lg text-[#f2ca50] flex items-center gap-2 uppercase tracking-wide">
                  <span className="material-symbols-outlined text-[20px]">auto_stories</span>
                  Cốt Truyện Điện Ảnh
                </h2>
                <p className="text-sm text-[#e3e2e6] leading-relaxed text-justify">
                  {movie.description}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 mt-1 bg-[#12161F]/60 p-4 rounded-xl border border-gray-800/80">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-[#9CA3AF] min-w-[80px] uppercase tracking-wider">Đạo Diễn:</span>
                    <span className="text-xs text-white font-semibold">{movie.director || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-[#9CA3AF] min-w-[80px] uppercase tracking-wider">Diễn Viên:</span>
                    <span className="text-xs text-white">{movie.actors || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trailer Video Section */}
      {movie.trailerUrl && (
        <section id="trailer" className="max-w-[1360px] mx-auto px-4 md:px-8 mt-12">
          <div className="flex items-center gap-3 pb-3 border-b border-[rgba(212,175,55,0.15)] mb-6">
            <span className="w-2.5 h-6 bg-[#D4AF37] rounded-full"></span>
            <h2 className="font-['Playfair_Display'] text-2xl font-bold text-white uppercase tracking-wide">
              Trailer Điện Ảnh
            </h2>
          </div>
          <div className="relative aspect-video max-w-4xl mx-auto rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.25)] shadow-2xl bg-black">
            <iframe
              className="w-full h-full"
              src={movie.trailerUrl}
              title={`${movie.title} Trailer`}
              allowFullScreen
            ></iframe>
          </div>
        </section>
      )}

      {/* Showtimes Section */}
      {movie.isAvailable && (
        <section id="showtimes" className="max-w-[1360px] mx-auto px-4 md:px-8 mt-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(212,175,55,0.15)] mb-8">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-7 bg-gradient-to-b from-[#D4AF37] to-[#B8860B] rounded-full"></span>
              <div>
                <h2 className="font-['Playfair_Display'] text-2xl font-bold text-white uppercase tracking-wider">
                  Lịch Chiếu & Suất Chiếu
                </h2>
                <p className="text-xs text-[#9CA3AF]">Chọn suất chiếu phù hợp để tiến hành chọn ghế VIP</p>
              </div>
            </div>

            {/* Filter Section by City and Cinema with Custom Rounded Dropdowns */}
            {rawShowtimes.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                {/* City Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setCityFilterOpen(!cityFilterOpen);
                      setCinemaFilterOpen(false);
                    }}
                    className="flex items-center gap-2 bg-[#1b1b1f] hover:bg-[#252830] px-3.5 py-1.5 rounded-xl border border-[rgba(212,175,55,0.25)] hover:border-[#D4AF37] transition-all cursor-pointer text-xs"
                  >
                    <span className="material-symbols-outlined text-[#f2ca50] text-[16px]">location_on</span>
                    <span className="text-[#e3e2e6] font-medium">{selectedCity || 'Tất cả thành phố'}</span>
                    <span className={`material-symbols-outlined text-[16px] text-[#9CA3AF] transition-transform duration-200 ${cityFilterOpen ? 'rotate-180 text-[#f2ca50]' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  {cityFilterOpen && (
                    <div className="absolute left-0 mt-2 w-48 bg-[#12161F]/95 backdrop-blur-xl border border-[rgba(212,175,55,0.25)] rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.7)] p-1.5 z-40">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCity('');
                          setSelectedCinemaId('');
                          setCityFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                          selectedCity === ''
                            ? 'bg-gradient-to-r from-[rgba(212,175,55,0.2)] to-transparent text-[#f2ca50] font-bold'
                            : 'text-gray-300 hover:bg-[#1b1b1f] hover:text-white'
                        }`}
                      >
                        <span>Tất cả thành phố</span>
                        {selectedCity === '' && (
                          <span className="material-symbols-outlined text-[#f2ca50] text-[16px]">check</span>
                        )}
                      </button>
                      {availableCities.map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => {
                            setSelectedCity(city);
                            setSelectedCinemaId('');
                            setCityFilterOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                            selectedCity === city
                              ? 'bg-gradient-to-r from-[rgba(212,175,55,0.2)] to-transparent text-[#f2ca50] font-bold'
                              : 'text-gray-300 hover:bg-[#1b1b1f] hover:text-white'
                          }`}
                        >
                          <span>{city}</span>
                          {selectedCity === city && (
                            <span className="material-symbols-outlined text-[#f2ca50] text-[16px]">check</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cinema Filter */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setCinemaFilterOpen(!cinemaFilterOpen);
                      setCityFilterOpen(false);
                    }}
                    className="flex items-center gap-2 bg-[#1b1b1f] hover:bg-[#252830] px-3.5 py-1.5 rounded-xl border border-[rgba(212,175,55,0.25)] hover:border-[#D4AF37] transition-all cursor-pointer text-xs"
                  >
                    <span className="material-symbols-outlined text-[#f2ca50] text-[16px]">theater_comedy</span>
                    <span className="text-[#e3e2e6] font-medium">
                      {availableCinemas.find(c => String(c.id) === String(selectedCinemaId))?.name || 'Tất cả cụm rạp'}
                    </span>
                    <span className={`material-symbols-outlined text-[16px] text-[#9CA3AF] transition-transform duration-200 ${cinemaFilterOpen ? 'rotate-180 text-[#f2ca50]' : ''}`}>
                      expand_more
                    </span>
                  </button>

                  {cinemaFilterOpen && (
                    <div className="absolute left-0 mt-2 w-56 bg-[#12161F]/95 backdrop-blur-xl border border-[rgba(212,175,55,0.25)] rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.7)] p-1.5 z-40 max-h-60 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCinemaId('');
                          setCinemaFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                          selectedCinemaId === ''
                            ? 'bg-gradient-to-r from-[rgba(212,175,55,0.2)] to-transparent text-[#f2ca50] font-bold'
                            : 'text-gray-300 hover:bg-[#1b1b1f] hover:text-white'
                        }`}
                      >
                        <span>Tất cả cụm rạp</span>
                        {selectedCinemaId === '' && (
                          <span className="material-symbols-outlined text-[#f2ca50] text-[16px]">check</span>
                        )}
                      </button>
                      {availableCinemas
                        .filter(c => !selectedCity || c.city === selectedCity)
                        .map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCinemaId(c.id);
                              setCinemaFilterOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                              String(selectedCinemaId) === String(c.id)
                                ? 'bg-gradient-to-r from-[rgba(212,175,55,0.2)] to-transparent text-[#f2ca50] font-bold'
                                : 'text-gray-300 hover:bg-[#1b1b1f] hover:text-white'
                            }`}
                          >
                            <span className="truncate">{c.name}</span>
                            {String(selectedCinemaId) === String(c.id) && (
                              <span className="material-symbols-outlined text-[#f2ca50] text-[16px]">check</span>
                            )}
                          </button>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {filteredGroupedShowtimes.length === 0 ? (
            <div className="p-8 text-center bg-[#12161F] rounded-2xl border border-[rgba(212,175,55,0.2)] text-[#9CA3AF] text-sm">
              {rawShowtimes.length === 0
                ? 'Hiện tại phim này chưa có suất chiếu. Vui lòng quay lại sau!'
                : 'Không có suất chiếu nào phù hợp với bộ lọc địa điểm đã chọn. Vui lòng thử chọn rạp hoặc thành phố khác.'}
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {filteredGroupedShowtimes.map((day, dayIndex) => (
                <div key={dayIndex} className="bg-[#12161F] p-6 rounded-2xl border border-[rgba(212,175,55,0.2)] shadow-xl">
                  {/* Date Header */}
                  <div className="flex items-center gap-2 pb-4 border-b border-gray-800 text-[#f2ca50] font-semibold text-sm mb-6">
                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                    <span className="font-['Playfair_Display'] tracking-wide">{day.dateLabel}</span>
                    <span className="text-[#9CA3AF] font-normal">({day.date})</span>
                  </div>

                  {/* Showtime Pills Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {day.times.map((slot, slotIndex) => {
                      const isUnavailable = slot.availableSeats === 0;
                      return (
                        <div
                          key={slotIndex}
                          onClick={() => !isUnavailable && handleTimeSlotClick(day.date, slot)}
                          className={`p-4 rounded-xl border transition-all duration-300 ${
                            isUnavailable 
                              ? 'bg-[#15181E] border-gray-800/60 opacity-50 cursor-not-allowed'
                              : 'bg-[#1b1b1f] border-[rgba(212,175,55,0.25)] hover:border-[#D4AF37] hover:bg-[#222735] hover:shadow-[0_4px_20px_rgba(212,175,55,0.2)] cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-['Playfair_Display'] text-xl font-bold text-[#f2ca50]">
                              {slot.time}
                            </span>
                            <span className="text-[10px] font-mono uppercase bg-[#08090C] text-[#F3C644] px-2 py-0.5 rounded border border-[#F3C644]/30">
                              VIP 2D
                            </span>
                          </div>

                          <div className="text-xs text-white font-medium truncate mb-1">
                            {slot.cinema}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] pt-2 border-t border-gray-800/80">
                            <span>
                              {slot.availableSeats !== null
                                ? `${slot.availableSeats}/${slot.totalSeats} ghế trống`
                                : 'Đang kiểm tra ghế...'}
                            </span>
                            <span className="text-[#D4AF37] font-semibold">Chọn ghế ➔</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default MovieDetail;