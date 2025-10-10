import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSearch, FaBars, FaUser } from 'react-icons/fa';
import styles from './Navbar.module.css';

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [user, setUser] = useState(null);
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

  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  const handleLogin = () => navigate('/login');

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    navigate('/');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          CinemaX
        </Link>
        
        <ul className={styles.navLinks}>
          <li>
            <Link 
              to="/" 
              className={`${styles.navLink} ${isActiveLink('/')}`}
            >
              Trang chủ
            </Link>
          </li>
          <li>
            <Link 
              to="/movies" 
              className={`${styles.navLink} ${isActiveLink('/movies')}`}
            >
              Phim
            </Link>
          </li>
          <li>
            <Link 
              to="/my-tickets" 
              className={`${styles.navLink} ${isActiveLink('/my-tickets')}`}
            >
              Vé của tôi
            </Link>
          </li>
        </ul>

        <div className={styles.rightSection}>
          <form onSubmit={handleSearch} className={styles.searchBox}>
            <input
              type="text"
              placeholder="Tìm kiếm phim..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            <FaSearch className={styles.searchIcon} />
          </form>

          <div className={styles.userSection}>
            {user ? (
              <div className={styles.userInfo}>
                <div className={styles.avatar}>
                  <FaUser />
                </div>
                <Link to="/profile" className={styles.userNameLink}>Hi, {user.full_name || user.fullName || user.email}</Link>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className={styles.loginBtn}
              >
                Đăng nhập
              </button>
            )}
          </div>

          <button className={styles.mobileMenuBtn}>
            <FaBars />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;