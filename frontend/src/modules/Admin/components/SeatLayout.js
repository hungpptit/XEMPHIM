import React, { useState } from 'react';
import styles from './SeatLayout.module.css';
import { FaChair, FaDollarSign } from 'react-icons/fa';

export default function SeatLayout({ hallData, onSeatTypeChange, isLoading = false }) {
  const [selectedSeatType, setSelectedSeatType] = useState('Standard');
  const [priceModifier, setPriceModifier] = useState(0);

  const seatTypes = [
    { name: 'Standard', label: 'Ghế Thường', color: '#3498db' },
    { name: 'VIP', label: 'Ghế VIP', color: '#f39c12' },
    { name: 'Couple', label: 'Ghế Đôi', color: '#e74c3c' },
    { name: 'Disabled', label: 'Ghế Khuyết Tật', color: '#9b59b6' },
    { name: 'Premium', label: 'Ghế Premium', color: '#2ecc71' }
  ];

  const handleUpdateSeatType = () => {
    if (onSeatTypeChange) {
      onSeatTypeChange({
        seatType: selectedSeatType,
        priceModifier: parseFloat(priceModifier)
      });
    }
  };

  if (!hallData || !hallData.layout) {
    return (
      <div className={styles.container}>
        <p className={styles.noData}>Không có dữ liệu phòng chiếu</p>
      </div>
    );
  }

  const { layout, hallId, name, rows, seatsPerRow, totalSeats } = hallData;
  const rows_letters = Object.keys(layout).sort();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          <FaChair /> Sơ Đồ Ghế: {name}
        </h3>
        <p className={styles.info}>
          {rows} hàng × {seatsPerRow} ghế = {totalSeats} ghế
        </p>
      </div>

      <div className={styles.content}>
        {/* Legend */}
        <div className={styles.legend}>
          <h4>Loại Ghế:</h4>
          <div className={styles.legendItems}>
            {seatTypes.map(type => (
              <div key={type.name} className={styles.legendItem}>
                <span
                  className={styles.colorBox}
                  style={{ backgroundColor: type.color }}
                />
                {type.label}
              </div>
            ))}
          </div>
        </div>

        {/* Seat Layout */}
        <div className={styles.seatLayout}>
          <div className={styles.screen}>🎬 SCREEN</div>
          
          {rows_letters.map(rowLetter => (
            <div key={rowLetter} className={styles.row}>
              <span className={styles.rowLabel}>{rowLetter}</span>
              <div className={styles.seats}>
                {layout[rowLetter]?.map((seat, idx) => {
                  const seatTypeObj = seatTypes.find(st => st.name === seat.type);
                  return (
                    <button
                      key={`${rowLetter}-${idx}`}
                      className={`${styles.seat} ${styles[seat.type.toLowerCase()]}`}
                      style={{ backgroundColor: seatTypeObj?.color || '#3498db' }}
                      title={`${rowLetter}${seat.number}`}
                      disabled
                    >
                      {seat.number}
                    </button>
                  );
                })}
              </div>
              <span className={styles.rowLabel}>{rowLetter}</span>
            </div>
          ))}
        </div>

        {/* Update Seat Type Panel */}
        <div className={styles.updatePanel}>
          <h4>Cập Nhật Loại Ghế</h4>
          <div className={styles.updateForm}>
            <div className={styles.formGroup}>
              <label>Chọn loại ghế:</label>
              <select
                value={selectedSeatType}
                onChange={(e) => setSelectedSeatType(e.target.value)}
                disabled={isLoading}
                className={styles.select}
              >
                {seatTypes.map(type => (
                  <option key={type.name} value={type.name}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>
                <FaDollarSign /> Điều Chỉnh Giá
              </label>
              <input
                type="number"
                value={priceModifier}
                onChange={(e) => setPriceModifier(e.target.value)}
                placeholder="0"
                step="10000"
                disabled={isLoading}
                className={styles.input}
              />
              <small>VD: nhập 50000 để cộng thêm 50.000đ vào giá ghế</small>
            </div>

            <button
              onClick={handleUpdateSeatType}
              disabled={isLoading}
              className={styles.btnUpdate}
            >
              {isLoading ? '⏳ Đang cập nhật...' : 'Cập Nhật Tất Cả Ghế'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
