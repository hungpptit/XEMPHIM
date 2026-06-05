import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CinemaManagement from './pages/CinemaManagement/CinemaList';
import HallManagement from './pages/HallManagement/HallList';
import MovieManagement from './pages/MovieManagement/MovieList';
import ShowtimeManagement from './pages/ShowtimeManagement/ShowtimeList';
import styles from './AdminPanel.module.css';
import { FaChair, FaHome, FaFilm, FaTicketAlt, FaUserShield, FaChevronRight, FaCity, FaClock } from 'react-icons/fa';
import { adminService } from './services/adminService';

export default function AdminPanel() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = (path) => {
    if (path.startsWith('/admin/halls')) return 'halls';
    if (path.startsWith('/admin/movies')) return 'movies';
    if (path.startsWith('/admin/showtimes')) return 'showtimes';
    return 'overview';
  };

  // Tab mặc định hiển thị Tổng Quan
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  // Quản lý các chỉ số thống kê bằng state (Đã xóa totalCinemas)
  const [stats, setStats] = useState({
    totalHalls: null,
    activeMovies: null,
    ticketsSoldToday: null
  });

  // Quản lý danh sách lịch sử hoạt động hệ thống từ API
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Hàm fetch dữ liệu thống kê từ Backend
  useEffect(() => {
    if (activeTab === 'overview') {
      const fetchDashboardStats = async () => {
        setIsLoading(true);
        try {
          // Lấy tổng quan từ Cinema service (đã có sẵn API overview)
          const res = await adminService.cinema.getOverview();
          if (res.data.success) {
            setStats({
              totalHalls: res.data.data.totalHalls || 0,
              activeMovies: res.data.data.totalCinemas || 0,
              ticketsSoldToday: 0 // Phần này sẽ cập nhật khi có Booking service
            });
          }

          // Giả lập nhật ký hoạt động
          setActivities([
            { time: 'Vừa xong', message: 'Dữ liệu hệ thống đã được cập nhật mới nhất.' },
            { time: '1 giờ trước', message: 'Hệ thống tự động sao lưu dữ liệu rạp chiếu.' }
          ]);
        } catch (error) {
          console.error("Lỗi lấy dữ liệu dashboard:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchDashboardStats();
    }
  }, [activeTab]);

  useEffect(() => {
    setActiveTab(getTabFromPath(location.pathname));
  }, [location.pathname]);

  const goOverview = () => {
    navigate('/admin');
  };

  const goHalls = () => navigate('/admin/halls');
  const goMovies = () => navigate('/admin/movies');
  const goShowtimes = () => navigate('/admin/showtimes');

  const getRoleText = () => {
    return 'Bảng Điều Khiển Quản Trị';
  };

  return (
    <div className={styles.adminPanel}>
      {/* ================= SIDEBAR ================= */}
      <div className={styles.sidebar}>
        <ul className={styles.sidebarNav}>
          <li className={styles.navItem}>
            <button
              className={`${styles.navBtn} ${activeTab === 'overview' ? styles.active : ''}`}
              onClick={goOverview}
            >
              <FaHome className={styles.navIcon} />
              <span>Tổng Quan</span>
            </button>
          </li>
          <li className={styles.navItem}>
            <button
              className={`${styles.navBtn} ${activeTab === 'cinemas' ? styles.active : ''}`}
              onClick={goCinemas}
            >
              <FaCity className={styles.navIcon} />
              <span>Quản Lý Rạp Chiếu</span>
            </button>
          </li>
          <li className={styles.navItem}>
            <button
              className={`${styles.navBtn} ${activeTab === 'halls' ? styles.active : ''}`}
              onClick={goHalls}
            >
              <FaChair className={styles.navIcon} />
              <span>Quản Lý Phòng Chiếu</span>
            </button>
          </li>
          <li className={styles.navItem}>
            <button
              className={`${styles.navBtn} ${activeTab === 'movies' ? styles.active : ''}`}
              onClick={goMovies}
            >
              <FaFilm className={styles.navIcon} />
              <span>Quản Lý Phim</span>
            </button>
          </li>
          <li className={styles.navItem}>
            <button
              className={`${styles.navBtn} ${activeTab === 'showtimes' ? styles.active : ''}`}
              onClick={goShowtimes}
            >
              <FaTicketAlt className={styles.navIcon} />
              <span>Quản Lý Suất Chiếu</span>
            </button>
          </li>
        </ul>

        <div className={styles.sidebarFooter}>
          <div className={styles.adminBadge}>
            <FaUserShield /> <span>Verified Admin</span>
          </div>
        </div>
      </div>

      {/* ================= MAIN CONTENT ================= */}
      <div className={styles.mainContent}>
        {/* Top Header - Đã loại bỏ hoàn toàn phần headerRight chứa thẻ adminProfile */}
        <div className={styles.contentHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.contentTitle}>{getRoleText()}</h1>
            <p className={styles.contentSubtitle}>
              {activeTab === 'overview' && 'Hệ thống báo cáo và tổng quan chỉ số'}
              {activeTab === 'cinemas' && 'Quản lý danh sách các cụm rạp và địa điểm'}
              {activeTab === 'halls' && 'Quản lý sơ đồ và phân phối phòng chiếu'}
              {activeTab === 'movies' && 'Quản lý danh sách phim và thông tin'}

            </p>
          </div>
        </div>

        {/* Content View */}
        <div className={styles.content}>
          {activeTab === 'overview' && (
            <div className={styles.overviewContainer}>
              {/* Grid các Thẻ Thống Kê */}
              <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.cardCyan}`}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Tổng Phòng Chiếu</span>
                    <h2 className={styles.statValue}>
                      {isLoading ? '...' : (stats.totalHalls !== null ? stats.totalHalls : 0)}
                    </h2>
                    <span className={styles.statTrend}>🔥 Đang cập nhật</span>
                  </div>
                  <FaChair className={styles.statIcon} />
                </div>

                <div className={`${styles.statCard} ${styles.cardGreen}`}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Phim Đang Chiếu</span>
                    <h2 className={styles.statValue}>
                      {isLoading ? '...' : (stats.activeMovies !== null ? stats.activeMovies : 0)}
                    </h2>
                    <span className={styles.statTrend}>📈 Đang chiếu rạp</span>
                  </div>
                  <FaFilm className={styles.statIcon} />
                </div>

                <div className={`${styles.statCard} ${styles.cardOrange}`}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Vé Bán Ra (Nay)</span>
                    <h2 className={styles.statValue}>
                      {stats.ticketsSoldToday !== null ? stats.ticketsSoldToday : '...'}
                    </h2>
                    <span className={styles.statTrend}>🚀 Dữ liệu thời gian thực</span>
                  </div>
                  <FaTicketAlt className={styles.statIcon} />
                </div>
              </div>

              {/* Nhật ký và phím tắt điều hướng nhanh */}
              <div className={styles.dashboardGrid}>
                <div className={styles.dashboardSection}>
                  <h3>Nhật Ký Hệ Thống</h3>
                  <div className={styles.activityList}>
                    {activities.length === 0 ? (
                      <p className={styles.emptyText}>Chưa có hoạt động mới nào được ghi nhận.</p>
                    ) : (
                      activities.map((item, index) => (
                        <div key={index} className={styles.activityItem}>
                          <span className={styles.activityTime}>{item.time}</span>
                          <p>{item.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={styles.dashboardSection}>
                  <h3>Lối Tắt Hành Động nhanh</h3>
                  <div className={styles.shortcutGrid}>
                    <button onClick={goHalls} className={styles.shortcutBtn}>
                      <span>Đi tới cấu hình sơ đồ phòng ghế</span> <FaChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cinemas' && <CinemaManagement />}
          {activeTab === 'halls' && <HallManagement />}
          {activeTab === 'movies' && <MovieManagement />}
          {activeTab === 'showtimes' && <ShowtimeManagement />}
        </div>
      </div>
    </div>
  );
}