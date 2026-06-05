import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaSearch, FaBars, FaUser, FaChevronDown } from 'react-icons/fa';
import styles from './Navbar.module.css';

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
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

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
  };

  const handleLogin = () => navigate('/login');

  const handleLogout = async () => {
    await authService.logout();
    setUser(null);
    setAdminMenuOpen(false);
    navigate('/');
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          CinemaX
        </Link>
        
        <ul className={styles.navLinks}>
          {user?.role === 'admin' ? (
            <>
              <li>
                <Link to="/" className={`${styles.navLink} ${isActiveLink('/')}`}>
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link to="/admin" className={`${styles.navLink} ${isActiveLink('/admin')}`}>
                  Trang quản trị
                </Link>
              </li>
            </>
          ) : (
            <>
              <li>
                <Link to="/" className={`${styles.navLink} ${isActiveLink('/')}`}>
                  Trang chủ
                </Link>
              </li>
              <li>
                <Link to="/movies" className={`${styles.navLink} ${isActiveLink('/movies')}`}>
                  Phim
                </Link>
              </li>
              <li>
                <Link to="/my-tickets" className={`${styles.navLink} ${isActiveLink('/my-tickets')}`}>
                  Vé của tôi
                </Link>
              </li>
            </>
          )}
        </ul>

        <div className={styles.rightSection}>
          {user?.role !== 'admin' && (
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
          )}

          <div className={styles.userSection}>
            {user ? (
              <>
                {user?.role === 'admin' ? (
                  <div className={styles.adminMenuContainer}>
                    {/* Bấm vào vùng chứa thông tin Admin Real Test để bật/tắt menu */}
                    <button
                      className={styles.adminProfileBtn}
                      onClick={() => setAdminMenuOpen(!adminMenuOpen)}
                      title="Menu Quản Trị"
                    >
                      <div className={styles.adminProfile}>
                        <div className={styles.avatarArea}>
                          {user.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div className={styles.profileInfo}>
                          <span className={styles.profileName}>{user.full_name || 'Admin Real Test'}</span>
                          <span className={styles.profileRole}>
                            System Manager <FaChevronDown style={{ fontSize: '0.8em', marginLeft: '2px' }} />
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Kiểm tra class styles.show động để ẩn/hiện menu chuẩn xác */}
                    <div className={`${styles.adminDropdown} ${adminMenuOpen ? styles.show : ''}`}>
                      <button 
                        onClick={() => {
                          setAdminMenuOpen(false);
                          navigate('/admin');
                        }}
                        className={styles.adminDropdownItemGo}
                      >
                        ⚙️ Trang Quản Trị
                      </button>
                      <button 
                        onClick={handleLogout}
                        className={styles.adminDropdownItem}
                      >
                        🚪 Đăng Xuất
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.userInfo}>
                    <div className={styles.avatar}>
                      <FaUser />
                    </div>
                    <div className={styles.userMeta}>
                      <Link to="/profile" className={styles.userNameLink}>Hi, {user.full_name || user.fullName || user.email}</Link>
                      <span className={styles.userSubtext}>Xem hồ sơ và lịch sử đặt vé</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button onClick={handleLogin} className={styles.loginBtn}>
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