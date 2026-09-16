import React, { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react'; 
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
  FaChevronRight,
  FaTimes,
  FaFilm
} from 'react-icons/fa';
import authService from '../../services/authService';
import styles from './MyTickets.module.css';

const MyTickets = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  // Load tickets from backend API
  const loadTickets = async () => {
    setLoading(true);
    try {
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);

      const userId = currentUser?.id || currentUser?.user_id;
      if (!userId) {
        setTickets([]);
        return;
      }

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
          cinema: booking.showtime?.CinemaHall?.Cinema
            ? `${booking.showtime.CinemaHall.Cinema.name} - ${booking.showtime.CinemaHall.name}`
            : (booking.showtime?.cinema || `Rạp Hoàng Gia ${booking.showtime?.hall_id || 1}`)
        },
        selectedSeats: booking.seats,
        totalPrice: booking.total_price,
        status: booking.status,
        created_at: booking.created_at,
        qrData: booking.qr_data,
        qrToken: booking.qr_token,
        checkedIn: booking.checked_in
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

    const onAuthChanged = () => {
      loadTickets();
    };
    window.addEventListener('authChanged', onAuthChanged);
    return () => window.removeEventListener('authChanged', onAuthChanged);
  }, []);

  const getTicketStatus = (ticket) => {
    const now = new Date();
    const showDateTime = new Date(`${ticket.showtime.date} ${ticket.showtime.time}`);
    
    // Return actual booking status first
    if (ticket.status === 'cancelled') {
      return 'cancelled';
    } else if (ticket.status === 'refunded') {
      return 'refunded';
    } else if (ticket.status === 'locked') {
      return 'locked';
    } else if (ticket.status === 'confirmed') {
      // Check if showtime has passed
      if (showDateTime < now) {
        return 'expired';
      }
      return 'confirmed';
    } else if (showDateTime < now) {
      return 'expired';
    } else {
      return ticket.status || 'unknown';
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

  const handleRefundTicket = async (ticket) => {
    const confirmMsg = `Bạn có chắc chắn muốn hoàn tiền cho vé này?\n\nPhim: ${ticket.movie.title}\nNgày chiếu: ${ticket.showtime.date} ${ticket.showtime.time}\nSố tiền: ${ticket.totalPrice.toLocaleString()}đ\n\nLưu ý: Chỉ có thể hoàn tiền nếu còn hơn 2 giờ trước giờ chiếu.`;
    
    if (!window.confirm(confirmMsg)) return;
    
    const reason = prompt('Vui lòng nhập lý do hoàn tiền (không bắt buộc):');
    
    try {
      const currentUser = await authService.getCurrentUser();
      const userId = currentUser?.id || currentUser?.user_id;
      
      const response = await bookingAPI.refundBooking(ticket.id, { 
        reason: reason || 'User requested refund',
        user_id: userId 
      });
      
      const data = response.data || response;
      
      if (data.success) {
        alert(`✅ Yêu cầu hoàn tiền thành công!\n\n${data.message || 'Tiền sẽ được hoàn lại trong vòng 1-3 ngày làm việc.'}`);
        await loadTickets();
      } else {
        alert(`❌ Hoàn tiền thất bại!\n\n${data.message || 'Vui lòng thử lại sau.'}`);
      }
    } catch (err) {
      console.error('Refund booking failed', err);
      const errorMsg = err.response?.data?.message || err.message || 'Đã xảy ra lỗi khi xử lý hoàn tiền';
      alert(`❌ Hoàn tiền thất bại!\n\n${errorMsg}`);
    }
  };

  const canCancelTicket = (ticket) => {
    // Can only cancel 'locked' bookings (before payment)
    if (ticket.status !== 'locked') return false;
    
    const now = new Date();
    const showDateTime = new Date(`${ticket.showtime.date} ${ticket.showtime.time}`);
    const timeDiff = showDateTime.getTime() - now.getTime();
    const hoursUntilShow = timeDiff / (1000 * 60 * 60);
    
    return hoursUntilShow > 0; // Can cancel locked booking anytime before showtime
  };

  const canRefundTicket = (ticket) => {
    // Can only refund 'confirmed' (paid) bookings
    if (ticket.status !== 'confirmed') return false;
    
    const now = new Date();
    const showDateTime = new Date(`${ticket.showtime.date} ${ticket.showtime.time}`);
    const timeDiff = showDateTime.getTime() - now.getTime();
    const hoursUntilShow = timeDiff / (1000 * 60 * 60);
    
    return hoursUntilShow > 2; // Can refund if more than 2 hours before show
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'confirmed': return 'Đã xác nhận';
      case 'locked': return 'Đang giữ chỗ';
      case 'cancelled': return 'Đã hủy';
      case 'refunded': return 'Đã hoàn tiền';
      case 'expired': return 'Đã chiếu';
      default: return 'Không xác định';
    }
  };

  const renderQRCode = (ticket) => {
    if (!ticket.qrData) {
      return (
        <div className={styles.qrCodePlaceholder}>
          <FaQrcode className={styles.qrIcon} />
          <p>Chưa có mã QR</p>
        </div>
      );
    }

    return (
      <div className={styles.qrCode}>
        <QRCodeCanvas
          value={ticket.qrData}
          size={140}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
          includeMargin={true}
        />
      </div>
    );
  };

  const filteredTickets = getFilteredTickets();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121316] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin"></div>
        <p className="font-['Playfair_Display'] tracking-widest text-[#f2ca50] uppercase text-sm">
          Đang tải danh sách vé...
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#121316] min-h-full text-[#e3e2e6] pt-8 pb-20">
      <div className="max-w-[1360px] mx-auto px-4 md:px-8 flex flex-col gap-8">
        {/* Header & Membership Tier Badge */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[rgba(212,175,55,0.2)]">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#F3C644] text-[20px]">workspace_premium</span>
              <span className="font-mono text-xs text-[#d5c78e] tracking-widest uppercase font-bold">
                VÉ CỦA TÔI • CINEMA TICKETS
              </span>
            </div>
            <h1 className="font-['Playfair_Display'] text-3xl sm:text-4xl text-white font-bold tracking-wide">
              VÉ XEM PHIM CỦA TÔI
            </h1>
            <p className="text-xs sm:text-sm text-[#9CA3AF] italic">
              Quản lý thẻ vé vào phòng chiếu và mã QR Check-in
            </p>
          </div>

          {/* Real Total Tickets Count Badge or Login Prompt Badge */}
          {user ? (
            <div className="flex items-center gap-3 bg-[#1b1b1f] border border-[rgba(212,175,55,0.3)] px-4 py-2 rounded-2xl shadow-xl">
              <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#f2ca50]">
                <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-xs text-[#f2ca50] font-bold uppercase tracking-wider">
                  {tickets.length} Vé Đã Đặt
                </span>
                <span className="text-[11px] text-[#9CA3AF]">Tất cả giao dịch</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-[#1b1b1f] border border-amber-500/30 px-4 py-2 rounded-2xl shadow-xl">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-xs text-amber-400 font-bold uppercase tracking-wider">
                  Chưa Đăng Nhập
                </span>
                <span className="text-[11px] text-[#9CA3AF]">Cần đăng nhập tài khoản</span>
              </div>
            </div>
          )}
        </div>

        {/* Not Logged In State */}
        {!user ? (
          <div className="relative overflow-hidden p-8 sm:p-12 md:p-16 text-center bg-gradient-to-b from-[#161a24] to-[#0f1218] rounded-3xl border border-[rgba(212,175,55,0.25)] shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-col items-center gap-6 max-w-2xl mx-auto my-4 w-full">
            {/* Subtle Gold Aura Effect */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-[#D4AF37]/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Luxury Lock & Key Icon */}
            <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1b1b1f] to-[#121316] border border-[#D4AF37]/40 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.2)]">
              <span className="material-symbols-outlined text-4xl text-[#f2ca50]">lock</span>
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8860B] flex items-center justify-center text-[#08090C] shadow-md">
                <span className="material-symbols-outlined text-sm font-bold">key</span>
              </div>
            </div>

            {/* Chip Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#f2ca50] text-xs font-mono uppercase tracking-widest font-semibold">
              <span className="material-symbols-outlined text-sm">account_circle</span>
              Xác Thực Tài Khoản
            </div>

            {/* Title & Description */}
            <div className="flex flex-col gap-2">
              <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl font-bold text-white tracking-wide">
                Bạn Chưa Đăng Nhập Tài Khoản
              </h2>
              <p className="text-sm sm:text-base text-[#9CA3AF] max-w-lg leading-relaxed mx-auto">
                Vui lòng đăng nhập để tra cứu lịch sử đặt vé, xem vé điện tử và mã QR Check-in tại rạp.
              </p>
            </div>

            {/* Primary & Secondary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <button 
                onClick={() => navigate('/login?redirect=/my-tickets', { state: { from: '/my-tickets' } })}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5E6AB] to-[#B8860B] text-[#08090C] font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.35)] hover:brightness-110 hover:shadow-[0_0_25px_rgba(212,175,55,0.5)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base">login</span>
                <span>Đăng Nhập Ngay</span>
              </button>

              <button 
                onClick={() => navigate('/register?redirect=/my-tickets', { state: { from: '/my-tickets' } })}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#1b1b1f] hover:bg-[#252830] border border-[rgba(212,175,55,0.3)] hover:border-[#D4AF37] text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-base text-[#f2ca50]">person_add</span>
                <span>Đăng Ký Tài Khoản</span>
              </button>
            </div>

            {/* Account Benefits Mini Feature List */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full pt-4 mt-2 border-t border-[rgba(212,175,55,0.15)] text-left">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#1b1b1f]/60 border border-[rgba(212,175,55,0.15)]">
                <span className="material-symbols-outlined text-lg text-[#f2ca50]">confirmation_number</span>
                <div className="text-[11px]">
                  <p className="font-semibold text-white">Vé điện tử</p>
                  <p className="text-[#9CA3AF]">Tra cứu mọi lúc</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#1b1b1f]/60 border border-[rgba(212,175,55,0.15)]">
                <span className="material-symbols-outlined text-lg text-[#f2ca50]">qr_code_scanner</span>
                <div className="text-[11px]">
                  <p className="font-semibold text-white">QR Check-in</p>
                  <p className="text-[#9CA3AF]">Vào rạp tức thì</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#1b1b1f]/60 border border-[rgba(212,175,55,0.15)]">
                <span className="material-symbols-outlined text-lg text-[#f2ca50]">history</span>
                <div className="text-[11px]">
                  <p className="font-semibold text-white">Lịch sử vé</p>
                  <p className="text-[#9CA3AF]">Quản lý dễ dàng</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Tab Filters */}
            {tickets.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 bg-[#0d0e11] p-1.5 rounded-2xl w-fit border border-gray-800">
                <button 
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    filter === 'all' 
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#08090C] shadow-md' 
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                  onClick={() => setFilter('all')}
                >
                  Tất cả ({tickets.length})
                </button>
                <button 
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    filter === 'confirmed' 
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#08090C] shadow-md' 
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                  onClick={() => setFilter('confirmed')}
                >
                  Còn hiệu lực ({tickets.filter(t => getTicketStatus(t) === 'confirmed').length})
                </button>
                <button 
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    filter === 'expired' 
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#08090C] shadow-md' 
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                  onClick={() => setFilter('expired')}
                >
                  Đã chiếu ({tickets.filter(t => getTicketStatus(t) === 'expired').length})
                </button>
                <button 
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    filter === 'cancelled' 
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#08090C] shadow-md' 
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                  onClick={() => setFilter('cancelled')}
                >
                  Đã hủy ({tickets.filter(t => getTicketStatus(t) === 'cancelled').length})
                </button>
                <button 
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    filter === 'refunded' 
                      ? 'bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#08090C] shadow-md' 
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                  onClick={() => setFilter('refunded')}
                >
                  Đã hoàn tiền ({tickets.filter(t => getTicketStatus(t) === 'refunded').length})
                </button>
              </div>
            )}

            {/* Empty State */}
            {filteredTickets.length === 0 ? (
              <div className="p-12 text-center bg-[#12161F] rounded-2xl border border-[rgba(212,175,55,0.2)] flex flex-col items-center gap-4">
                <span className="material-symbols-outlined text-5xl text-[#D4AF37]">confirmation_number</span>
                <h2 className="font-['Playfair_Display'] text-xl font-bold text-white">
                  {tickets.length === 0 ? 'Bạn Chưa Có Vé Xem Phim Nào' : 'Không Tìm Thấy Vé Phù Hợp'}
                </h2>
                <p className="text-xs text-[#9CA3AF] max-w-md">
                  {tickets.length === 0 
                    ? 'Hãy khám phá các tác phẩm điện ảnh kinh điển và đặt vé phòng chiếu VIP ngay hôm nay!'
                    : 'Không có vé nào trong mục này. Vui lòng chọn tab khác để xem.'}
                </p>
                {tickets.length === 0 && (
                  <button 
                    onClick={() => navigate('/')}
                    className="mt-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#08090C] text-xs font-bold uppercase tracking-wider shadow-lg"
                  >
                    Khám Phá Phim Ngay
                  </button>
                )}
              </div>
            ) : (
          /* VIP Boarding Pass Tickets Grid */
          <div className="flex flex-col gap-8">
            {filteredTickets.map((ticket) => {
              const status = getTicketStatus(ticket);
              const isConfirmed = status === 'confirmed';

              return (
                <div 
                  key={ticket.id} 
                  className="relative rounded-2xl bg-[#12161F] border border-[rgba(212,175,55,0.25)] shadow-2xl overflow-hidden"
                >
                  {/* Top Golden Light Strip */}
                  <div className="h-1 bg-gradient-to-r from-[#AA771C] via-[#f2ca50] to-[#AA771C]"></div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 relative">
                    {/* LEFT PASS BODY (8 cols) */}
                    <div className="lg:col-span-8 p-6 sm:p-8 flex flex-col justify-between gap-6 border-b lg:border-b-0 lg:border-r border-dashed border-gray-800">
                      {/* Top Pass Status Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-800/60">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold text-[#f2ca50] tracking-widest uppercase bg-[#1b1b1f] px-3 py-1 rounded-full border border-[rgba(212,175,55,0.2)]">
                            PASS NO. BK-{ticket.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-xs text-[#9CA3AF]">
                            Mã vé: #{ticket.id}
                          </span>
                        </div>

                        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          isConfirmed 
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30' 
                            : status === 'cancelled' || status === 'refunded'
                            ? 'bg-red-950/70 text-red-300 border border-red-500/30'
                            : 'bg-gray-800 text-gray-400'
                        }`}>
                          <span className="material-symbols-outlined text-[16px]">
                            {isConfirmed ? 'verified' : 'info'}
                          </span>
                          <span>{getStatusLabel(status)}</span>
                        </div>
                      </div>

                      {/* Main Film Content */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                        <div className="relative w-24 sm:w-28 aspect-[2/3] shrink-0 rounded-xl overflow-hidden shadow-xl bg-[#0d0e11] border border-[rgba(212,175,55,0.2)]">
                          <img 
                            src={ticket.movie?.poster} 
                            alt={ticket.movie?.title} 
                            className="w-full h-full object-cover" 
                          />
                          <span className="absolute bottom-1 left-1.5 font-mono text-[9px] text-[#f2ca50] font-bold bg-black/80 px-1.5 py-0.5 rounded">
                            VIP 2D
                          </span>
                        </div>

                        <div className="flex flex-col gap-2">
                          <h2 className="font-['Playfair_Display'] text-xl sm:text-2xl text-white font-bold tracking-wide">
                            {ticket.movie?.title}
                          </h2>
                          <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                            <span>{ticket.showtime?.cinema}</span>
                          </div>
                          <p className="text-xs text-[#d5c78e] mt-1">
                            Trải nghiệm công nghệ IMAX • Âm thanh vòm Dolby Atmos • Phục vụ phòng VIP
                          </p>
                        </div>
                      </div>

                      {/* Detail Ledger Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-[#0d0e11] border border-gray-800/80">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-[#9CA3AF] uppercase">Suất Chiếu</span>
                          <span className="font-['Playfair_Display'] text-base font-bold text-white mt-0.5">{ticket.showtime?.time}</span>
                          <span className="text-[11px] text-[#f2ca50]">{ticket.showtime?.date}</span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[11px] text-[#9CA3AF] uppercase">Phòng Chiếu</span>
                          <span className="text-sm font-semibold text-white mt-0.5">Phòng VIP 01</span>
                          <span className="text-[11px] text-[#9CA3AF]">IMPERIAL SUITE</span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[11px] text-[#9CA3AF] uppercase">Ghế Đã Đặt</span>
                          <span className="font-['Playfair_Display'] text-sm font-bold text-[#F3C644] mt-0.5">
                            {ticket.selectedSeats.map(s => s.displayName || `${s.row}${s.number}`).join(', ')}
                          </span>
                          <span className="text-[11px] text-[#9CA3AF]">{ticket.selectedSeats.length} Ghế VIP</span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[11px] text-[#9CA3AF] uppercase">Tổng Tiền</span>
                          <span className="font-['Playfair_Display'] text-sm font-bold text-[#f2ca50] mt-0.5">
                            {ticket.totalPrice.toLocaleString()}đ
                          </span>
                          <span className="text-[11px] text-emerald-400">ĐÃ THANH TOÁN</span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button 
                          onClick={() => navigate(`/movies/${ticket.movie?.id}`)}
                          className="px-4 py-2 rounded-xl bg-[#1b1b1f] hover:bg-[#252830] text-[#e3e2e6] border border-gray-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
                        >
                          <FaEye className="text-[#f2ca50]" />
                          <span>Chi Tiết Phim</span>
                        </button>

                        {canCancelTicket(ticket) && (
                          <button 
                            onClick={() => handleCancelTicket(ticket.id)}
                            className="px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-700/40 text-xs font-semibold transition-colors flex items-center gap-1.5"
                          >
                            <FaTimes />
                            <span>Hủy Vé</span>
                          </button>
                        )}

                        {canRefundTicket(ticket) && (
                          <button 
                            onClick={() => handleRefundTicket(ticket)}
                            className="px-4 py-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-700/40 text-xs font-semibold transition-colors flex items-center gap-1.5"
                          >
                            <FaTimes />
                            <span>Hoàn Tiền</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* RIGHT PASS: Check-in QR Canvas (4 cols) */}
                    <div className="lg:col-span-4 p-6 sm:p-8 flex flex-col items-center justify-center text-center bg-[#0d0e11]/60">
                      {isConfirmed ? (
                        <div className="flex flex-col items-center gap-4">
                          <span className="text-xs font-mono text-[#f2ca50] uppercase tracking-widest font-bold">
                            MÃ CHECK-IN TẠI RẠP
                          </span>

                          <div className="p-3.5 bg-white rounded-2xl shadow-2xl border-2 border-[#D4AF37]">
                            <QRCodeCanvas
                              value={ticket.qrToken || ticket.qrData || `TICKET:${ticket.id}:${ticket.movie?.id}`}
                              size={160}
                              level="H"
                              includeMargin={false}
                            />
                          </div>

                          <div className="flex flex-col items-center gap-1 text-xs text-[#9CA3AF]">
                            <span className="font-mono text-[#f2ca50] font-bold tracking-wider">
                              FAST-TRACK ADMISSION
                            </span>
                            <span>Quét tại cổng soát vé trước giờ chiếu 10 phút</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-500 py-8">
                          <span className="material-symbols-outlined text-4xl">block</span>
                          <span className="text-xs">Mã vé đã hết hạn hoặc bị hủy</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </>
    )}
      </div>
    </div>
  );
};

export default MyTickets;