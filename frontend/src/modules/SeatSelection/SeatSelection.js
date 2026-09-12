import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import styles from './SeatSelection.module.css';

const SeatSelection = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const movie = location.state?.movie || null;
  const showtime = location.state?.showtime || null;

  // Clear any old stale session storage so entering new showtimes always starts with 0 seats
  try {
    if (!location.state?.fromLogin) {
      sessionStorage.removeItem('pending_booking_context');
    }
  } catch (e) { }

  // Always start with empty seats [] unless explicitly returning from Login for the same showtime
  const [selectedSeats, setSelectedSeats] = useState(() => {
    if (location.state?.fromLogin && Array.isArray(location.state?.savedSeats)) {
      return location.state.savedSeats;
    }
    return [];
  });
  const [seatMap, setSeatMap] = useState([]);
  const [loading, setLoading] = useState(true);

  // 120s countdown timer
  const [timeLeft, setTimeLeft] = useState(120);
  const [showContentionToast, setShowContentionToast] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 2800);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) return 120;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Mock seat map data (fallback)
  const generateSeatMap = () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seatsPerRow = 12;
    const map = [];

    rows.forEach(row => {
      const rowSeats = [];
      for (let i = 1; i <= seatsPerRow; i++) {
        const isVip = ['D', 'E', 'F'].includes(row);
        rowSeats.push({
          id: `${row}${i}`,
          row: row,
          number: i,
          displayName: `${row}${i}`,
          status: 'available',
          type: isVip ? 'vip' : 'regular',
          price: isVip ? 110000 : 90000
        });
      }
      map.push(rowSeats);
    });

    return map;
  };

  const mapBackendSeatMap = (backend) => {
    if (!backend || !Array.isArray(backend.seatMap)) return [];
    return backend.seatMap.map(r => r.seats.map(s => ({
      id: s.id,
      row: s.row,
      number: s.number,
      displayName: `${s.row}${s.number}`,
      status: s.status,
      type: s.type,
      price: s.price
    })));
  };

  useEffect(() => {
    if (!movie || !showtime) {
      navigate('/');
      return;
    }

    let active = true;
    const showtimeId = showtime?.id || id;

    const fetchSeatMap = async (isInitial = false) => {
      try {
        if (isInitial) setLoading(true);
        const { bookingAPI } = await import('../../services/api');
        const response = await bookingAPI.getSeatMap(showtimeId);

        if (!active) return;

        const seatData = response.data || response;
        if (seatData && seatData.seatMap) {
          const newMap = mapBackendSeatMap(seatData);
          setSeatMap(newMap);

          // Auto-remove any selected seats that are now occupied or locked by someone else
          setSelectedSeats(prev => {
            const stillAvailable = prev.filter(selectedSeat => {
              for (const row of newMap) {
                const found = row.find(s => s.id === selectedSeat.id);
                if (found && (found.status === 'occupied' || found.status === 'locked')) {
                  return false;
                }
              }
              return true;
            });
            if (stillAvailable.length !== prev.length) {
              return stillAvailable;
            }
            return prev;
          });
        } else {
          if (isInitial) setSeatMap(generateSeatMap());
        }
      } catch (err) {
        console.error('Error fetching seat map', err);
        if (isInitial) setSeatMap(generateSeatMap());
      } finally {
        if (isInitial && active) setLoading(false);
      }
    };

    // Initial fetch
    fetchSeatMap(true);

    // Poll every 3 seconds for real-time updates
    const interval = setInterval(() => {
      fetchSeatMap(false);
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [movie, showtime, navigate, id]);

  const handleSeatClick = (seat) => {
    if (seat.status === 'occupied' || seat.status === 'sold') {
      showError(`Ghế ${seat.displayName || seat.id} đã được đặt bởi khách hàng khác.`);
      return;
    }
    if (seat.status === 'locked') {
      showError(`Ghế ${seat.displayName || seat.id} đang được giữ chỗ trong giao dịch khác (Redis Lock).`);
      return;
    }

    const seatId = seat.id;
    const isSelected = selectedSeats.some(s => s.id === seatId);

    if (isSelected) {
      setSelectedSeats(selectedSeats.filter(s => s.id !== seatId));
    } else {
      if (selectedSeats.length >= 6) {
        showError('Quý khách chỉ có thể đặt tối đa 6 ghế trong 1 lần giao dịch.');
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const getTotalPrice = () => {
    return selectedSeats.reduce((total, seat) => total + (seat.price || 0), 0);
  };

  const handleContinue = () => {
    if (selectedSeats.length === 0) {
      showError('Vui lòng chọn ít nhất 1 ghế trước khi thanh toán.');
      return;
    }

    (async () => {
      try {
        // prepare payload
        const invalid = selectedSeats.some(s => typeof s.id !== 'number' && !/^[0-9]+$/.test(String(s.id)));
        if (invalid) {
          showError('Có ghế đang ở chế độ thử nghiệm. Vui lòng làm mới trang để tải lại sơ đồ ghế thực tế.');
          return;
        }

        // Get current user if logged in
        let currentUserId = null;
        try {
          const { default: authService } = await import('../../services/authService');
          const user = await authService.getCurrentUser();
          currentUserId = user?.id || user?.user_id || null;
        } catch (e) {
          console.warn('Could not get current user:', e);
        }

        const payload = {
          user_id: currentUserId,
          showtime_id: showtime?.id,
          seat_ids: selectedSeats.map(s => Number(s.id))
        };

        // Validate payload
        if (!currentUserId) {
          try {
            sessionStorage.setItem('pending_booking_context', JSON.stringify({
              movie,
              showtime,
              selectedSeats
            }));
          } catch (e) { }

          const currentPath = location.pathname + location.search;
          showError('Vui lòng đăng nhập để hoàn tất đặt vé. Hệ thống đã lưu lại ghế bạn chọn.');
          setTimeout(() => {
            navigate(`/login?redirect=${encodeURIComponent(currentPath)}`, {
              state: { from: currentPath, movie, showtime, fromLogin: true, savedSeats: selectedSeats }
            });
          }, 1200);
          return;
        }

        if (!showtime?.id) {
          showError('Thông tin suất chiếu không hợp lệ');
          return;
        }

        // Lock seats via backend API
        const { bookingAPI } = await import('../../services/api');
        const res = await bookingAPI.lockSeats(payload);
        const responseData = res.data || res;

        if (responseData && responseData.success && responseData.booking) {
          const booking = responseData.booking;

          try { sessionStorage.removeItem('pending_booking_context'); } catch (e) { }

          navigate('/payment', {
            state: {
              movie,
              showtime,
              selectedSeats,
              totalPrice: getTotalPrice(),
              bookingId: booking.id || booking.booking_id || booking.uuid,
              bookingCode: booking.booking_code || booking.bookingCode || null,
              expireAt: booking.expire_at || booking.expires_at || null
            }
          });
        } else if (responseData && responseData.success === false && responseData.conflicts) {
          const conflictNames = responseData.conflicts.map(cid => {
            for (const row of seatMap) {
              const found = row.find(s => Number(s.id) === Number(cid));
              if (found) return found.displayName;
            }
            return `Mã ghế ${cid}`;
          });

          showError(`Ghế đã bị người khác chọn/khóa chờ thanh toán: ${conflictNames.join(', ')}. Vui lòng chọn ghế khác.`);

          // refresh seat map
          const showtimeId = showtime?.id || id;
          const freshRes = await bookingAPI.getSeatMap(showtimeId);
          const freshData = freshRes.data || freshRes;
          if (freshData && freshData.seatMap) {
            setSeatMap(mapBackendSeatMap(freshData));
          }
        } else {
          showError('Phản hồi không mong đợi từ máy chủ. Vui lòng thử lại.');
        }
      } catch (err) {
        console.error('Error locking seats', err);
        const responseData = err.response?.data;
        if (responseData && responseData.success === false && responseData.conflicts) {
          const conflictNames = responseData.conflicts.map(cid => {
            for (const row of seatMap) {
              const found = row.find(s => Number(s.id) === Number(cid));
              if (found) return found.displayName;
            }
            return `Mã ghế ${cid}`;
          });

          showError(`Ghế đã bị người khác chọn/khóa: ${conflictNames.join(', ')}. Vui lòng chọn ghế khác.`);

          try {
            const showtimeId = showtime?.id || id;
            const { bookingAPI } = await import('../../services/api');
            const freshRes = await bookingAPI.getSeatMap(showtimeId);
            const freshData = freshRes.data || freshRes;
            if (freshData && freshData.seatMap) {
              setSeatMap(mapBackendSeatMap(freshData));
            }
          } catch (refreshErr) { }
        } else {
          showError('Không thể giữ ghế lúc này, vui lòng thử lại sau');
        }
      }
    })();
  };

  const renderSeatButton = (seat) => {
    const isSelected = selectedSeats.some(s => s.id === seat.id);
    const isSold = seat.status === 'occupied' || seat.status === 'sold';
    const isLocked = seat.status === 'locked';
    const isVip = seat.type === 'vip';

    let btnClasses = 'w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all relative select-none ';

    if (isSelected) {
      btnClasses += 'bg-gradient-to-r from-[#ffe088] to-[#d4af37] text-[#241a00] border-2 border-white shadow-[0_0_12px_rgba(242,202,80,0.8)] scale-110 z-10 cursor-pointer';
    } else if (isSold) {
      btnClasses += 'bg-[#2a2e39] text-[#6b7280] border border-white/5 opacity-40 cursor-not-allowed';
    } else if (isLocked) {
      btnClasses += 'bg-[#554300]/90 text-[#f2ca50] border border-[#f2ca50] cursor-not-allowed';
    } else if (isVip) {
      btnClasses += 'bg-[#1f1f23] text-[#ffe088] border-2 border-[#f2ca50]/70 hover:border-[#ffe088] hover:scale-105 hover:bg-[#f2ca50]/15 cursor-pointer';
    } else {
      btnClasses += 'bg-[#292a2d] text-[#e3e2e6] border border-[#9ca3af]/40 hover:border-[#f2ca50] hover:scale-105 cursor-pointer';
    }

    return (
      <button
        key={seat.id}
        onClick={() => handleSeatClick(seat)}
        disabled={isSold || isLocked}
        className={btnClasses}
        title={`Ghế ${seat.displayName || seat.id} • ${isVip ? 'VIP' : 'TIÊU CHUẨN'} • ${seat.price ? seat.price.toLocaleString('vi-VN') + 'đ' : ''}`}
      >
        {isSold ? (
          <span>✕</span>
        ) : isLocked ? (
          <span className="material-symbols-outlined text-[13px] text-[#f2ca50]">lock</span>
        ) : isSelected ? (
          <span>✓</span>
        ) : isVip ? (
          <span className="text-[12px] leading-none">👑</span>
        ) : (
          <span>{seat.number}</span>
        )}
      </button>
    );
  };

  const renderSeatRow = (rowSeats, rowIndex) => {
    const rowLetter = rowSeats[0]?.row || 'A';
    const isVipRow = rowSeats.some(s => s.type === 'vip');
    const N = rowSeats.length;

    // Split into 3 columns: Left (1-4), Center VIP Sweet Spot (5-8), Right (9-12)
    let L = 4;
    let R = 4;
    if (N > 12) {
      L = Math.floor(N / 3);
      R = L;
    } else if (N < 12) {
      L = Math.floor(N / 3) || 1;
      R = Math.floor(N / 3) || 1;
    }
    const M = N - L - R;

    const leftSeats = rowSeats.slice(0, L);
    const centerSeats = rowSeats.slice(L, L + M);
    const rightSeats = rowSeats.slice(L + M, N);

    return (
      <div key={rowIndex} className="flex items-center justify-between gap-2 w-full">
        {/* Row Letter Left */}
        <span className={`w-6 text-center font-bold text-xs ${isVipRow ? 'text-[#f2ca50]' : 'text-[#9ca3af]'}`}>
          {rowLetter}
        </span>

        {/* Left Block */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {leftSeats.map(seat => renderSeatButton(seat))}
        </div>

        {/* Aisle 1 */}
        <div className="w-3 sm:w-6" />

        {/* Center Block (Core Sweet Spot) */}
        <div className={`flex items-center gap-1.5 sm:gap-2 px-2 py-1 rounded-xl transition-all ${isVipRow ? 'bg-[#f2ca50]/5 border border-[#f2ca50]/20 shadow-[0_0_15px_rgba(242,202,80,0.05)]' : ''
          }`}>
          {centerSeats.map(seat => renderSeatButton(seat))}
        </div>

        {/* Aisle 2 */}
        <div className="w-3 sm:w-6" />

        {/* Right Block */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {rightSeats.map(seat => renderSeatButton(seat))}
        </div>

        {/* Row Letter Right */}
        <span className={`w-6 text-center font-bold text-xs ${isVipRow ? 'text-[#f2ca50]' : 'text-[#9ca3af]'}`}>
          {rowLetter}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121316] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin"></div>
        <p className="font-['Playfair_Display'] tracking-widest text-[#f2ca50] uppercase text-sm">
          Đang tải sơ đồ rạp chiếu...
        </p>
      </div>
    );
  }

  if (!movie || !showtime) {
    return (
      <div className="min-h-screen bg-[#121316] flex flex-col items-center justify-center text-white px-4">
        <h2 className="font-['Playfair_Display'] text-2xl font-bold text-[#f2ca50] mb-4">Thông tin suất chiếu không hợp lệ</h2>
        <button onClick={() => navigate('/')} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#08090C] font-bold text-sm uppercase">
          Về Trang Chủ
        </button>
      </div>
    );
  }

  // Calculate standard & VIP prices from real data for Legend
  const allSeats = seatMap.flat();
  const standardPrice = allSeats.find(s => s.type !== 'vip')?.price || 90000;
  const vipPrice = allSeats.find(s => s.type === 'vip')?.price || 110000;
  const hasLockedSeats = allSeats.some(s => s.status === 'locked');

  return (
    <div className="min-h-full bg-[#121316] text-[#e3e2e6] pt-4 pb-36 xl:pb-20">
      {/* Toast Warning for Redis Lock Contention */}
      {hasLockedSeats && showContentionToast && (
        <div className="bg-[#554300] border-b border-[#f2ca50]/50 px-4 py-2.5 flex items-center justify-between text-xs text-[#ffe088] shadow-lg animate-fade-in">
          <div className="max-w-6xl mx-auto flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f2ca50] text-[18px] shrink-0">warning</span>
            <span>
              <strong>Thông báo hệ thống:</strong> Đang có người dùng khác đang giữ chỗ trong phòng chiếu. Vui lòng hoàn tất chọn ghế trong vòng 120s để đảm bảo giữ ghế.
            </span>
          </div>
          <button onClick={() => setShowContentionToast(false)} className="hover:text-white cursor-pointer px-2">
            ✕
          </button>
        </div>
      )}

      {/* Floating Error Message Toast */}
      {errorMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-xl bg-red-950/90 border border-red-500 text-red-200 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="material-symbols-outlined text-red-400 text-[18px]">warning</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Header Info Bar */}
      <div className="sticky top-20 z-30 bg-[#181a20]/95 backdrop-blur-md border-b border-[#d4af37]/20 py-3 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Left: Back & Film info */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-[#12161f] border border-[#d4af37]/20 text-[#d0c5af] hover:text-[#f2ca50] hover:border-[#f2ca50] transition-all cursor-pointer"
              title="Quay lại"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
            <div className="flex items-center gap-3">
              {movie.poster && (
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-10 h-14 object-cover rounded-md border border-[#d4af37]/30 shadow"
                  referrerPolicy="no-referrer"
                />
              )}
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#ffffff] font-['Playfair_Display']">
                  {movie.title}
                </h3>
                <p className="text-xs text-[#9ca3af]">
                  {showtime.cinema || 'XEMPHIM Cinema'} • <span className="text-[#f2ca50] font-medium">{showtime.room || showtime.room_name || 'Phòng chiếu 03 - GOLD CLASS'}</span>
                </p>
                <p className="text-[11px] text-[#d0c5af]">
                  Suất chiếu: <strong className="text-[#ffe088]">{showtime.time}</strong> ({showtime.date || 'Hôm nay'})
                </p>
              </div>
            </div>
          </div>

          {/* Right: Timer & Security Badge */}
          <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-center">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#12161f] border border-[#d4af37]/30">
              <span className="material-symbols-outlined text-[18px] text-[#f2ca50] animate-pulse">schedule</span>
              <div className="text-right">
                <span className="text-[10px] uppercase text-[#9ca3af] block">Thời gian giữ ghế</span>
                <span className={`text-sm font-bold font-mono ${timeLeft < 30 ? 'text-red-400 animate-ping' : 'text-[#f2ca50]'}`}>
                  {formatTimer(timeLeft)}
                </span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-1.5 text-xs text-[#9ca3af]">
              <span className="material-symbols-outlined text-[16px] text-[#f2ca50]">verified_user</span>
              <span>Redis Lock 2.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area: 2 Columns on XL desktop (Seat Selection Hall + Booking Summary Card) */}
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 pt-8 flex flex-col xl:flex-row items-center xl:items-start justify-center gap-8">
        {/* Left Column: Screen, Legend, Seat Matrix Grid */}
        <div className="flex-1 w-full max-w-4xl flex flex-col items-center">
          {/* Curved Ambient Golden Screen Element (Stitch SVG Specification) */}
          <div className="w-full max-w-3xl mx-auto flex flex-col items-center mb-12 relative">
            <div className="w-full h-8 sm:h-12 relative flex justify-center items-start">
              <svg
                className="w-full h-full text-[#f2ca50]"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 1000 70"
              >
                <path
                  d="M 0 55 Q 500 -10 1000 55"
                  fill="transparent"
                  stroke="#f2ca50"
                  strokeLinecap="round"
                  strokeWidth="4"
                />
              </svg>
              <div className="absolute inset-0 bg-gradient-to-b from-[#f2ca50]/35 via-[#f2ca50]/15 to-transparent h-28 pointer-events-none blur-xl"></div>
            </div>

            {/* Screen Title & Subtitle */}
            <div className="flex items-center gap-3 text-[#9ca3af] text-xs uppercase tracking-widest mt-2">
              <span className="w-8 sm:w-12 h-[1px] bg-[rgba(212,175,55,0.3)]"></span>
              <span className="text-[#f2ca50] font-bold tracking-[0.25em] text-xs sm:text-sm">
                MÀN HÌNH CHIẾU LASER ULTRA-HD
              </span>
              <span className="w-8 sm:w-12 h-[1px] bg-[rgba(212,175,55,0.3)]"></span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-[#9ca3af] tracking-wider mt-1">
              Phòng chiếu đã cân chỉnh tiêu cự tối ưu tầm nhìn từ mọi dãy ghế
            </p>
          </div>

          {/* Seat Matrix Grid */}
          <div className="pt-6 overflow-x-auto pb-6 w-full flex justify-center">
            <div className="min-w-[640px] max-w-2xl mx-auto space-y-3">
              {seatMap.map((row, rowIndex) => renderSeatRow(row, rowIndex))}
            </div>
          </div>

          {/* Legend (Moved below the seat matrix) */}
          <div className="w-full max-w-3xl mt-4 mb-6 p-4 bg-[#181a20]/90 backdrop-blur-md rounded-2xl border border-[rgba(212,175,55,0.2)] shadow-xl flex flex-wrap items-center justify-center gap-4 sm:gap-7 text-xs text-[#9ca3af]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#292a2d] border border-[#9ca3af]/40" />
              <span>Ghế Thường ({standardPrice.toLocaleString('vi-VN')}đ)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#1f1f23] border-2 border-[#f2ca50] flex items-center justify-center text-[11px]">
                👑
              </div>
              <span className="text-[#ffe088] font-medium">Ghế VIP ({vipPrice.toLocaleString('vi-VN')}đ)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-r from-[#ffe088] to-[#d4af37] border border-[#ffe088] shadow-[0_0_10px_rgba(242,202,80,0.6)] flex items-center justify-center text-[11px] text-[#241a00] font-bold">
                ✓
              </div>
              <span className="text-[#f2ca50] font-bold">Đang Chọn</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#554300]/80 border border-[#f2ca50] flex items-center justify-center">
                <span className="material-symbols-outlined text-[13px] text-[#f2ca50]">lock</span>
              </div>
              <span>Đang Khóa (Redis)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[#2a2e39] border border-white/5 opacity-50 flex items-center justify-center text-[10px] text-white/40 font-bold">
                ✕
              </div>
              <span>Đã Bán</span>
            </div>
          </div>

          {/* VIP Zone Notice */}
          <div className="text-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#181a20] border border-[#f2ca50]/30 text-xs text-[#ffe088]">
              <span className="text-sm">👑</span>
              <span>Khu vực VIP được phục vụ đệm nhung công thái học & tầm nhìn tiêu chuẩn điện ảnh</span>
            </div>
          </div>
        </div>

        {/* Right Column: Bảng Tóm Tắt Đặt Vé (Booking Summary Card on Desktop) */}
        <div className="hidden xl:block w-[360px] shrink-0 sticky top-36">
          <div className="bg-[#181a20]/95 backdrop-blur-xl border border-[rgba(212,175,55,0.3)] rounded-2xl p-6 shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex flex-col">
            <h3 className="font-['Playfair_Display'] text-2xl font-bold text-[#f2ca50] text-center mb-5 pb-3 border-b border-[rgba(212,175,55,0.2)]">
              Thông tin đặt vé
            </h3>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-start gap-3 py-1.5 border-b border-white/5">
                <span className="text-[#9CA3AF] shrink-0">Phim:</span>
                <span className="font-bold text-white text-right line-clamp-2">{movie?.title}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-[#9CA3AF]">Ngày:</span>
                <span className="font-medium text-[#e3e2e6]">{showtime?.date || 'Hôm nay'}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-[#9CA3AF]">Giờ:</span>
                <span className="font-bold text-[#ffe088]">{showtime?.time}</span>
              </div>

              <div className="flex justify-between items-start gap-2 py-1.5 border-b border-white/5">
                <span className="text-[#9CA3AF] shrink-0">Rạp:</span>
                <span className="font-medium text-[#e3e2e6] text-right">{showtime?.cinema || 'XEMPHIM Cinema'}</span>
              </div>

              <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                <span className="text-[#9CA3AF] flex items-center gap-1.5">
                  Ghế đã chọn:
                </span>
                <span className="font-bold text-white text-base">
                  {selectedSeats.length}
                </span>
              </div>

              {/* Selected Seats Badges */}
              {selectedSeats.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 justify-end pt-1 max-h-28 overflow-y-auto">
                  {selectedSeats.map(s => (
                    <span
                      key={s.id}
                      className="px-2 py-0.5 rounded bg-[#f2ca50]/15 border border-[#f2ca50]/40 text-[#ffe088] text-xs font-bold flex items-center gap-1"
                    >
                      <span>{s.displayName || s.id}</span>
                      {s.type === 'vip' && <span>👑</span>}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#9ca3af] italic py-1 text-center bg-white/5 rounded-lg">
                  Chưa chọn ghế nào
                </p>
              )}
            </div>

            {/* Total & Checkout */}
            <div className="border-t border-[rgba(212,175,55,0.25)] my-5 pt-4">
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-xs uppercase tracking-wider text-[#9CA3AF]">Tổng thanh toán:</span>
                <span className="font-['Playfair_Display'] text-xl font-extrabold text-[#f2ca50]">
                  {getTotalPrice().toLocaleString('vi-VN')} VNĐ
                </span>
              </div>

              <button
                onClick={handleContinue}
                disabled={selectedSeats.length === 0}
                className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(242,202,80,0.35)] transition-all ${selectedSeats.length > 0
                  ? 'bg-gradient-to-r from-[#ffe088] via-[#f2ca50] to-[#d4af37] text-[#241a00] hover:brightness-105 active:scale-95 cursor-pointer'
                  : 'bg-[#292a2d] text-[#9ca3af] cursor-not-allowed'
                  }`}
              >
                <span>TIẾP TỤC THANH TOÁN</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Booking Summary Modal */}
      {showSummaryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181a20] border border-[#f2ca50]/40 rounded-2xl p-6 shadow-2xl max-w-md w-full animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.2)] pb-3 mb-4">
              <h3 className="font-['Playfair_Display'] text-xl font-bold text-[#f2ca50]">
                Thông tin đặt vé
              </h3>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between items-start gap-2 py-1 border-b border-white/5">
                <span className="text-[#9CA3AF]">Phim:</span>
                <span className="font-bold text-white text-right">{movie?.title}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-[#9CA3AF]">Ngày:</span>
                <span className="font-medium text-white">{showtime?.date || 'Hôm nay'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-[#9CA3AF]">Giờ:</span>
                <span className="font-bold text-[#ffe088]">{showtime?.time}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-[#9CA3AF]">Rạp:</span>
                <span className="font-medium text-white">{showtime?.cinema || 'XEMPHIM Cinema'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-[#9CA3AF]">Phòng chiếu:</span>
                <span className="font-medium text-[#f2ca50]">{showtime?.room || 'Phòng chiếu 03 - GOLD CLASS'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-white/5">
                <span className="text-[#9CA3AF]">Ghế đã chọn:</span>
                <span className="font-bold text-white">{selectedSeats.length}</span>
              </div>

              {selectedSeats.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-end pt-1">
                  {selectedSeats.map(s => (
                    <span key={s.id} className="px-2 py-0.5 rounded bg-[#f2ca50]/20 text-[#ffe088] text-xs font-bold">
                      {s.displayName || s.id} {s.type === 'vip' ? '👑' : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-[rgba(212,175,55,0.25)] mt-4 pt-4">
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-xs uppercase text-[#9CA3AF]">Tổng thanh toán:</span>
                <span className="font-['Playfair_Display'] text-xl font-extrabold text-[#f2ca50]">
                  {getTotalPrice().toLocaleString('vi-VN')} VNĐ
                </span>
              </div>

              <button
                onClick={() => {
                  setShowSummaryModal(false);
                  handleContinue();
                }}
                disabled={selectedSeats.length === 0}
                className="w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider bg-gradient-to-r from-[#ffe088] to-[#d4af37] text-[#241a00] hover:brightness-105 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>TIẾP TỤC THANH TOÁN</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Drawer for Checkout (Only on Mobile/Tablet when side card is hidden) */}
      <div className="xl:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#181a20]/95 backdrop-blur-xl border-t border-[#f2ca50]/40 shadow-[0_-10px_40px_rgba(0,0,0,0.9)] py-4 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Selected Seat Summary */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full sm:w-auto">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider text-[#9ca3af]">
                  Ghế Đã Chọn ({selectedSeats.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(true)}
                  className="xl:hidden text-[11px] text-[#f2ca50] hover:underline flex items-center gap-0.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[13px]">info</span>
                  <span>Xem tóm tắt</span>
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {selectedSeats.length === 0 ? (
                  <span className="text-xs text-[#9ca3af] italic">Chưa chọn ghế nào</span>
                ) : (
                  selectedSeats.map((s) => (
                    <span
                      key={s.id}
                      className="px-2.5 py-0.5 rounded-md bg-[#f2ca50]/20 border border-[#f2ca50] text-xs font-bold text-[#ffe088]"
                    >
                      {s.displayName || s.id} {s.type === 'vip' ? '👑' : ''}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="sm:border-l sm:border-[#d4af37]/20 sm:pl-4">
              <span className="text-[11px] uppercase tracking-wider text-[#9ca3af] block">
                Tổng Tiền Thanh Toán
              </span>
              <span className="font-['Playfair_Display'] text-xl sm:text-2xl font-extrabold text-[#f2ca50]">
                {getTotalPrice().toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
          </div>

          {/* Checkout CTA */}
          <button
            onClick={handleContinue}
            disabled={selectedSeats.length === 0}
            className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(242,202,80,0.35)] transition-all ${selectedSeats.length > 0
              ? 'bg-gradient-to-r from-[#ffe088] via-[#f2ca50] to-[#d4af37] text-[#241a00] hover:brightness-105 active:scale-95 cursor-pointer'
              : 'bg-[#292a2d] text-[#9ca3af] cursor-not-allowed'
              }`}
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span>Tiến Hành Giữ Ghế ({getTotalPrice().toLocaleString('vi-VN')}đ)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;