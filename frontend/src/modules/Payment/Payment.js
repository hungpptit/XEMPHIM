import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import { 
  FaArrowLeft, 
  FaCreditCard, 
  FaMobile, 
  FaUniversity,
  FaCheckCircle,
  FaSpinner,
  FaClock,
  FaMapMarkerAlt,
  FaCalendar,
  FaUsers
} from 'react-icons/fa';
import styles from './Payment.module.css';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [selectedMethod, setSelectedMethod] = useState('momo');
  const [customerInfo, setCustomerInfo] = useState({
    fullName: '',
    email: '',
    phone: '',
    agreeTerms: false
  });
  const [isUser, setIsUser] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const { movie, showtime, selectedSeats, totalPrice, bookingId } = location.state || {};

  const paymentMethods = [
    {
      id: 'momo',
      name: 'Ví MoMo',
      desc: 'Thanh toán nhanh chóng với ví điện tử MoMo',
      icon: '📱',
      color: '#d82d8b'
    },
    {
      id: 'vnpay',
      name: 'VNPay',
      desc: 'Thanh toán qua cổng VNPay an toàn',
      icon: '💳',
      color: '#1e88e5'
    },
    {
      id: 'visa',
      name: 'Visa/Mastercard',
      desc: 'Thanh toán bằng thẻ tín dụng quốc tế',
      icon: '💳',
      color: '#1565c0'
    },
    {
      id: 'bank',
      name: 'Chuyển khoản ngân hàng',
      desc: 'Chuyển khoản trực tiếp qua ngân hàng',
      icon: '🏦',
      color: '#388e3c'
    }
  ];

  React.useEffect(() => {
    if (!movie || !showtime || !selectedSeats || selectedSeats.length === 0 || !bookingId) {
      console.warn('Missing payment data:', { movie, showtime, selectedSeats, bookingId });
      navigate('/');
    }
  }, [movie, showtime, selectedSeats, bookingId, navigate]);

  // If user is logged in (cookie based), prefill customer info so they don't need to type
  React.useEffect(() => {
    let mounted = true;
    const loadCurrentUser = async () => {
      try {
        const u = await authService.getCurrentUser();
        if (!mounted) return;
        if (u) {
          setCustomerInfo(prev => ({
            ...prev,
            fullName: u.full_name || u.fullName || u.name || prev.fullName || '',
            email: u.email || prev.email || '',
            phone: u.phone || u.phone_number || u.mobile || prev.phone || ''
          }));
          setIsUser(true);
        }
      } catch (e) {
        // ignore
      }
    };
    loadCurrentUser();
    return () => { mounted = false; };
  }, []);

  const handleInputChange = (field, value) => {
    setCustomerInfo(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { fullName, email, phone, agreeTerms } = customerInfo;
    
    if (!fullName.trim()) {
      alert('Vui lòng nhập họ tên');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      alert('Vui lòng nhập email hợp lệ');
      return false;
    }
    if (!phone.trim() || phone.length < 10) {
      alert('Vui lòng nhập số điện thoại hợp lệ');
      return false;
    }
    if (!agreeTerms) {
      alert('Vui lòng đồng ý với điều khoản sử dụng');
      return false;
    }
    
    return true;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;
    if (!bookingId) {
      alert('Không tìm thấy thông tin booking. Vui lòng thử lại.');
      return;
    }

    setProcessing(true);
    
    try {
      // Call backend to confirm payment
      const { bookingAPI } = await import('../../services/api');
      console.log('Confirming payment for booking:', bookingId);
      
      const result = await bookingAPI.confirmPayment(bookingId, {
        payment_method: selectedMethod,
        payment_payload: {
          transaction_ref: `TXN_${Date.now()}`,
          response_code: '00' // success code
        }
      });
      
      console.log('Payment confirmation result:', result);

      // Handle response format (API might return {data: ...} or direct object)
      const responseData = result.data || result;
      console.log('Response data:', responseData);

      if (responseData && responseData.booking) {
        setProcessing(false);
        setShowSuccessModal(true);
        
        // Save booking info to localStorage for MyTickets
        const bookingData = {
          id: responseData.booking.id.toString(),
          movie,
          showtime,
          selectedSeats,
          totalPrice,
          customerInfo,
          paymentMethod: selectedMethod,
          bookingDate: new Date().toISOString(),
          status: 'confirmed'
        };
        
        const existingBookings = JSON.parse(localStorage.getItem('bookings') || '[]');
        existingBookings.push(bookingData);
        localStorage.setItem('bookings', JSON.stringify(existingBookings));
      } else {
        throw new Error('Payment confirmation failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setProcessing(false);
      alert('Thanh toán thất bại. Vui lòng thử lại.');
    }
  };

  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    navigate('/my-tickets');
  };

  if (!movie || !showtime || !selectedSeats || selectedSeats.length === 0 || !bookingId) {
    return (
      <div className={styles.payment}>
        <div className="container">
          <div className={styles.loadingContainer}>
            <h2>Thông tin không hợp lệ</h2>
            <button onClick={() => navigate('/')} className="btn">
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.payment}>
      <button 
        className={styles.backBtn}
        onClick={() => navigate(-1)}
      >
        <FaArrowLeft />
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>Thanh toán</h1>
        <p className={styles.subtitle}>Hoàn tất đặt vé của bạn</p>
      </div>

      <div className={styles.content}>
        <div className={styles.paymentForm}>
          {/* Payment Methods */}
          <div className={styles.sectionTitle}>
            <FaCreditCard />
            Chọn phương thức thanh toán
          </div>
          
          <div className={styles.paymentMethods}>
            {paymentMethods.map(method => (
              <label 
                key={method.id}
                className={`${styles.methodOption} ${selectedMethod === method.id ? styles.selected : ''}`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method.id}
                  checked={selectedMethod === method.id}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className={styles.methodRadio}
                />
                <div className={styles.methodIcon} style={{ backgroundColor: method.color }}>
                  {method.icon}
                </div>
                <div className={styles.methodInfo}>
                  <div className={styles.methodName}>{method.name}</div>
                  <div className={styles.methodDesc}>{method.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {/* Customer Information */}
          <div className={styles.customerInfo}>
            <div className={styles.sectionTitle}>
              <FaUsers />
              Thông tin khách hàng
            </div>
            
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Họ và tên *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Nhập họ và tên"
                  value={customerInfo.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  readOnly={isUser}
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Số điện thoại *</label>
                <input
                  type="tel"
                  className={styles.input}
                  placeholder="Nhập số điện thoại"
                  value={customerInfo.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  readOnly={isUser}
                />
              </div>
            </div>
            
            <div className={`${styles.formGroup} ${styles.full}`}>
              <label className={styles.label}>Email *</label>
              <input
                type="email"
                className={styles.input}
                placeholder="Nhập địa chỉ email"
                value={customerInfo.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                readOnly={isUser}
              />
            </div>

            <div className={styles.checkbox}>
              <input
                type="checkbox"
                id="agreeTerms"
                className={styles.checkboxInput}
                checked={customerInfo.agreeTerms}
                onChange={(e) => handleInputChange('agreeTerms', e.target.checked)}
              />
              <label htmlFor="agreeTerms">
                Tôi đồng ý với <a href="#" style={{ color: 'var(--color-gold)' }}>Điều khoản sử dụng</a> và 
                <a href="#" style={{ color: 'var(--color-gold)' }}> Chính sách bảo mật</a>
              </label>
            </div>
          </div>

          <button 
            className={styles.payBtn}
            onClick={handlePayment}
            disabled={processing}
          >
            {processing ? (
              <>
                <FaSpinner className="loading" />
                Đang xử lý...
              </>
            ) : (
              <>
                <FaCreditCard />
                Thanh toán {totalPrice?.toLocaleString()}đ
              </>
            )}
          </button>
        </div>

        {/* Booking Summary */}
        <div className={styles.summary}>
          <h2 className={styles.summaryTitle}>Thông tin đặt vé</h2>
          
          <div className={styles.movieInfo}>
            <img 
              src={movie?.poster} 
              alt={movie?.title}
              className={styles.moviePoster}
            />
            <div className={styles.movieTitle}>{movie?.title}</div>
          </div>

          <div className={styles.showDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                <FaCalendar style={{ marginRight: '5px' }} />
                Ngày:
              </span>
              <span className={styles.detailValue}>{showtime?.date}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                <FaClock style={{ marginRight: '5px' }} />
                Giờ:
              </span>
              <span className={styles.detailValue}>{showtime?.time}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>
                <FaMapMarkerAlt style={{ marginRight: '5px' }} />
                Rạp:
              </span>
              <span className={styles.detailValue}>{showtime?.cinema}</span>
            </div>
          </div>

          <div className={styles.seatsInfo}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Ghế đã chọn:</span>
              <span className={styles.detailValue}>{selectedSeats?.length} ghế</span>
            </div>
            <div className={styles.seatsList}>
              {selectedSeats?.map(seat => (
                <span key={seat.id} className={styles.seatItem}>
                  {seat.displayName || seat.id}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.pricing}>
            {selectedSeats?.reduce((acc, seat) => {
              const type = seat.type === 'vip' ? 'VIP' : 'Thường';
              const existing = acc.find(item => item.type === type);
              if (existing) {
                existing.count++;
                existing.total += seat.price;
              } else {
                acc.push({
                  type,
                  count: 1,
                  price: seat.price,
                  total: seat.price
                });
              }
              return acc;
            }, []).map((item, index) => (
              <div key={index} className={styles.priceRow}>
                <span className={styles.detailLabel}>
                  Ghế {item.type} x{item.count}:
                </span>
                <span className={styles.detailValue}>
                  {item.total.toLocaleString()}đ
                </span>
              </div>
            ))}
            <div className={`${styles.priceRow} ${styles.total}`}>
              <span>Tổng cộng:</span>
              <span>{totalPrice?.toLocaleString()}đ</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <FaCheckCircle className={styles.modalIcon} />
            <h2 className={styles.modalTitle}>Đặt vé thành công!</h2>
            <p className={styles.modalMessage}>
              Cảm ơn bạn đã đặt vé tại CinemaX. Thông tin vé đã được gửi đến email của bạn.
              Vui lòng đến rạp trước giờ chiếu 15 phút để làm thủ tục.
            </p>
            <div className={styles.modalActions}>
              <button 
                className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                onClick={handleSuccessClose}
              >
                Xem vé của tôi
              </button>
              <button 
                className={`${styles.modalBtn} ${styles.modalBtnSecondary}`}
                onClick={() => navigate('/')}
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment;