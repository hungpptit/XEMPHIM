import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaPlay, FaTicketAlt, FaShieldAlt, FaMobile } from 'react-icons/fa';
import MovieCard from '../../components/MovieCard';
import { listMovies } from '../../services/movieService';
import authService from '../../services/authService';
import styles from './Home.module.css';

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const PAGE_SIZE = 10;
  const [nowPage, setNowPage] = useState(1);
  const [comingPage, setComingPage] = useState(1);
  const [nowSort, setNowSort] = useState('default');
  const [comingSort, setComingSort] = useState('default');
  const [nowSortOpen, setNowSortOpen] = useState(false);
  const [comingSortOpen, setComingSortOpen] = useState(false);

  const sortOptions = [
    { value: 'default', label: 'Mặc định' },
    { value: 'rating', label: 'Đánh giá cao nhất ⭐' },
    { value: 'newest', label: 'Mới nhất' },
    { value: 'oldest', label: 'Cũ nhất' }
  ];

  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const searchQuery = queryParams.get('search') || '';

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await listMovies();
        if (!mounted) return;
        setMovies(data);
      } catch (err) {
        console.error('Failed to load movies', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    
    const checkUser = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (mounted) setUser(currentUser);
      } catch (err) {
        console.error('Failed to check user', err);
      }
    };

    load();
    checkUser();

    const onAuth = async () => {
      const u = await authService.getCurrentUser();
      if (mounted) setUser(u);
    };
    window.addEventListener('authChanged', onAuth);

    return () => {
      mounted = false;
      window.removeEventListener('authChanged', onAuth);
    };
  }, []);

  const filteredMovies = searchQuery
    ? movies.filter(movie => movie.title && movie.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : movies;

  let nowShowingMovies = filteredMovies.filter(movie => movie.isAvailable);
  let comingSoonMovies = filteredMovies.filter(movie => !movie.isAvailable);

  // Apply sorting for Now Showing
  if (nowSort === 'rating') {
    nowShowingMovies = [...nowShowingMovies].sort((a, b) => b.rating - a.rating);
  } else if (nowSort === 'newest') {
    nowShowingMovies = [...nowShowingMovies].sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate) : new Date(0);
      const dateB = b.releaseDate ? new Date(b.releaseDate) : new Date(0);
      return dateB - dateA;
    });
  } else if (nowSort === 'oldest') {
    nowShowingMovies = [...nowShowingMovies].sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate) : new Date(8640000000000000);
      const dateB = b.releaseDate ? new Date(b.releaseDate) : new Date(8640000000000000);
      return dateA - dateB;
    });
  }

  // Apply sorting for Coming Soon
  if (comingSort === 'rating') {
    comingSoonMovies = [...comingSoonMovies].sort((a, b) => b.rating - a.rating);
  } else if (comingSort === 'newest') {
    comingSoonMovies = [...comingSoonMovies].sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate) : new Date(0);
      const dateB = b.releaseDate ? new Date(b.releaseDate) : new Date(0);
      return dateB - dateA;
    });
  } else if (comingSort === 'oldest') {
    comingSoonMovies = [...comingSoonMovies].sort((a, b) => {
      const dateA = a.releaseDate ? new Date(a.releaseDate) : new Date(8640000000000000);
      const dateB = b.releaseDate ? new Date(b.releaseDate) : new Date(8640000000000000);
      return dateA - dateB;
    });
  }

  // pagination calculations
  const nowTotalPages = Math.max(1, Math.ceil(nowShowingMovies.length / PAGE_SIZE));
  const comingTotalPages = Math.max(1, Math.ceil(comingSoonMovies.length / PAGE_SIZE));

  const nowPageClamped = Math.min(Math.max(1, nowPage), nowTotalPages);
  const comingPageClamped = Math.min(Math.max(1, comingPage), comingTotalPages);

  const nowSlice = nowShowingMovies.slice((nowPageClamped - 1) * PAGE_SIZE, nowPageClamped * PAGE_SIZE);
  const comingSlice = comingSoonMovies.slice((comingPageClamped - 1) * PAGE_SIZE, comingPageClamped * PAGE_SIZE);

  const scrollToElem = (id) => {
    try {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      // ignore
    }
  };

  const goToNowPage = (p) => {
    setNowPage(p);
    // scroll to the now showing section so user stays in context
    setTimeout(() => scrollToElem('now-section'), 50);
  };

  const goToComingPage = (p) => {
    setComingPage(p);
    setTimeout(() => scrollToElem('coming-section'), 50);
  };

  // Dynamic Featured Movies for the Auto-sliding Promotional Banner Carousel
  const featuredMovies = movies.length > 0
    ? (movies.filter(m => m.isAvailable && (m.backdrop || m.poster)).length >= 2
        ? movies.filter(m => m.isAvailable && (m.backdrop || m.poster)).slice(0, 6)
        : movies.slice(0, 6))
    : [];

  const heroMovies = featuredMovies.length > 0 ? featuredMovies : [
    {
      id: 1,
      title: 'AVATAR: LỬA VÀ TRO TÀN',
      description: 'Trải nghiệm điện ảnh đỉnh cao chuẩn phòng chiếu thượng hạng với công nghệ IMAX Laser 3D và âm thanh vòm Dolby Atmos.',
      rating: 8.9,
      duration: 192,
      genre: 'Khoa Học Viễn Tưởng',
      backdrop: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80'
    }
  ];

  const [currentHeroIndex, setCurrentHeroIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);

  // Auto slide every 5.5 seconds (pauses on hover)
  useEffect(() => {
    if (heroMovies.length <= 1 || isHeroHovered) return;
    const timer = setInterval(() => {
      setCurrentHeroIndex(prev => (prev + 1) % heroMovies.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [heroMovies.length, isHeroHovered]);

  const prevHero = () => {
    setCurrentHeroIndex(prev => (prev === 0 ? heroMovies.length - 1 : prev - 1));
  };

  const nextHero = () => {
    setCurrentHeroIndex(prev => (prev + 1) % heroMovies.length);
  };

  const safeHeroIndex = currentHeroIndex >= heroMovies.length ? 0 : currentHeroIndex;
  const currentHeroMovie = heroMovies[safeHeroIndex];

  const getSlideBadge = (movie, index) => {
    const badges = [
      { text: 'PREMIÈRE EXCLUSIVE', icon: '👑', tagColor: 'bg-[#F3C644]/15 border-[#F3C644]/40 text-[#F3C644]', highlight: 'PHIM BOM TẤN ĐỈNH CAO' },
      { text: 'PHIM ĐANG CỰC HOT', icon: '🔥', tagColor: 'bg-red-500/15 border-red-500/40 text-red-400', highlight: 'XU HƯỚNG BÁN CHẠY NHẤT' },
      { text: 'ĐÁNH GIÁ CAO NHẤT', icon: '⭐', tagColor: 'bg-amber-500/15 border-amber-500/40 text-[#f5d061]', highlight: 'TUYỆT PHẨM ĐIỆN ẢNH' },
      { text: 'SUẤT CHIẾU ĐẶC BIỆT', icon: '🎬', tagColor: 'bg-blue-500/15 border-blue-500/40 text-blue-400', highlight: 'TRẢI NGHIỆM IMAX 3D' },
      { text: 'KHÔNG THỂ BỎ LỠ', icon: '✨', tagColor: 'bg-purple-500/15 border-purple-500/40 text-purple-300', highlight: 'SIÊU PHẨM CHIẾU RẠP' }
    ];
    return badges[index % badges.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121316] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin"></div>
        <p className="font-['Playfair_Display'] tracking-widest text-[#f2ca50] uppercase text-sm">
          Đang tải danh sách phim...
        </p>
      </div>
    );
  }


  return (
    <div className="w-full bg-[#121316] min-h-screen text-[#e3e2e6] pb-24">
      {/* Cinematic Promotional Auto-Sliding Movie Banner Carousel */}
      <section 
        className="relative w-full overflow-hidden bg-[#0d0e11] select-none group"
        onMouseEnter={() => setIsHeroHovered(true)}
        onMouseLeave={() => setIsHeroHovered(false)}
      >
        <div className="relative min-h-[620px] lg:min-h-[740px] w-full flex items-end">
          {/* Layered Cross-Fading Movie Backdrops */}
          <div className="absolute inset-0 z-0">
            {heroMovies.map((movie, index) => {
              const isActive = index === safeHeroIndex;
              const bgImg = movie.backdrop || movie.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80';
              return (
                <div
                  key={movie.id || index}
                  className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                    isActive ? 'opacity-100 z-0' : 'opacity-0 pointer-events-none -z-10'
                  }`}
                >
                  <div
                    className={`w-full h-full bg-cover bg-center transition-transform duration-[7000ms] ease-out ${
                      isActive ? 'scale-105 opacity-80' : 'scale-100 opacity-0'
                    }`}
                    style={{ backgroundImage: `url(${bgImg})` }}
                  />
                </div>
              );
            })}
            <div className="absolute inset-0 bg-gradient-to-t from-[#121316] via-[#121316]/50 to-transparent pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0d0e11] via-[#0d0e11]/70 to-transparent pointer-events-none"></div>
            {/* Ambient Gold Glow Halo */}
            <div className="absolute bottom-16 left-1/4 w-96 h-96 rounded-full bg-[#f2ca50]/10 blur-[130px] pointer-events-none"></div>
          </div>

          {/* Navigation Controls: Prev / Next Buttons */}
          {heroMovies.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevHero}
                aria-label="Phim trước"
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#0d0e11]/75 hover:bg-[#D4AF37] text-white hover:text-[#0d0e11] border border-[rgba(212,175,55,0.35)] backdrop-blur-md flex items-center justify-center transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.6)] opacity-70 group-hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">chevron_left</span>
              </button>

              <button
                type="button"
                onClick={nextHero}
                aria-label="Phim tiếp theo"
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-[#0d0e11]/75 hover:bg-[#D4AF37] text-white hover:text-[#0d0e11] border border-[rgba(212,175,55,0.35)] backdrop-blur-md flex items-center justify-center transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.6)] opacity-70 group-hover:opacity-100 hover:scale-110 active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[24px]">chevron_right</span>
              </button>
            </>
          )}

          {/* Hero Cinematic Meta & CTA Stack */}
          <div className="relative z-10 max-w-[1360px] mx-auto w-full px-4 md:px-8 pt-36 pb-20 flex flex-col justify-end">
            <div 
              key={currentHeroMovie.id || safeHeroIndex} 
              className={`max-w-3xl flex flex-col gap-4 ${styles.heroSlideText || ''}`}
            >
              {/* Exclusive VIP Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-xs uppercase tracking-widest shadow-md border ${getSlideBadge(currentHeroMovie, safeHeroIndex).tagColor}`}>
                  <span>{getSlideBadge(currentHeroMovie, safeHeroIndex).icon}</span> {getSlideBadge(currentHeroMovie, safeHeroIndex).text}
                </span>
                <span className="bg-[#12161F]/85 backdrop-blur-md text-[#f2ca50] font-mono text-xs px-3 py-1 rounded-full uppercase tracking-wider border border-[rgba(212,175,55,0.3)]">
                  IMAX LASER 3D
                </span>
                <span className="bg-[#1b1b1f] text-[#9CA3AF] font-mono text-xs px-3 py-1 rounded-full uppercase tracking-wider">
                  DOLBY ATMOS
                </span>
              </div>

              {/* Movie Title & Info */}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[#f2ca50] tracking-[0.25em] uppercase font-bold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#f2ca50] inline-block animate-pulse"></span>
                  {getSlideBadge(currentHeroMovie, safeHeroIndex).highlight}
                </span>
                <h1 className="font-['Playfair_Display'] text-4xl sm:text-5xl lg:text-6xl text-white font-extrabold tracking-tight drop-shadow-2xl line-clamp-2">
                  {currentHeroMovie.title}
                </h1>
                <p className="text-sm sm:text-base text-[#d5c78e] italic font-light">
                  {currentHeroMovie.genre || 'Hành động, Phiêu lưu'} • {currentHeroMovie.duration || 120} phút • ⭐ {currentHeroMovie.rating || '8.5'}
                </p>
              </div>

              {/* Synopsis */}
              <p className="text-sm sm:text-base text-[#9CA3AF] line-clamp-3 leading-relaxed max-w-2xl">
                {currentHeroMovie.description || 'Đắm chìm vào không gian điện ảnh thượng hạng với công nghệ tối tân nhất. Trải nghiệm dịch vụ ghế VIP và thưởng thức âm thanh sống động.'}
              </p>

              {/* CTA Action Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-4">
                <Link
                  to={`/movies/${currentHeroMovie.id}/showtimes`}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5E6AB] to-[#B8860B] text-[#08090C] font-bold text-sm uppercase tracking-wider hover:brightness-110 shadow-[0_0_25px_rgba(212,175,55,0.45)] transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-98"
                >
                  <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                  ĐẶT VÉ NGAY
                </Link>

                <Link
                  to={`/movies/${currentHeroMovie.id}`}
                  className="px-6 py-3.5 rounded-xl bg-[#1b1b1f]/80 hover:bg-[#252830] text-white border border-[rgba(212,175,55,0.3)] font-semibold text-sm transition-all flex items-center gap-2 backdrop-blur-md hover:scale-[1.02] active:scale-98"
                >
                  <span className="material-symbols-outlined text-[20px] text-[#f2ca50]">info</span>
                  Chi Tiết Phim
                </Link>
              </div>
            </div>
          </div>

          {/* Bottom Pagination Indicators & Auto-Slide Status */}
          {heroMovies.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 z-20 flex items-center gap-3 bg-[#0d0e11]/80 px-4 py-2 rounded-full backdrop-blur-md border border-[rgba(212,175,55,0.25)] shadow-2xl">
              <div className="flex items-center gap-2">
                {heroMovies.map((m, idx) => (
                  <button
                    key={m.id || idx}
                    type="button"
                    onClick={() => setCurrentHeroIndex(idx)}
                    className={`transition-all duration-500 rounded-full h-2 ${
                      idx === safeHeroIndex
                        ? 'w-7 bg-gradient-to-r from-[#D4AF37] to-[#F5E6AB] shadow-[0_0_10px_rgba(212,175,55,0.8)]'
                        : 'w-2 bg-white/30 hover:bg-white/60'
                    }`}
                    title={m.title}
                    aria-label={`Chuyển tới phim ${idx + 1}`}
                  />
                ))}
              </div>
              <span className="text-xs font-mono text-[#d5c78e] pl-2 border-l border-white/20 select-none">
                0{safeHeroIndex + 1} / 0{heroMovies.length}
              </span>
              {isHeroHovered && (
                <span className="text-[10px] font-mono tracking-wider text-[#9CA3AF] flex items-center gap-1 pl-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-ping"></span>
                  Tạm dừng
                </span>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Main Container */}
      <div className="max-w-[1360px] mx-auto px-4 md:px-8 mt-12">
        {/* Search Results Notification Banner */}
        {searchQuery && (
          <div className="mb-8 p-5 bg-[#12161F] rounded-xl border-l-4 border-[#D4AF37] shadow-xl flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#f2ca50]">
                Kết quả tìm kiếm cho: "{searchQuery}"
              </h2>
              <p className="text-sm text-[#9CA3AF] mt-0.5">
                Tìm thấy {filteredMovies.length} bộ phim phù hợp với yêu cầu.
              </p>
            </div>
            <Link to="/" className="text-xs text-[#f2ca50] hover:underline uppercase tracking-wider font-semibold">
              Xóa bộ lọc
            </Link>
          </div>
        )}

        {/* Section 1: Now Showing */}
        <section id="now-section" className="mb-16">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(212,175,55,0.15)] mb-8">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-7 bg-gradient-to-b from-[#D4AF37] to-[#B8860B] rounded-full"></span>
              <div>
                <h2 className="font-['Playfair_Display'] text-2xl font-bold text-white uppercase tracking-wider">
                  Phim Đang Chiếu
                </h2>
                <p className="text-xs text-[#9CA3AF]">Các siêu phẩm điện ảnh đang có mặt tại hệ thống rạp</p>
              </div>
            </div>

            {/* Custom Rounded Sort Control */}
            <div className="relative self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setNowSortOpen(!nowSortOpen)}
                className="flex items-center gap-2 bg-[#1b1b1f] hover:bg-[#252830] px-3.5 py-1.5 rounded-xl border border-[rgba(212,175,55,0.25)] hover:border-[#D4AF37] transition-all cursor-pointer text-xs"
              >
                <span className="text-[#9CA3AF] uppercase">Sắp xếp:</span>
                <span className="text-[#f2ca50] font-semibold">
                  {sortOptions.find(o => o.value === nowSort)?.label || 'Mặc định'}
                </span>
                <span className={`material-symbols-outlined text-[16px] text-[#9CA3AF] transition-transform duration-200 ${nowSortOpen ? 'rotate-180 text-[#f2ca50]' : ''}`}>
                  expand_more
                </span>
              </button>

              {nowSortOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#12161F]/95 backdrop-blur-xl border border-[rgba(212,175,55,0.25)] rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.7)] p-1.5 z-40">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setNowSort(opt.value);
                        setNowPage(1);
                        setNowSortOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                        nowSort === opt.value
                          ? 'bg-gradient-to-r from-[rgba(212,175,55,0.2)] to-transparent text-[#f2ca50] font-bold'
                          : 'text-gray-300 hover:bg-[#1b1b1f] hover:text-white'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {nowSort === opt.value && (
                        <span className="material-symbols-outlined text-[#f2ca50] text-[16px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {nowSlice.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>

          {/* Pagination */}
          {nowTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button 
                disabled={nowPageClamped <= 1} 
                onClick={() => goToNowPage(nowPageClamped - 1)}
                className="px-4 py-2 rounded-lg bg-[#1b1b1f] border border-[rgba(212,175,55,0.2)] text-sm disabled:opacity-40 hover:border-[#D4AF37] transition-colors"
              >
                Trước
              </button>
              <span className="text-sm font-semibold text-[#f2ca50]">
                Trang {nowPageClamped} / {nowTotalPages}
              </span>
              <button 
                disabled={nowPageClamped >= nowTotalPages} 
                onClick={() => goToNowPage(nowPageClamped + 1)}
                className="px-4 py-2 rounded-lg bg-[#1b1b1f] border border-[rgba(212,175,55,0.2)] text-sm disabled:opacity-40 hover:border-[#D4AF37] transition-colors"
              >
                Sau
              </button>
            </div>
          )}
        </section>

        {/* Section 2: Coming Soon */}
        <section id="coming-section" className="mb-20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(212,175,55,0.15)] mb-8">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-7 bg-gradient-to-b from-[#F5E6AB] to-[#AA771C] rounded-full"></span>
              <div>
                <h2 className="font-['Playfair_Display'] text-2xl font-bold text-white uppercase tracking-wider">
                  Phim Sắp Chiếu
                </h2>
                <p className="text-xs text-[#9CA3AF]">Đón chờ những kiệt tác sắp cập bến phòng chiếu</p>
              </div>
            </div>

            {/* Custom Rounded Coming Sort Control */}
            <div className="relative self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setComingSortOpen(!comingSortOpen)}
                className="flex items-center gap-2 bg-[#1b1b1f] hover:bg-[#252830] px-3.5 py-1.5 rounded-xl border border-[rgba(212,175,55,0.25)] hover:border-[#D4AF37] transition-all cursor-pointer text-xs"
              >
                <span className="text-[#9CA3AF] uppercase">Sắp xếp:</span>
                <span className="text-[#f2ca50] font-semibold">
                  {sortOptions.find(o => o.value === comingSort)?.label || 'Mặc định'}
                </span>
                <span className={`material-symbols-outlined text-[16px] text-[#9CA3AF] transition-transform duration-200 ${comingSortOpen ? 'rotate-180 text-[#f2ca50]' : ''}`}>
                  expand_more
                </span>
              </button>

              {comingSortOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-[#12161F]/95 backdrop-blur-xl border border-[rgba(212,175,55,0.25)] rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.7)] p-1.5 z-40">
                  {sortOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setComingSort(opt.value);
                        setComingPage(1);
                        setComingSortOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                        comingSort === opt.value
                          ? 'bg-gradient-to-r from-[rgba(212,175,55,0.2)] to-transparent text-[#f2ca50] font-bold'
                          : 'text-gray-300 hover:bg-[#1b1b1f] hover:text-white'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {comingSort === opt.value && (
                        <span className="material-symbols-outlined text-[#f2ca50] text-[16px]">check</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {comingSlice.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>

          {comingTotalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button 
                disabled={comingPageClamped <= 1} 
                onClick={() => goToComingPage(comingPageClamped - 1)}
                className="px-4 py-2 rounded-lg bg-[#1b1b1f] border border-[rgba(212,175,55,0.2)] text-sm disabled:opacity-40 hover:border-[#D4AF37] transition-colors"
              >
                Trước
              </button>
              <span className="text-sm font-semibold text-[#f2ca50]">
                Trang {comingPageClamped} / {comingTotalPages}
              </span>
              <button 
                disabled={comingPageClamped >= comingTotalPages} 
                onClick={() => goToComingPage(comingPageClamped + 1)}
                className="px-4 py-2 rounded-lg bg-[#1b1b1f] border border-[rgba(212,175,55,0.2)] text-sm disabled:opacity-40 hover:border-[#D4AF37] transition-colors"
              >
                Sau
              </button>
            </div>
          )}
        </section>

        {/* Section 3: Luxury Royal Perks */}
        <section className="bg-gradient-to-br from-[#12161F] to-[#0d0e11] rounded-2xl p-8 sm:p-12 border border-[rgba(212,175,55,0.2)] shadow-2xl relative overflow-hidden">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#f2ca50]/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="font-mono text-xs text-[#f2ca50] tracking-[0.2em] uppercase font-bold">
              ✦ ĐẶC QUYỀN THƯỢNG HẠNG ✦
            </span>
            <h2 className="font-['Playfair_Display'] text-3xl font-bold text-white mt-1">
              Trải Nghiệm Điện Ảnh Đỉnh Cao Tại XEMPHIM
            </h2>
            <p className="text-sm text-[#9CA3AF] mt-2">
              Nâng tầm trải nghiệm thưởng thức phim với công nghệ trình chiếu hiện đại và dịch vụ tận tâm.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl bg-[#1b1b1f]/60 border border-[rgba(212,175,55,0.15)] flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#f2ca50]">
                <span className="material-symbols-outlined text-[28px]">airline_seat_recline_extra</span>
              </div>
              <h3 className="font-bold text-white text-base">Phòng Chiếu & Ghế VIP Cao Cấp</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Ghế bọc da cao cấp điều chỉnh độ nghiêng tự động, không gian riêng tư rộng rãi kèm phục vụ tại chỗ.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#1b1b1f]/60 border border-[rgba(212,175,55,0.15)] flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#f2ca50]">
                <span className="material-symbols-outlined text-[28px]">qr_code_scanner</span>
              </div>
              <h3 className="font-bold text-white text-base">Thanh Toán ZaloPay Siêu Tốc</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Quét mã QR VietQR / ZaloPay linh hoạt, xác nhận giao dịch trong 2 giây và nhận vé Boarding Pass ngay lập tức.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-[#1b1b1f]/60 border border-[rgba(212,175,55,0.15)] flex flex-col gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#f2ca50]">
                <span className="material-symbols-outlined text-[28px]">surround_sound</span>
              </div>
              <h3 className="font-bold text-white text-base">IMAX Laser & Dolby Atmos</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Hệ thống âm thanh vòm 360 độ và máy chiếu laser 4K siêu nét đem lại cảm giác đắm chìm vào từng phân cảnh.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;