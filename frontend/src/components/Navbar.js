import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaSearch, FaBars, FaUser } from 'react-icons/fa';
import styles from './Navbar.module.css';

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Simulate login state
  const location = useLocation();

  const isActiveLink = (path) => {
    return location.pathname === path ? styles.active : '';
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // Implement search functionality
    console.log('Searching for:', searchQuery);
  };

  const handleLogin = () => {
    setIsLoggedIn(!isLoggedIn);
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
            {isLoggedIn ? (
              <div className={styles.userInfo}>
                <div className={styles.avatar}>
                  <FaUser />
                </div>
                <span>Người dùng</span>
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