import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import CinemaManagement from './pages/CinemaManagement/CinemaList';
import HallManagement from './pages/HallManagement/HallList';
import MovieManagement from './pages/MovieManagement/MovieList';
import ShowtimeManagement from './pages/ShowtimeManagement/ShowtimeList';
import UserManagement from './pages/UserManagement/UserList'; 
import RevenueDashboard from './pages/RevenueManagement/RevenueDashboard';
import styles from './AdminPanel.module.css';
import { FaHome, FaFilm, FaUserShield, FaChevronRight, FaCity, FaClock, FaUsers, FaTh, FaChartLine } from 'react-icons/fa';
import { adminService } from './services/adminService';

export default function AdminPanel() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabFromPath = (path) => {
    if (path.startsWith('/admin/halls')) return 'halls';
    if (path.startsWith('/admin/cinemas')) return 'cinemas';
    if (path.startsWith('/admin/movies')) return 'movies';
    if (path.startsWith('/admin/showtimes')) return 'showtimes';
    if (path.startsWith('/admin/users')) return 'users';
    if (path.startsWith('/admin/revenue')) return 'revenue';
    return 'overview';
  };

  // Tab mặc định hiển thị Tổng Quan
  const [activeTab, setActiveTab] = useState(() => getTabFromPath(location.pathname));

  // Quản lý các chỉ số thống kê bằng state
  const [stats, setStats] = useState({
    totalHalls: null,
    activeMovies: null,
    totalUsers: null
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
          // Lấy tổng quan từ Cinema service
          const res = await adminService.cinema.getOverview();
          
          // Lấy danh sách users để có stats (optional: separate stats API in user-service)
          const userRes = await adminService.user.list();
          const userCount = (userRes.data?.data || userRes.data || []).length;

          if (res.data.success) {
            const data = res.data.data;
            setStats({
              totalHalls: data.totalHalls || 0,
              activeMovies: data.totalMovies || 0,
              totalUsers: userCount
            });

            setActivities([
              { time: 'Vừa xong', message: 'Dữ liệu hệ thống đã được đồng bộ mới nhất.' },
              { time: 'Hôm nay', message: `Hệ thống ghi nhận tổng cộng ${data.totalCinemas} rạp chiếu đang hoạt động.` },
              { time: 'Người dùng', message: `Hiện đang có ${userCount} tài khoản trong cơ sở dữ liệu.` },
              { time: 'Thông tin', message: `Danh sách phim hiện tại có ${data.totalMovies} phim đang quản lý.` }
            ]);
          }
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

  const goOverview = () => navigate('/admin');
  const goHalls = () => navigate('/admin/halls');
  const goCinemas = () => navigate('/admin/cinemas');
  const goMovies = () => navigate('/admin/movies');
  const goShowtimes = () => navigate('/admin/showtimes');
  const goRevenue = () => navigate('/admin/revenue');
  const goUsers = () => navigate('/admin/users');

  const getRoleText = () => 'Bảng Điều Khiển Quản Trị';

  return (
    <div className={styles.adminPanel}>
      {/* ================= SIDEBAR ================= */}
      <div className={styles.sidebar}>
        <ul className={styles.sidebarNav}>
          <li className={styles.navItem}>
            <button className={`${styles.navBtn} ${activeTab === 'overview' ? styles.active : ''}`} onClick={goOverview}>
              <FaHome className={styles.navIcon} /> <span>Tổng Quan</span>
            </button>
          </li>
          <li className={styles.navItem}>
            <button className={`${styles.navBtn} ${activeTab === 'cinemas' ? styles.active : ''}`} onClick={goCinemas}>
              <FaCity className={styles.navIcon} /> <span>Quản Lý Rạp Chiếu</span>
            </button>
          </li>
          <li className={styles.navItem}>
            <button className={`${styles.navBtn} ${activeTab === 'halls' ? styles.active : ''}`} onClick={goHalls}>
              <FaTh className={styles.navIcon} /> <span>Quản Lý Phòng Chiếu</span>
            </button>
          </li>

          <li className={styles.navItem}>
            <button className={`${styles.navBtn} ${activeTab === 'movies' ? styles.active : ''}`} onClick={goMovies}>
              <FaFilm className={styles.navIcon} /> <span>Quản Lý Phim</span>
            </button>
          </li>
          <li className={styles.navItem}>
            <button className={`${styles.navBtn} ${activeTab === 'showtimes' ? styles.active : ''}`} onClick={goShowtimes}>
              <FaClock className={styles.navIcon} /> <span>Quản Lý Suất Chiếu</span>
            </button>
          </li>
          <li className={styles.navItem}>
            <button className={`${styles.navBtn} ${activeTab === 'revenue' ? styles.active : ''}`} onClick={goRevenue}>
              <FaChartLine className={styles.navIcon} /> <span>Thống Kê Doanh Số</span>
            </button>
          </li>
          <li className={styles.navItem}>
            <button className={`${styles.navBtn} ${activeTab === 'users' ? styles.active : ''}`} onClick={goUsers}>
              <FaUsers className={styles.navIcon} /> <span>Quản Lý Người Dùng</span>
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
        <div className={styles.contentHeader}>
          <div className={styles.headerLeft}>
            <h1 className={styles.contentTitle}>{getRoleText()}</h1>
            <p className={styles.contentSubtitle}>
              {activeTab === 'overview' && 'Hệ thống báo cáo và tổng quan chỉ số'}
              {activeTab === 'cinemas' && 'Quản lý danh sách các cụm rạp và địa điểm'}
              {activeTab === 'halls' && 'Quản lý danh sách các phòng chiếu trong rạp'}
              {activeTab === 'movies' && 'Quản lý danh sách phim và thông tin'}
              {activeTab === 'showtimes' && 'Sắp xếp lịch chiếu phim tại các rạp và phòng'}
              {activeTab === 'revenue' && 'Báo cáo và thống kê doanh số bán vé chi tiết theo rạp và phim'}
              {activeTab === 'users' && 'Quản lý danh sách tài khoản và phân quyền người dùng'}
            </p>
          </div>
        </div>

        <div className={styles.content}>
          {activeTab === 'overview' && (
            <div className={styles.overviewContainer}>
              <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.cardCyan}`}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Tổng Phòng Chiếu</span>
                    <h2 className={styles.statValue}>{isLoading ? '...' : (stats.totalHalls || 0)}</h2>
                    <span className={styles.statTrend}>🔥 Đang cập nhật</span>
                  </div>
                  <FaTh className={styles.statIcon} />
                </div>

                <div className={`${styles.statCard} ${styles.cardGreen}`}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Phim Đang Chiếu</span>
                    <h2 className={styles.statValue}>{isLoading ? '...' : (stats.activeMovies || 0)}</h2>
                    <span className={styles.statTrend}>📈 Đang chiếu rạp</span>
                  </div>
                  <FaFilm className={styles.statIcon} />
                </div>

                <div className={`${styles.statCard} ${styles.cardOrange}`}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Người Dùng</span>
                    <h2 className={styles.statValue}>{isLoading ? '...' : (stats.totalUsers || 0)}</h2>
                    <span className={styles.statTrend}>🚀 Đang hoạt động</span>
                  </div>
                  <FaUsers className={styles.statIcon} />
                </div>
              </div>

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
                    <button onClick={goUsers} className={styles.shortcutBtn}>
                      <span>Đi tới Quản lý người dùng</span> <FaChevronRight />
                    </button>
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
          {activeTab === 'revenue' && <RevenueDashboard />}
          {activeTab === 'users' && <UserManagement />}
        </div>
      </div>
    </div>
  );
}