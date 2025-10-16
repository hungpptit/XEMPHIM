import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingAPI } from '../../services/api';
import { 
  FaTicketAlt, 
  FaQrcode, 
  FaClock, 
  FaMapMarkerAlt, 
  FaCalendar,
  FaUsers,
  FaEye,
  FaTimes,
  FaFilm
} from 'react-icons/fa';
import styles from './MyTickets.module.css';

const MyTickets = () => {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  // Load tickets from backend API
  const loadTickets = async () => {
    setLoading(true);
    try {
      // Get current user ID
      const { default: authService } = await import('../../services/authService');
      const user = await authService.getCurrentUser();
      const userId = user?.id || user?.user_id;
      if (!userId) throw new Error('User not found');
      // Fetch bookings
      const res = await bookingAPI.getUserBookings(userId);
      const data = res.data?.bookings || res.data || [];
      // Map bookings to tickets
      const mapped = data.map(booking => ({
        id: booking.id.toString(),
        movie: booking.movie,
        showtime: {
          date: new Date(booking.showtime.start_time).toISOString().slice(0, 10),
          time: new Date(booking.showtime.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          cinema: `Rạp ${booking.showtime.hall_id}`
        },
        selectedSeats: booking.seats,
        totalPrice: booking.total_price,
        status: booking.status,
        created_at: booking.created_at
      }));
      setTickets(mapped);
    } catch (err) {
      console.error('Error loading tickets:', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const getTicketStatus = (ticket) => {
    const now = new Date();
    const showDateTime = new Date(`${ticket.showtime.date} ${ticket.showtime.time}`);
    
    if (ticket.status === 'cancelled') {
      return 'cancelled';
    } else if (showDateTime < now) {
      return 'expired';
    } else {
      return 'confirmed';
    }
  };

  const getFilteredTickets = () => {
    return tickets.filter(ticket => {
      const status = getTicketStatus(ticket);
      if (filter === 'all') return true;
      return status === filter;
    });
  };

  const handleCancelTicket = async (ticketId) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy vé này?')) return;
    try {
      await bookingAPI.cancelBooking(ticketId);
      alert('Vé đã được hủy thành công');
      // Reload tickets to reflect change
      await loadTickets();
    } catch (err) {
      console.error('Cancel booking failed', err);
      alert('Hủy vé thất bại. Vui lòng thử lại.');
    }
  };

  const canCancelTicket = (ticket) => {
    const status = getTicketStatus(ticket);
    if (status === 'cancelled' || status === 'expired') return false;
    
    const now = new Date();
    const showDateTime = new Date(`${ticket.showtime.date} ${ticket.showtime.time}`);
    const timeDiff = showDateTime.getTime() - now.getTime();
    const hoursUntilShow = timeDiff / (1000 * 60 * 60);
    
    return hoursUntilShow > 2; // Can cancel if more than 2 hours before show
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed': return 'Đã xác nhận';
      case 'cancelled': return 'Đã hủy';
      case 'expired': return 'Đã chiếu';
      default: return 'Không xác định';
    }
  };

  const renderQRCode = (ticketId) => {
    // Simple QR code representation
    return (
      <div className={styles.qrCode}>
        <FaQrcode />
      </div>
    );
  };

  const filteredTickets = getFilteredTickets();

  if (loading) {
    return (
      <div className={styles.myTickets}>
        <div className="container">
          <div className={styles.loadingContainer}>
            <div className="loading"></div>
            <p>Đang tải vé của bạn...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.myTickets}>
      <div className={styles.header}>
        <h1 className={styles.title}>Vé Của Tôi</h1>
        <p className={styles.subtitle}>Quản lý và xem thông tin các vé đã đặt</p>
      </div>

      <div className={styles.content}>
        {tickets.length > 0 && (
          <div className={styles.filterTabs}>
            <button 
              className={`${styles.filterTab} ${filter === 'all' ? styles.active : ''}`}
              onClick={() => setFilter('all')}
            >
              Tất cả ({tickets.length})
            </button>
            <button 
              className={`${styles.filterTab} ${filter === 'confirmed' ? styles.active : ''}`}
              onClick={() => setFilter('confirmed')}
            >
              Còn hiệu lực ({tickets.filter(t => getTicketStatus(t) === 'confirmed').length})
            </button>
            <button 
              className={`${styles.filterTab} ${filter === 'expired' ? styles.active : ''}`}
              onClick={() => setFilter('expired')}
            >
              Đã chiếu ({tickets.filter(t => getTicketStatus(t) === 'expired').length})
            </button>
            <button 
              className={`${styles.filterTab} ${filter === 'cancelled' ? styles.active : ''}`}
              onClick={() => setFilter('cancelled')}
            >
              Đã hủy ({tickets.filter(t => getTicketStatus(t) === 'cancelled').length})
            </button>
          </div>
        )}

        {filteredTickets.length === 0 ? (
          <div className={styles.emptyState}>
            <FaTicketAlt className={styles.emptyIcon} />
            <h2 className={styles.emptyTitle}>
              {tickets.length === 0 ? 'Chưa có vé nào' : 'Không có vé nào phù hợp'}
            </h2>
            <p className={styles.emptyDesc}>
              {tickets.length === 0 
                ? 'Bạn chưa đặt vé nào. Hãy khám phá các bộ phim hấp dẫn và đặt vé ngay!'
                : 'Không tìm thấy vé nào phù hợp với bộ lọc hiện tại.'
              }
            </p>
            {tickets.length === 0 && (
              <button 
                className={styles.browseBtn}
                onClick={() => navigate('/')}
              >
                <FaFilm />
                Khám phá phim
              </button>
            )}
          </div>
        ) : (
          <div className={styles.ticketsGrid}>
            {filteredTickets.map((ticket) => {
              const status = getTicketStatus(ticket);
              
              return (
                <div key={ticket.id} className={styles.ticketCard}>
                  <div className={styles.ticketHeader}>
                    <div className={styles.ticketNumber}>
                      Vé #{ticket.id.slice(-8).toUpperCase()}
                    </div>
                    <div className={`${styles.ticketStatus} ${styles[status]}`}>
                      {getStatusLabel(status)}
                    </div>
                  </div>

                  <div className={styles.ticketBody}>
                    <img 
                      src={ticket.movie.poster}
                      alt={ticket.movie.title}
                      className={styles.moviePoster}
                    />

                    <div className={styles.ticketInfo}>
                      <h3 className={styles.movieTitle}>{ticket.movie.title}</h3>
                      
                      <div className={styles.infoGrid}>
                        <div className={styles.infoItem}>
                          <div className={styles.infoLabel}>Ngày chiếu</div>
                          <div className={styles.infoValue}>
                            <FaCalendar className={styles.infoIcon} />
                            {ticket.showtime.date}
                          </div>
                        </div>
                        
                        <div className={styles.infoItem}>
                          <div className={styles.infoLabel}>Giờ chiếu</div>
                          <div className={styles.infoValue}>
                            <FaClock className={styles.infoIcon} />
                            {ticket.showtime.time}
                          </div>
                        </div>
                        
                        <div className={styles.infoItem}>
                          <div className={styles.infoLabel}>Rạp</div>
                          <div className={styles.infoValue}>
                            <FaMapMarkerAlt className={styles.infoIcon} />
                            {ticket.showtime.cinema}
                          </div>
                        </div>
                        
                        <div className={styles.infoItem}>
                          <div className={styles.infoLabel}>Số ghế</div>
                          <div className={styles.infoValue}>
                            <FaUsers className={styles.infoIcon} />
                            {ticket.selectedSeats.length} ghế
                          </div>
                        </div>
                      </div>

                      <div className={styles.seatsInfo}>
                        <div className={styles.infoLabel}>Ghế đã đặt</div>
                        <div className={styles.seatsList}>
                          {ticket.selectedSeats.map(seat => (
                            <span key={seat.id} className={styles.seatItem}>
                              {seat.displayName || `${seat.row}${seat.number}`}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className={styles.totalPrice}>
                        {ticket.totalPrice.toLocaleString()}đ
                      </div>

                      <div className={styles.ticketActions}>
                        <button 
                          className={styles.detailBtn}
                          onClick={() => navigate(`/movies/${ticket.movie.id}`)}
                        >
                          <FaEye />
                          Chi tiết phim
                        </button>
                        
                        {canCancelTicket(ticket) && (
                          <button 
                            className={styles.cancelBtn}
                            onClick={() => handleCancelTicket(ticket.id)}
                          >
                            <FaTimes />
                            Hủy vé
                          </button>
                        )}
                      </div>
                    </div>

                    {status === 'confirmed' && (
                      <div className={styles.qrSection}>
                        {renderQRCode(ticket.id)}
                        <div className={styles.qrLabel}>
                          Quét mã QR này tại rạp để vào xem phim
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTickets;