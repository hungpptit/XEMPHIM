import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import styles from './RevenueDashboard.module.css';
import { FaCalendarAlt, FaFilm, FaCity, FaTicketAlt, FaDollarSign, FaRedo } from 'react-icons/fa';

export default function RevenueDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Movie search filter with debounce and suggestions
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Stats data
  const [stats, setStats] = useState({
    summary: {
      totalRevenue: 0,
      totalTickets: 0
    },
    chartData: [],
    moviesList: [],
    cinemasList: [],
    topSellingMovies: []
  });

  // Debounce searchQuery
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadStats = async (start = startDate, end = endDate) => {
    try {
      setLoading(true);
      setError('');
      
      const params = {};
      if (start) params.startDate = start;
      if (end) params.endDate = end;

      const response = await adminService.stats.getRevenueStats(params);
      if (response?.data?.success) {
        setStats(response.data.data);
      } else {
        setError('Không thể lấy dữ liệu doanh số từ hệ thống.');
      }
    } catch (err) {
      console.error('Lỗi khi tải báo cáo doanh số:', err);
      setError(err.response?.data?.error || err.message || 'Lỗi khi kết nối đến server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError('Ngày bắt đầu không thể lớn hơn ngày kết thúc.');
      return;
    }
    loadStats(startDate, endDate);
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setDebouncedSearchQuery('');
    setShowSuggestions(false);
    loadStats('', '');
  };

  // Helper to format currency in VND
  const formatVND = (value) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Filter lists in real-time based on debouncedSearchQuery
  const filteredMovies = stats.moviesList.filter(movie =>
    movie.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  const filteredTopSelling = stats.topSellingMovies.filter(movie =>
    movie.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
  );

  // Suggestions shown immediately as user types
  const suggestions = searchQuery.trim() !== ''
    ? stats.moviesList.filter(movie =>
        movie.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectSuggestion = (title) => {
    setSearchQuery(title);
    setDebouncedSearchQuery(title);
    setShowSuggestions(false);
  };

  // Get max revenue for chart scaling
  const maxRevenue = Math.max(...stats.chartData.map(d => d.revenue), 1);

  return (
    <div className={styles.container}>
      {/* ================= FILTER BAR ================= */}
      <form onSubmit={handleFilter} className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label htmlFor="startDate">
            <FaCalendarAlt className={styles.icon} /> Từ Ngày
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className={styles.dateInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="endDate">
            <FaCalendarAlt className={styles.icon} /> Đến Ngày
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className={styles.dateInput}
          />
        </div>

        <div className={`${styles.filterGroup} ${styles.searchContainer}`}>
          <label htmlFor="searchMovie">
            <FaFilm className={styles.icon} /> Tìm Kiếm Phim
          </label>
          <input
            type="text"
            id="searchMovie"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Tiny delay to allow click on suggestion to register before dropdown is unmounted
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            placeholder="Nhập tên phim..."
            className={styles.dateInput}
            autoComplete="off"
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className={styles.suggestionsDropdown}>
              {suggestions.map((movie, idx) => (
                <div
                  key={idx}
                  className={styles.suggestionItem}
                  onClick={() => handleSelectSuggestion(movie.title)}
                >
                  {movie.title}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.filterActions}>
          <button type="submit" className={styles.btnFilter} disabled={loading}>
            Lọc Ngày
          </button>
          <button type="button" className={styles.btnReset} onClick={handleReset} disabled={loading}>
            <FaRedo /> Cài Lại
          </button>
        </div>
      </form>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {loading ? (
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p>Đang xử lý dữ liệu doanh thu...</p>
        </div>
      ) : (
        <>
          {/* ================= SUMMARY CARDS ================= */}
          <div className={styles.summaryGrid}>
            <div className={`${styles.summaryCard} ${styles.cardRevenue}`}>
              <div className={styles.cardInfo}>
                <span className={styles.cardLabel}>Tổng Doanh Thu</span>
                <h2 className={styles.cardValue}>{formatVND(stats.summary.totalRevenue)}</h2>
                <span className={styles.cardTrend}>🎟️ Từ các vé đã thanh toán thành công</span>
              </div>
              <FaDollarSign className={styles.cardIcon} />
            </div>

            <div className={`${styles.summaryCard} ${styles.cardTickets}`}>
              <div className={styles.cardInfo}>
                <span className={styles.cardLabel}>Tổng Vé Đã Bán</span>
                <h2 className={styles.cardValue}>{stats.summary.totalTickets} <span className={styles.unit}>vé</span></h2>
                <span className={styles.cardTrend}>📈 Tổng số lượng ghế đã đặt</span>
              </div>
              <FaTicketAlt className={styles.cardIcon} />
            </div>
          </div>

          {/* ================= REVENUE CHART ================= */}
          <div className={styles.chartSection}>
            <h3 className={styles.sectionTitle}>Biểu Đồ Xu Hướng Doanh Thu Ngày</h3>
            {stats.chartData.length === 0 ? (
              <p className={styles.noData}>Không có dữ liệu biểu đồ trong khoảng thời gian này.</p>
            ) : (
              <div className={styles.chartContainer}>
                <div className={styles.chartBars}>
                  {stats.chartData.map((day, idx) => {
                    const percentage = (day.revenue / maxRevenue) * 100;
                    return (
                      <div key={idx} className={styles.chartBarWrapper}>
                        <div className={styles.chartTooltip}>
                          <p className={styles.tooltipDate}>{day.date}</p>
                          <p className={styles.tooltipVal}>{formatVND(day.revenue)}</p>
                        </div>
                        <div 
                          className={styles.chartBar} 
                          style={{ height: `${Math.max(percentage, 5)}%` }}
                        ></div>
                        <span className={styles.chartLabelDate}>{day.date.split('/')[0]}/{day.date.split('/')[1]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ================= LEADERBOARDS & TABLES ================= */}
          <div className={styles.detailsGrid}>
            {/* 1. Doanh số theo Rạp */}
            <div className={styles.detailsSection}>
              <h3 className={styles.sectionTitle}>
                <FaCity className={styles.titleIcon} /> Doanh Số Theo Rạp Chiếu
              </h3>
              <div className={styles.tableWrapper}>
                <table className={styles.statsTable}>
                  <thead>
                    <tr>
                      <th>Tên Rạp</th>
                      <th className={styles.textCenter}>Số Vé</th>
                      <th className={styles.textRight}>Doanh Thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.cinemasList.length === 0 ? (
                      <tr>
                        <td colSpan="3" className={styles.tableEmpty}>Không có dữ liệu rạp chiếu</td>
                      </tr>
                    ) : (
                      stats.cinemasList.map((cinema, idx) => (
                        <tr key={idx}>
                          <td className={styles.fontSemibold}>{cinema.name}</td>
                          <td className={styles.textCenter}>{cinema.ticketsCount}</td>
                          <td className={`${styles.textRight} ${styles.colorGold}`}>{formatVND(cinema.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Doanh số theo Phim */}
            <div className={styles.detailsSection}>
              <h3 className={styles.sectionTitle}>
                <FaFilm className={styles.titleIcon} /> Doanh Số Theo Bộ Phim
              </h3>
              <div className={styles.tableWrapper}>
                <table className={styles.statsTable}>
                  <thead>
                    <tr>
                      <th>Tên Phim</th>
                      <th className={styles.textCenter}>Số Vé</th>
                      <th className={styles.textRight}>Doanh Thu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovies.length === 0 ? (
                      <tr>
                        <td colSpan="3" className={styles.tableEmpty}>Không tìm thấy phim phù hợp</td>
                      </tr>
                    ) : (
                      filteredMovies.map((movie, idx) => (
                        <tr key={idx}>
                          <td className={styles.fontSemibold}>{movie.title}</td>
                          <td className={styles.textCenter}>{movie.ticketsCount}</td>
                          <td className={`${styles.textRight} ${styles.colorGold}`}>{formatVND(movie.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ================= TOP SELLING MOVIES ================= */}
          <div className={styles.topSellingSection}>
            <h3 className={styles.sectionTitle}>
              <FaTicketAlt className={styles.titleIcon} /> Top 10 Phim Bán Vé Chạy Nhất (Theo số lượng vé)
            </h3>
            <div className={styles.topSellingGrid}>
              {filteredTopSelling.length === 0 ? (
                <p className={styles.noData}>Không tìm thấy phim phù hợp.</p>
              ) : (
                filteredTopSelling.map((movie, idx) => (
                  <div key={idx} className={styles.movieLeaderboardCard}>
                    <div className={styles.rankBadge}>#{idx + 1}</div>
                    <div className={styles.movieDetails}>
                      <h4>{movie.title}</h4>
                      <div className={styles.movieStatsSub}>
                        <span><strong>{movie.ticketsCount}</strong> vé</span>
                        <span className={styles.dot}>•</span>
                        <span>{formatVND(movie.revenue)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
