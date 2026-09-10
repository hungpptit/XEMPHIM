import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSpinner, FaSyncAlt } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import styles from './Payment.module.css';
import Popup from '../../components/Popup'; // Import the custom Popup component
// Module-level variable to prevent React Strict Mode double-render from canceling booking
let activeBookingId = null;

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Try to load state from location.state, fallback to sessionStorage
  const [paymentData] = useState(() => {
    if (location.state && location.state.bookingId) {
      try {
        sessionStorage.setItem('current_payment', JSON.stringify(location.state));
      } catch (e) {
        console.error('Failed to save payment state to sessionStorage:', e);
      }
      return location.state;
    } else {
      try {
        const saved = sessionStorage.getItem('current_payment');
        if (saved) {
          return JSON.parse(saved);
        }
      } catch (e) {
        console.error('Failed to load payment state from sessionStorage:', e);
      }
    }
    return {};
  });

  const { movie, showtime, selectedSeats, totalPrice, bookingId, bookingCode, expireAt } = paymentData;

  const [qrUrl, setQrUrl] = useState(null);
  const [expiresAt, setExpiresAt] = useState(() => {
    if (paymentData.expireAt) return new Date(paymentData.expireAt);
    return new Date(Date.now() + 120 * 1000);
  });
  const [lockSecondsLeft, setLockSecondsLeft] = useState(() => {
    const target = paymentData.expireAt ? new Date(paymentData.expireAt) : new Date(Date.now() + 120 * 1000);
    return Math.max(0, Math.floor((target - new Date()) / 1000));
  });
  const [qrCreatedAt, setQrCreatedAt] = useState(null);  // thời điểm tạo QR gần nhất (để đếm 60s)
  const [qrSecondsLeft, setQrSecondsLeft] = useState(60); // đếm lùi 60s cho mỗi QR
  const [qrFaded, setQrFaded] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [polling, setPolling] = useState(false);
  const [showPopup, setShowPopup] = useState(false); // State to manage popup visibility
  const [popupActions, setPopupActions] = useState({}); // State to manage popup actions
  const pollRef = useRef(null);
  const isConfirmedRef = useRef(false);
  const cancelRequestedRef = useRef(false);

  const cancelPendingBooking = React.useCallback(async () => {
    if (!bookingId || isConfirmedRef.current || cancelRequestedRef.current) {
      return;
    }

    cancelRequestedRef.current = true;
    try {
      sessionStorage.removeItem('current_payment');
    } catch (e) {}

    try {
      const { bookingAPI } = await import('../../services/api');
      await bookingAPI.cancelBooking(bookingId);
    } catch (err) {
      cancelRequestedRef.current = false;
      throw err;
    }
  }, [bookingId]);

  const formatTime = (totalSeconds) => {
    const safeSec = Math.max(0, Number(totalSeconds) || 0);
    const mins = Math.floor(safeSec / 60);
    const secs = safeSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!movie || !showtime || !selectedSeats || selectedSeats.length === 0 || !bookingId) {
      console.warn('Missing payment data:', { movie, showtime, selectedSeats, bookingId });
      navigate('/');
    }
  }, [movie, showtime, selectedSeats, bookingId, navigate]);

  // Timer đếm ngược thời gian khóa ghế (120s) theo thời gian thực
  useEffect(() => {
    if (!expiresAt) return;
    
    const updateCountdown = () => {
      const s = Math.max(0, Math.floor((new Date(expiresAt) - new Date()) / 1000));
      setLockSecondsLeft(s);
      return s;
    };
    updateCountdown();

    const iv = setInterval(() => {
      const s = updateCountdown();
      if (s <= 0) {
        clearInterval(iv);
        if (!isConfirmedRef.current) {
          // Dừng polling
          if (pollRef.current) clearInterval(pollRef.current);
          // Cancel booking nếu chưa confirmed
          cancelPendingBooking().catch(err => {
            console.warn('Failed to cancel expired booking:', err);
          }).finally(() => {
            try { sessionStorage.removeItem('current_payment'); } catch (e) {}
            alert('Thời gian giữ chỗ 120s đã hết hạn. Vui lòng chọn lại ghế.');
            navigate(-1); // Quay về trang chọn ghế
          });
        }
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [expiresAt, bookingId, navigate, cancelPendingBooking]);

  // Timer QR 60s — đếm lùi cho từng lần tạo QR, mờ khi hết 60s
  useEffect(() => {
    if (!qrCreatedAt) return;

    setQrFaded(false);
    setQrSecondsLeft(60);

    const iv = setInterval(() => {
      const elapsed = Math.floor((Date.now() - qrCreatedAt) / 1000);
      const remaining = Math.max(0, 60 - elapsed);
      setQrSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(iv);
        setQrFaded(true);
      }
    }, 500);

    return () => clearInterval(iv);
  }, [qrCreatedAt]);

  useEffect(() => {
    if (!polling || !bookingId) return;
    const startPolling = () => {
      pollRef.current = setInterval(async () => {
        try {
          const { bookingAPI } = await import('../../services/api');
          const res = await bookingAPI.getBookingStatus(bookingId);
          const status = res.data?.status || res.status || (res.data && res.data.status) || null;
          if (status === 'confirmed') {
            isConfirmedRef.current = true;
            try {
              sessionStorage.removeItem('current_payment');
            } catch (e) {}
            clearInterval(pollRef.current);
            setPolling(false);

            setShowPopup(true);
            const timeoutId = setTimeout(() => {
              setShowPopup(false);
              navigate('/my-tickets');
            }, 10000);

            const handleConfirm = () => {
              clearTimeout(timeoutId);
              setShowPopup(false);
              navigate('/my-tickets');
            };

            setPopupActions({ handleConfirm });
          } else if (status === 'expired' || status === 'cancelled') {
            clearInterval(pollRef.current);
            setPolling(false);
            try { sessionStorage.removeItem('current_payment'); } catch (e) {}
            navigate(-1); // Quay về chọn ghế, không cần alert
          }
        } catch (e) {
          // ignore transient errors
        }
      }, 2000);
    };
    startPolling();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [polling, bookingId, navigate]);

  const createQr = async (isRefresh = false) => {
    if (!bookingId) return;
    setLoadingQr(true);
    try {
      const { bookingAPI } = await import('../../services/api');
      const res = await bookingAPI.createZaloPayQR(bookingId);
      const data = res.data || res;
      setQrUrl(data.qr_url || data.qrUrl || data.order_url || null);

      // Chỉ set expiresAt (tổng 3 phút) lần đầu, không reset khi refresh
      if (!isRefresh) {
        if (data.expires_at) {
          setExpiresAt(new Date(data.expires_at));
        } else if (data.expires_in) {
          setExpiresAt(new Date(Date.now() + Number(data.expires_in) * 1000));
        } else {
          setExpiresAt(new Date(Date.now() + 180 * 1000));
        }
      }

      // Luôn reset timer QR 60s khi tạo QR mới
      setQrCreatedAt(Date.now());
      setPolling(true);
    } catch (err) {
      console.error('Error creating payment QR:', err);
      alert('Không thể tạo mã QR. Vui lòng thử lại sau.');
    } finally {
      setLoadingQr(false);
    }
  };

  const handleRefresh = () => {
    setPolling(false);
    if (pollRef.current) clearInterval(pollRef.current);
    createQr(true); // isRefresh = true → không reset tổng 3 phút
  };

  const handleBack = async () => {
    if (bookingId && !isConfirmedRef.current) {
      try {
        await cancelPendingBooking();
      } catch (err) {
        console.error('Failed to cancel booking on back click:', err);
      }
    }
    navigate(-1);
  };

  // ✅ GIẢI PHÁP ĐÚNG cho browser back button:
  // useEffect cleanup chạy khi component unmount theo BẤT KỲ cách nào.
  // Không dùng popstate vì React Router intercept navigation trước,
  // có thể cleanup listener đã chạy trước khi popstate handler kịp fire.
  useEffect(() => {
    activeBookingId = bookingId;
    return () => {
      // Set to null to indicate this instance is unmounting
      if (activeBookingId === bookingId) {
        activeBookingId = null;
      }
    };
  }, [bookingId]);

  useEffect(() => {
    return () => {
      // Chạy khi unmount: browser back, navigate(), timer hết hạn, v.v.
      // Không chạy khi: đã confirm (isConfirmedRef=true) hoặc đã cancel rồi (cancelRequestedRef=true)
      if (!isConfirmedRef.current && !cancelRequestedRef.current && bookingId) {
        // Defer execution to avoid canceling on React Strict Mode double-mount/unmount
        setTimeout(() => {
          if (activeBookingId !== bookingId && !isConfirmedRef.current) {
            cancelRequestedRef.current = true;
            try { sessionStorage.removeItem('current_payment'); } catch (e) {}
            // fetch + keepalive: request tồn tại sau khi component unmount
            fetch(`http://localhost:8080/api/bookings/${bookingId}/cancel`, {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json'
              },
              keepalive: true
            }).catch(() => {});
          }
        }, 100);
      }
    };
  }, [bookingId]);

  useEffect(() => {
    createQr();

    // beforeunload: handle F5, đóng tab, navigate ra ngoài SPA (full page unload)
    // Đây là trường hợp KHÁC với browser back trong SPA
    const handleBeforeUnload = () => {
      if (bookingId && !isConfirmedRef.current && !cancelRequestedRef.current) {
        cancelRequestedRef.current = true;
        fetch(`http://localhost:8080/api/bookings/${bookingId}/cancel`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          keepalive: true
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  if (!movie || !showtime || !selectedSeats || selectedSeats.length === 0 || !bookingId) {
    return (
      <div className={styles.payment}>
        <div className="container">
          <div className={styles.loadingContainer}>
            <h2>Thông tin không hợp lệ</h2>
            <button onClick={() => navigate('/')} className="btn">Về trang chủ</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#121316] min-h-screen text-[#e3e2e6] pt-20 pb-24">
      <div className="relative w-full max-w-[1360px] mx-auto px-4 md:px-8 py-8">
        {/* Ambient Atmospheric Glows */}
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#f2ca50]/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#B8860B]/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

        {/* Stepper Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-[rgba(212,175,55,0.15)]">
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBack}
              className="flex items-center gap-1.5 text-[#9CA3AF] hover:text-[#f2ca50] transition-colors text-xs uppercase font-bold tracking-widest"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Chọn Ghế</span>
            </button>
            <span className="text-gray-600">/</span>
            <span className="text-xs text-[#f2ca50] font-bold uppercase tracking-widest">
              Giao Dịch Bảo Mật VIP
            </span>
          </div>

          {/* Live Seat Lock Countdown & QR Expiration */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap self-start sm:self-auto">
            <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-all ${
              lockSecondsLeft <= 30
                ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 animate-pulse'
                : 'bg-[#1b1b1f] border-[rgba(212,175,55,0.3)] text-gray-300'
            }`}>
              <span className={`material-symbols-outlined text-[18px] ${lockSecondsLeft <= 30 ? 'text-rose-400' : 'text-[#f2ca50] animate-pulse'}`}>
                hourglass_top
              </span>
              <span className="text-xs text-[#9CA3AF] uppercase tracking-wider">Giữ chỗ:</span>
              <span className={`font-mono text-sm font-bold tracking-wider ${lockSecondsLeft <= 30 ? 'text-rose-400 font-extrabold' : 'text-[#f2ca50]'}`}>
                {formatTime(lockSecondsLeft)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b1b1f] border border-[rgba(212,175,55,0.2)] rounded-full text-xs">
              <span className="material-symbols-outlined text-[#FF8C00] text-[16px]">timer</span>
              <span className="text-[#9CA3AF] uppercase tracking-wider">Mã QR:</span>
              <span className={`font-mono font-bold ${qrSecondsLeft <= 10 ? 'text-rose-400' : 'text-[#f2ca50]'}`}>
                {qrSecondsLeft}s
              </span>
            </div>
          </div>
        </div>

        {/* Page Headline */}
        <div className="flex flex-col mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#f2ca50] text-sm">✦</span>
            <span className="text-xs font-mono text-[#d5c78e] tracking-widest uppercase font-bold">
              Cổng Thanh Toán Trực Tuyến
            </span>
          </div>
          <h1 className="font-['Playfair_Display'] text-2xl sm:text-3xl lg:text-4xl text-white font-bold tracking-wide">
            THANH TOÁN ĐƠN ĐẶT VÉ - XEMPHIM VIP
          </h1>
          <p className="text-xs sm:text-sm text-[#9CA3AF] mt-1">
            Đặc quyền phòng chiếu thượng hạng. Quét mã ZaloPay / VietQR an toàn bảo mật cấp ngân hàng.
          </p>
        </div>

        {/* 2-Column Luxury Layout (60% Left / 40% Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Boarding Pass Dossier (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-[#12161F] rounded-2xl p-6 sm:p-8 border border-[rgba(212,175,55,0.25)] shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#f2ca50]/5 rounded-bl-full pointer-events-none"></div>

              {/* Movie Summary Header */}
              <div className="flex flex-col sm:flex-row gap-6 pb-6 border-b border-gray-800">
                <div className="w-24 sm:w-28 aspect-[2/3] flex-shrink-0 rounded-xl overflow-hidden shadow-xl bg-[#0d0e11] border border-[rgba(212,175,55,0.2)]">
                  <img 
                    src={movie?.poster} 
                    alt={movie?.title} 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div className="flex flex-col justify-between flex-grow">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] text-[#F3C644] tracking-widest uppercase bg-[#1b1b1f] px-2 py-0.5 rounded border border-[#F3C644]/30">
                        Phim Chiếu Rạp VIP
                      </span>
                      <span className="font-mono text-xs text-[#9CA3AF] tracking-widest">
                        MÃ: BOOK-{bookingId}-{bookingCode ? bookingCode.substring(0, 4) : 'VIP'}
                      </span>
                    </div>
                    <h2 className="font-['Playfair_Display'] text-xl sm:text-2xl text-white font-bold mt-2">
                      {movie?.title}
                    </h2>
                    <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mt-1">
                      <span>{movie?.genres?.join(', ') || 'Điện ảnh đỉnh cao'}</span>
                      <span>•</span>
                      <span>{movie?.duration || 120} phút</span>
                      <span>•</span>
                      <span className="text-[#f2ca50] font-bold">T16</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-800/60">
                    <span className="material-symbols-outlined text-[#f2ca50] text-[18px]">workspace_premium</span>
                    <span className="text-xs text-[#d5c78e]">Phục vụ sảnh VIP & hướng dẫn viên đón tiếp tại rạp</span>
                  </div>
                </div>
              </div>

              {/* Detailed Ledger Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
                <div className="flex flex-col">
                  <span className="text-xs text-[#9CA3AF] uppercase">Cụm Rạp & Phòng Chiếu</span>
                  <span className="text-sm font-semibold text-white mt-1">{showtime?.cinema}</span>
                  <span className="text-xs text-[#d5c78e]">Phòng Chiếu 01 (VIP Suite)</span>
                </div>

                <div className="flex flex-col">
                  <span className="text-xs text-[#9CA3AF] uppercase">Suất Chiếu</span>
                  <span className="text-sm font-semibold text-white mt-1">{showtime?.time}</span>
                  <span className="text-xs text-[#d5c78e]">Ngày {showtime?.date}</span>
                </div>

                <div className="flex flex-col sm:col-span-2 pt-2 border-t border-gray-800/80">
                  <span className="text-xs text-[#9CA3AF] uppercase">Vị Trí Ghế Được Bảo Lưu</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedSeats?.map(seat => (
                      <span 
                        key={seat.id}
                        className="px-3 py-1 rounded-lg bg-[#1b1b1f] border border-[rgba(212,175,55,0.3)] text-[#f2ca50] font-bold text-sm flex items-center gap-1"
                      >
                        {seat.displayName || `${seat.row}${seat.number}`} {seat.type === 'vip' ? '👑' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Perforation Divider */}
              <div className="relative my-4 flex items-center justify-between">
                <div className="absolute -left-10 w-6 h-6 rounded-full bg-[#121316]"></div>
                <div className="w-full border-t border-dashed border-[rgba(212,175,55,0.3)] mx-2"></div>
                <div className="absolute -right-10 w-6 h-6 rounded-full bg-[#121316]"></div>
              </div>

              {/* Total Amount Footer */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs text-[#9CA3AF] uppercase block">Tổng Số Tiền Cần Thanh Toán</span>
                  <span className="font-['Playfair_Display'] text-2xl sm:text-3xl font-extrabold text-[#f2ca50]">
                    {totalPrice?.toLocaleString()} VNĐ
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-300 ${
                  lockSecondsLeft <= 30
                    ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse'
                    : lockSecondsLeft <= 60
                    ? 'bg-amber-950/60 border-amber-500/40 text-amber-400'
                    : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-400'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    lockSecondsLeft <= 30 ? 'bg-rose-400 animate-ping' : 'bg-emerald-400 animate-ping'
                  }`}></span>
                  <span>Đã Khóa Chỗ ({formatTime(lockSecondsLeft)})</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: ZaloPay QR Scanner Card (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-[#12161F] rounded-2xl p-6 sm:p-8 border border-[rgba(212,175,55,0.25)] shadow-2xl flex flex-col items-center text-center relative">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-mono text-[#f2ca50] uppercase tracking-widest font-bold">
                  QUÉT MÃ ZALOPAY / VIETQR
                </span>
              </div>

              {/* QR Code Frame */}
              <div className="p-4 bg-white rounded-2xl shadow-2xl relative group my-2">
                {loadingQr ? (
                  <div className="w-64 h-64 flex flex-col items-center justify-center gap-3 text-black">
                    <div className="w-10 h-10 border-4 border-gray-300 border-t-[#D4AF37] rounded-full animate-spin"></div>
                    <span className="text-xs font-semibold">Đang sinh mã QR ZaloPay...</span>
                  </div>
                ) : qrUrl ? (
                  <div className={`relative transition-all duration-300 ${qrFaded ? 'opacity-25 filter blur-[2px]' : 'opacity-100'}`}>
                    <QRCodeSVG 
                      value={qrUrl} 
                      size={240} 
                      level="H"
                      className="rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center text-xs text-gray-500">
                    Không tạo được mã QR
                  </div>
                )}

                {/* Overlaid Refresh Button when Faded */}
                {qrFaded && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-2xl gap-2 p-4">
                    <span className="text-xs text-white font-semibold">Mã QR đã hết hiệu lực</span>
                    <button 
                      onClick={handleRefresh}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B8860B] text-[#08090C] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg"
                    >
                      <FaSyncAlt /> Làm mới QR
                    </button>
                  </div>
                )}
              </div>

              {/* QR Controls */}
              <div className="flex items-center gap-4 mt-4">
                <span className="text-xs text-[#9CA3AF]">
                  Hết hạn sau: <strong className={qrSecondsLeft <= 10 ? 'text-red-400 font-mono' : 'text-[#f2ca50] font-mono'}>{qrSecondsLeft}s</strong>
                </span>
                <button 
                  onClick={handleRefresh} 
                  disabled={loadingQr}
                  className="text-xs text-[#f2ca50] hover:underline flex items-center gap-1"
                >
                  <FaSyncAlt className="text-[10px]" /> Làm mới ngay
                </button>
              </div>

              {/* Status Polling Indicator */}
              <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-[#1b1b1f] rounded-xl border border-[rgba(212,175,55,0.15)] text-xs text-[#d5c78e]">
                <div className="w-2 h-2 rounded-full bg-[#f2ca50] animate-ping"></div>
                <span>Đang chờ giao dịch từ ZaloPay...</span>
              </div>

              {/* Instruction Steps */}
              <div className="w-full text-left bg-[#0d0e11] rounded-xl p-4 mt-6 border border-gray-800 text-xs text-[#9CA3AF] flex flex-col gap-1.5">
                <span className="text-white font-semibold">Hướng dẫn thanh toán:</span>
                <p>1. Mở app ZaloPay hoặc App Ngân hàng bất kỳ.</p>
                <p>2. Chọn quét mã QR để quét mã ở trên.</p>
                <p>3. Kiểm tra số tiền và bấm Xác nhận thanh toán.</p>
                <p>4. Hệ thống sẽ tự động xuất vé Boarding Pass sau khi giao dịch thành công.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Render the custom Popup component */}
      {showPopup && (
        <Popup
          message="Giao dịch thành công! Bạn sẽ được chuyển đến trang vé trong giây lát."
          onConfirm={popupActions.handleConfirm}
        />
      )}
    </div>
  );
};

export default Payment;