import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, 
  FaClock, 
  FaMapMarkerAlt, 
  FaCalendar,
  FaUsers
} from 'react-icons/fa';
import styles from './SeatSelection.module.css';

const SeatSelection = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatMap, setSeatMap] = useState([]);
  const [loading, setLoading] = useState(true);

  const { movie, showtime } = location.state || {};

  // Mock seat map data
  const generateSeatMap = () => {
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const seatsPerRow = 12;
    const map = [];

    rows.forEach(row => {
      const rowSeats = [];
      for (let i = 1; i <= seatsPerRow; i++) {
        // Create some random occupied seats
        const isOccupied = Math.random() < 0.3;
        // VIP seats (rows F, G, H)
        const isVip = ['F', 'G', 'H'].includes(row);
        
        rowSeats.push({
          id: `${row}${i}`,
          row: row,
          number: i,
          status: isOccupied ? 'occupied' : 'available',
          type: isVip ? 'vip' : 'regular',
          price: isVip ? 150000 : 100000
        });
      }
      map.push(rowSeats);
    });

    return map;
  };

  useEffect(() => {
    if (!movie || !showtime) {
      navigate('/');
      return;
    }

    // Simulate API call to get seat map
    setTimeout(() => {
      setSeatMap(generateSeatMap());
      setLoading(false);
    }, 1000);
  }, [movie, showtime, navigate]);

  const handleSeatClick = (seat) => {
    if (seat.status === 'occupied') return;

    const seatId = seat.id;
    const isSelected = selectedSeats.find(s => s.id === seatId);

    if (isSelected) {
      setSelectedSeats(selectedSeats.filter(s => s.id !== seatId));
    } else {
      if (selectedSeats.length >= 8) {
        alert('Bạn chỉ có thể chọn tối đa 8 ghế');
        return;
      }
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const getTotalPrice = () => {
    return selectedSeats.reduce((total, seat) => total + seat.price, 0);
  };

  const handleContinue = () => {
    if (selectedSeats.length === 0) {
      alert('Vui lòng chọn ít nhất một ghế');
      return;
    }

    navigate('/payment', {
      state: {
        movie,
        showtime,
        selectedSeats,
        totalPrice: getTotalPrice()
      }
    });
  };

  const renderSeat = (seat) => {
    const isSelected = selectedSeats.find(s => s.id === seat.id);
    let seatClass = `${styles.seat} `;
    
    if (seat.status === 'occupied') {
      seatClass += styles.occupied;
    } else if (isSelected) {
      seatClass += styles.selected;
    } else {
      seatClass += styles.available;
    }
    
    if (seat.type === 'vip') {
      seatClass += ` ${styles.vip}`;
    }

    return (
      <button
        key={seat.id}
        className={seatClass}
        onClick={() => handleSeatClick(seat)}
        disabled={seat.status === 'occupied'}
        title={`Ghế ${seat.id} - ${seat.type === 'vip' ? 'VIP' : 'Thường'} - ${seat.price.toLocaleString()}đ`}
      >
        {seat.number}
      </button>
    );
  };

  const renderSeatRow = (row, rowIndex) => {
    const rowSeats = row;
    const rowLetter = rowSeats[0].row;
    
    return (
      <div key={rowIndex} className={styles.row}>
        <div className={styles.rowLabel}>
          {rowLetter}
        </div>
        
        {/* Ghế 1-3 */}
        {rowSeats.slice(0, 3).map(seat => renderSeat(seat))}
        
        {/* Lối đi 1 */}
        <div className={styles.aisle}></div>
        
        {/* Ghế 4-9 */}
        {rowSeats.slice(3, 9).map(seat => renderSeat(seat))}
        
        {/* Lối đi 2 */}
        <div className={styles.aisle}></div>
        
        {/* Ghế 10-12 */}
        {rowSeats.slice(9, 12).map(seat => renderSeat(seat))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={styles.seatSelection}>
        <div className="container">
          <div className={styles.loadingContainer}>
            <div className="loading"></div>
            <p>Đang tải sơ đồ ghế...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!movie || !showtime) {
    return (
      <div className={styles.seatSelection}>
        <div className="container">
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
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
    <div className={styles.seatSelection}>
      <button 
        className={styles.backBtn}
        onClick={() => navigate(-1)}
      >
        <FaArrowLeft />
      </button>

      <div className={styles.header}>
        <h1 className={styles.movieTitle}>{movie.title}</h1>
        <div className={styles.showtimeInfo}>
          <div className={styles.infoItem}>
            <FaCalendar />
            {showtime.date}
          </div>
          <div className={styles.infoItem}>
            <FaClock />
            {showtime.time}
          </div>
          <div className={styles.infoItem}>
            <FaMapMarkerAlt />
            {showtime.cinema}
          </div>
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.cinemaContainer}>
          <div className={styles.screen}></div>
          
          <div className={styles.seatsGrid}>
            {seatMap.map((row, rowIndex) => renderSeatRow(row, rowIndex))}
          </div>

          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <div className={`${styles.legendSeat} ${styles.available}`}>1</div>
              Ghế trống
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendSeat} ${styles.selected}`}>2</div>
              Ghế đã chọn
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendSeat} ${styles.occupied}`}>3</div>
              Ghế đã đặt
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendSeat} ${styles.vip} ${styles.available}`}>V</div>
              Ghế VIP
            </div>
          </div>
        </div>

        <div className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Thông tin đặt vé</h2>
          
          <div className={styles.bookingInfo}>
            <div className={styles.infoRow}>
              <span className={styles.label}>Phim:</span>
              <span className={styles.value}>{movie.title}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Ngày:</span>
              <span className={styles.value}>{showtime.date}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Giờ:</span>
              <span className={styles.value}>{showtime.time}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.label}>Rạp:</span>
              <span className={styles.value}>{showtime.cinema}</span>
            </div>
          </div>

          <div className={styles.selectedSeats}>
            <div className={styles.infoRow}>
              <span className={styles.label}>
                <FaUsers /> Ghế đã chọn:
              </span>
              <span className={styles.value}>{selectedSeats.length}</span>
            </div>
            {selectedSeats.length > 0 && (
              <div className={styles.seatsList}>
                {selectedSeats.map(seat => (
                  <span key={seat.id} className={styles.selectedSeat}>
                    {seat.id}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.pricing}>
            {selectedSeats.length > 0 && (
              <>
                {selectedSeats
                  .reduce((acc, seat) => {
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
                  }, [])
                  .map((item, index) => (
                    <div key={index} className={styles.priceRow}>
                      <span className={styles.label}>
                        Ghế {item.type} x{item.count}:
                      </span>
                      <span className={styles.value}>
                        {item.total.toLocaleString()}đ
                      </span>
                    </div>
                  ))
                }
                <div className={`${styles.priceRow} ${styles.total}`}>
                  <span>Tổng cộng:</span>
                  <span>{getTotalPrice().toLocaleString()}đ</span>
                </div>
              </>
            )}
          </div>

          <button 
            className={styles.continueBtn}
            onClick={handleContinue}
            disabled={selectedSeats.length === 0}
          >
            Tiếp tục thanh toán
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeatSelection;