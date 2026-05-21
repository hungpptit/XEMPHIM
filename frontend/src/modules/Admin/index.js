import React, { useState, useEffect } from 'react';
import HallManagement from './pages/HallManagement/HallList';
import styles from './AdminPanel.module.css';
import { FaChair, FaHome, FaFilm, FaTicketAlt, FaUserShield, FaChevronRight } from 'react-icons/fa';

export default function AdminPanel() {
  // Tab mặc định hiển thị Tổng Quan
  const [activeTab, setActiveTab] = useState('overview');

  // Quản lý các chỉ số thống kê bằng state (Đã xóa totalCinemas)
  const [stats, setStats] = useState({
    totalHalls: null,
    activeMovies: null,
    ticketsSoldToday: null
  });

  // Quản lý danh sách lịch sử hoạt động hệ thống từ API
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Hàm này sau này bạn dùng để fetch dữ liệu thật từ Backend (Movie Service / Port 4002)
  useEffect(() => {
    if (activeTab === 'overview') {
      // Logic gọi API của bạn sẽ đặt ở đây, ví dụ:
      // setIsLoading(true);
      // axios.get('/api/admin/dashboard-stats').then(res => { setStats(res.data); setIsLoading(false); })
    }
  }, [activeTab]);

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
              onClick={() => setActiveTab('overview')}
            >
              <FaHome className={styles.navIcon} />
              <span>Tổng Quan</span>
            </button>
          </li>
          <li className={styles.navItem}>
            <button
              className={`${styles.navBtn} ${activeTab === 'halls' ? styles.active : ''}`}
              onClick={() => setActiveTab('halls')}
            >
              <FaChair className={styles.navIcon} />
              <span>Quản Lý Phòng Chiếu</span>
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
              {activeTab === 'halls' && 'Quản lý sơ đồ và phân phối phòng chiếu'}
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
                      {stats.totalHalls !== null ? stats.totalHalls : '...'}
                    </h2>
                    <span className={styles.statTrend}>🔥 Đang cập nhật</span>
                  </div>
                  <FaChair className={styles.statIcon} />
                </div>

                <div className={`${styles.statCard} ${styles.cardGreen}`}>
                  <div className={styles.statInfo}>
                    <span className={styles.statLabel}>Phim Đang Chiếu</span>
                    <h2 className={styles.statValue}>
                      {stats.activeMovies !== null ? stats.activeMovies : '...'}
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
                    <button onClick={() => setActiveTab('halls')} className={styles.shortcutBtn}>
                      <span>Đi tới cấu hình sơ đồ phòng ghế</span> <FaChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'halls' && <HallManagement />}
        </div>
      </div>
    </div>
  );
}