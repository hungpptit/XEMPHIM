import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSpinner, FaSyncAlt } from 'react-icons/fa';
import { QRCodeSVG } from 'qrcode.react';
import styles from './Payment.module.css';
import Popup from '../../components/Popup'; // Import the custom Popup component

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Try to load state from location.state, fallback to sessionStorage
  const [paymentData, setPaymentData] = useState(() => {
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

  const { movie, showtime, selectedSeats, totalPrice, bookingId, bookingCode } = paymentData;

  const [qrUrl, setQrUrl] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loadingQr, setLoadingQr] = useState(false);
  const [polling, setPolling] = useState(false);
  const [showPopup, setShowPopup] = useState(false); // State to manage popup visibility
  const [popupActions, setPopupActions] = useState({}); // State to manage popup actions
  const pollRef = useRef(null);
  const isConfirmedRef = useRef(false);
  const cancelRequestedRef = useRef(false);

  const cancelPendingBooking = async () => {
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
  };

  useEffect(() => {
    if (!movie || !showtime || !selectedSeats || selectedSeats.length === 0 || !bookingId) {
      console.warn('Missing payment data:', { movie, showtime, selectedSeats, bookingId });
      navigate('/');
    }
  }, [movie, showtime, selectedSeats, bookingId, navigate]);

  useEffect(() => {
    if (!expiresAt) return;
    const iv = setInterval(() => {
      const s = Math.max(0, Math.floor((new Date(expiresAt) - new Date()) / 1000));
      setSecondsLeft(s);
      if (s <= 0) {
        clearInterval(iv);
        if (bookingId && !isConfirmedRef.current) {
          cancelPendingBooking().catch(err => {
            console.warn('Failed to cancel expired booking:', err);
          });
        }
      }
    }, 300);
    return () => clearInterval(iv);
  }, [expiresAt, bookingId]);

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
            try {
              sessionStorage.removeItem('current_payment');
            } catch (e) {}
            alert('Giao dịch đã hết hạn hoặc bị hủy. Vui lòng thực hiện chọn lại ghế.');
            navigate(-1);
          }
        } catch (e) {
          // ignore transient errors
        }
      }, 2000);
    };
    startPolling();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [polling, bookingId, navigate]);

  const createQr = async () => {
    if (!bookingId) return;
    setLoadingQr(true);
    try {
      const { bookingAPI } = await import('../../services/api');
      const res = await bookingAPI.createSepayQR(bookingId);
      const data = res.data || res;
      setQrUrl(data.qr_url || data.qrUrl || data.order_url || null);
      if (data.expires_at) {
        setExpiresAt(new Date(data.expires_at));
      } else if (data.expires_in) {
        setExpiresAt(new Date(Date.now() + Number(data.expires_in) * 1000));
      } else {
        // ZaloPay default: 300 seconds (5 minutes)
        setExpiresAt(new Date(Date.now() + 300 * 1000));
      }
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
    createQr();
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

  useEffect(() => {
    createQr();

    const handleBeforeUnload = (e) => {
      if (bookingId && !isConfirmedRef.current) {
        const token = localStorage.getItem('token');
        const headers = {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
        fetch(`http://localhost:8080/api/bookings/${bookingId}/cancel`, {
          method: 'POST',
          headers,
          keepalive: true
        }).catch(err => console.error('Beacon cancel failed:', err));
      }
    };

    const handlePopState = () => {
      if (bookingId && !isConfirmedRef.current) {
        cancelPendingBooking().catch(err => {
          console.warn('Failed to cancel booking on browser back:', err);
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
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
    <div className={styles.payment}>
      <button className={styles.backBtn} onClick={handleBack}>
        <FaArrowLeft />
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>Thanh toán bằng ZaloPay</h1>
        <p className={styles.subtitle}>Quét mã QR trong 5 phút để thanh toán</p>
      </div>

      <div className={styles.content}>
        <div className={styles.paymentForm}>
          <div className={styles.sectionTitle}>Mã QR thanh toán</div>

          <div className={styles.qrContainer}>
            {loadingQr ? (
              <div className={styles.loadingBox}><FaSpinner className="loading" /> Đang tạo mã QR...</div>
            ) : qrUrl ? (
              <div className={`${styles.qrCard} ${secondsLeft <= 0 ? styles.qrExpired : ''}`}>
                <QRCodeSVG 
                  value={qrUrl} 
                  size={256} 
                  level="H"
                  className={`${styles.qrImage} ${secondsLeft <= 0 ? styles.qrImageExpired : ''}`}
                />
                <div className={styles.qrInfo}>
                  <div className={styles.accountName}>ZaloPay</div>
                  <div className={styles.bookingCode}>
                    Mã đặt vé: {bookingCode ? `BOOK${bookingId}-${bookingCode}` : `BOOK${bookingId}`}
                  </div>
                </div>
              </div>
            ) : (
              <div className={styles.loadingBox}>Không có mã QR</div>
            )}
          </div>

          <div className={styles.qrControls}>
            <div className={styles.timer}>
              Thời gian còn lại: <strong className={secondsLeft <= 10 ? styles.timerExpired : ''}>{secondsLeft}s</strong>
            </div>
            <button className={styles.refreshBtn} onClick={handleRefresh} disabled={loadingQr}>
              <FaSyncAlt /> Làm mới
            </button>
          </div>

          <div className={styles.instructions}>
            <div><strong>Hướng dẫn thanh toán:</strong></div>
            <p>1. Mở app ZaloPay và quét mã QR</p>
            <p>2. Kiểm tra số tiền và nội dung thanh toán</p>
            <p>3. Xác nhận thanh toán bằng mật khẩu hoặc sinh trắc học</p>
            <p>4. Hệ thống sẽ tự động xác nhận vé của bạn</p>
          </div>
        </div>

        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Thông tin đặt vé</h2>
          <div className={styles.movieInfo}>
            <img src={movie?.poster} alt={movie?.title} className={styles.moviePoster} />
            <div className={styles.movieTitle}>{movie?.title}</div>
          </div>

          <div className={styles.showDetails}>
            <div className={styles.detailRow}><div className={styles.detailLabel}>Ngày:</div><div className={styles.detailValue}>{showtime?.date}</div></div>
            <div className={styles.detailRow}><div className={styles.detailLabel}>Giờ:</div><div className={styles.detailValue}>{showtime?.time}</div></div>
            <div className={styles.detailRow}><div className={styles.detailLabel}>Rạp:</div><div className={styles.detailValue}>{showtime?.cinema}</div></div>
          </div>

          <div className={styles.seatsInfo}>
            <div className={styles.detailRow}><div className={styles.detailLabel}>Ghế đã chọn:</div><div className={styles.detailValue}>{selectedSeats?.length} ghế</div></div>
            <div className={styles.seatsList}>{selectedSeats?.map(seat => (<span key={seat.id} className={styles.seatItem}>{seat.displayName || `${seat.row}${seat.number}`}</span>))}</div>
          </div>

          <div className={`${styles.priceRow} ${styles.total}`}><span>Tổng cộng:</span><span>{totalPrice?.toLocaleString()}đ</span></div>
        </div>
      </div>

      {/* Render the custom Popup component */}
      {showPopup && (
        <Popup
          message="Bạn sẽ được chuyển đến trang vé trong giây lát."
          onConfirm={popupActions.handleConfirm}
        />
      )}
    </div>
  );
};

export default Payment;