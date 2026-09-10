import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import { listMovies } from '../services/movieService';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSearch, FaBars, FaUser, FaChevronDown } from 'react-icons/fa';
import styles from './Navbar.module.css';

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [user, setUser] = useState(null);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false); // Mặc định luôn là false (đóng)
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const u = await authService.getCurrentUser();
      if(mounted) setUser(u);
    };
    init();

    const onAuth = async () => {
      const u = await authService.getCurrentUser();
      setUser(u);
    };
    window.addEventListener('authChanged', onAuth);
    return () => { mounted = false; window.removeEventListener('authChanged', onAuth); };
  }, []);

  const isActiveLink = (path) => {
    return location.pathname === path ? styles.active : '';
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const q = queryParams.get('search') || '';
    setSearchQuery(q);
  }, [location.search]);

  // Debounced suggestion fetch
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const allMovies = await listMovies();
        const filtered = allMovies.filter(m =>
          m.title && m.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSuggestions(filtered);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/');
    }
  };

  const handleLogin = () => {
    const currentPath = location.pathname + location.search;
    if (currentPath !== '/login' && currentPath !== '/register') {
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, {
        state: { from: currentPath }
      });
    } else {
      navigate('/login');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setAdminMenuOpen(false);
    navigate('/');
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-[#12161F]/90 backdrop-blur-xl border-b border-[rgba(212,175,55,0.2)] shadow-[0_4px_30px_rgba(0,0,0,0.85)]">
      <div className="h-20 max-w-[1360px] mx-auto px-4 md:px-8 flex items-center justify-between gap-6">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] via-[#F5E6AB] to-[#B8860B] flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.5)]">
            <span className="material-symbols-outlined text-[#08090C] text-[24px]">crown</span>
          </div>
          <div className="flex flex-col">
            <span className="font-['Playfair_Display'] text-xl font-bold tracking-widest text-[#f2ca50] uppercase">
              XEMPHIM
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#d5c78e] uppercase -mt-1">
              Cinemas
            </span>
          </div>
        </Link>

        {/* Navigation Links with Spacious Breathing Room */}
        <nav className="hidden lg:flex items-center gap-8 xl:gap-10">
          <Link 
            to="/" 
            className={`text-sm uppercase tracking-wider font-semibold transition-colors ${
              location.pathname === '/' ? 'text-[#f2ca50] drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            Trang Chủ
          </Link>
          <a 
            href="/#now-section" 
            className="text-sm uppercase tracking-wider font-semibold text-[#9CA3AF] hover:text-white transition-colors"
          >
            Phim Đang Chiếu
          </a>
          <a 
            href="/#coming-section" 
            className="text-sm uppercase tracking-wider font-semibold text-[#9CA3AF] hover:text-white transition-colors"
          >
            Phim Sắp Chiếu
          </a>
          <Link 
            to="/my-tickets" 
            className={`text-sm uppercase tracking-wider font-semibold transition-colors ${
              location.pathname === '/my-tickets' ? 'text-[#f2ca50] drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)]' : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            Vé Của Tôi
          </Link>
          {user?.role === 'admin' && (
            <Link 
              to="/admin" 
              className={`text-sm uppercase tracking-wider font-semibold transition-colors ${
                location.pathname.startsWith('/admin') ? 'text-[#f2ca50]' : 'text-[#F5E6AB] hover:text-white'
              }`}
            >
              👑 Quản Trị
            </Link>
          )}
        </nav>

        {/* Right Section: Search & User */}
        <div className="flex items-center gap-4">
          {/* Search Box */}
          <form onSubmit={handleSearch} className="relative hidden md:flex items-center">
            <div className="flex items-center bg-[#0d0e11] border border-[rgba(212,175,55,0.2)] rounded-full px-3 py-1.5 focus-within:border-[#D4AF37] transition-all">
              <span className="material-symbols-outlined text-[#f2ca50] text-[18px] mr-2">search</span>
              <input
                type="text"
                placeholder="Tìm phim, sự kiện VIP..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className="bg-transparent text-sm text-[#e3e2e6] placeholder-[#9CA3AF] focus:outline-none w-36 lg:w-48"
              />
            </div>

            {/* Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-12 left-0 right-0 bg-[#12161F] border border-[rgba(212,175,55,0.25)] rounded-xl shadow-2xl p-2 z-50 max-h-80 overflow-y-auto">
                {suggestions.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 p-2 hover:bg-[#1b1b1f] rounded-lg cursor-pointer transition-colors"
                    onClick={() => {
                      setSearchQuery('');
                      setShowSuggestions(false);
                      navigate(`/movies/${m.id}`);
                    }}
                  >
                    {m.poster && (
                      <img src={m.poster} alt={m.title} className="w-10 h-14 object-cover rounded" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-white">{m.title}</span>
                      <span className="text-xs text-[#9CA3AF]">
                        {m.duration ? `${m.duration} phút` : ''} {m.releaseYear ? ` • ${m.releaseYear}` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form>

          {/* User Profile / Login */}
          <div className="relative">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                  className="relative flex items-center gap-2.5 p-1 pr-3 rounded-full bg-[#1b1b1f] border border-[rgba(212,175,55,0.3)] hover:border-[#D4AF37] transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#AA771C] flex items-center justify-center text-[#08090C] font-bold text-sm">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="text-sm font-medium text-white max-w-[120px] truncate hidden sm:inline">
                    {user.full_name || 'Khách VIP'}
                  </span>
                  <span className="text-[10px] text-[#F3C644]">👑</span>
                </button>

                {/* Dropdown Menu */}
                {adminMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-[#12161F] border border-[rgba(212,175,55,0.3)] rounded-xl shadow-2xl p-2 z-50">
                    <div className="px-3 py-2 border-b border-gray-800">
                      <p className="text-xs text-[#9CA3AF]">Tài khoản thành viên VIP</p>
                      <p className="text-sm font-semibold text-[#f2ca50] truncate">{user.email}</p>
                    </div>
                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          setAdminMenuOpen(false);
                          navigate('/admin');
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-[#1b1b1f] rounded-lg transition-colors flex items-center gap-2 mt-1"
                      >
                        <span className="material-symbols-outlined text-sm text-[#f2ca50]">admin_panel_settings</span>
                        Trang Quản Trị
                      </button>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => setAdminMenuOpen(false)}
                      className="w-full block px-3 py-2 text-sm text-white hover:bg-[#1b1b1f] rounded-lg transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm text-[#f2ca50]">badge</span>
                      Hồ Sơ Của Tôi
                    </Link>
                    <Link
                      to="/my-tickets"
                      onClick={() => setAdminMenuOpen(false)}
                      className="w-full block px-3 py-2 text-sm text-white hover:bg-[#1b1b1f] rounded-lg transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm text-[#f2ca50]">confirmation_number</span>
                      Vé Đã Đặt
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-2 mt-1"
                    >
                      <span className="material-symbols-outlined text-sm text-red-400">logout</span>
                      Đăng Xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleLogin}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-[#D4AF37] via-[#F5E6AB] to-[#B8860B] text-[#08090C] text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-[0_0_15px_rgba(212,175,55,0.3)] transition-all"
              >
                Đăng Nhập VIP
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;