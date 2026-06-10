import React, { useState } from 'react';
import styles from './CinemaForm.module.css';
import { FaDoor, FaBox } from 'react-icons/fa';

export default function HallForm({ cinemaId, onSubmit, onCancel, initialData = null, isLoading = false }) {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    rows: '',
    seatsPerRow: '',
    hallType: 'Standard',
    description: ''
  });

  const [errors, setErrors] = useState({});

  const hallTypes = ['Standard', 'IMAX', '3D', 'Premium'];

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'Tên phòng là bắt buộc';
    
    const rows = parseInt(formData.rows);
    if (!formData.rows || rows <= 0 || rows > 30) {
      newErrors.rows = 'Số hàng phải từ 1 đến 30';
    }
    
    const seatsPerRow = parseInt(formData.seatsPerRow);
    if (!formData.seatsPerRow || seatsPerRow <= 0 || seatsPerRow > 50) {
      newErrors.seatsPerRow = 'Số ghế mỗi hàng phải từ 1 đến 50';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit({
        ...formData,
        cinemaId,
        rows: parseInt(formData.rows),
        seatsPerRow: parseInt(formData.seatsPerRow)
      });
    }
  };

  const totalSeats = formData.rows && formData.seatsPerRow 
    ? parseInt(formData.rows) * parseInt(formData.seatsPerRow)
    : 0;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.title}>
        <FaDoor /> {initialData ? 'Chỉnh Sửa Phòng Chiếu' : 'Tạo Phòng Chiếu Mới'}
      </h3>

      <div className={styles.formGroup}>
        <label className={styles.label}>Tên Phòng <span className={styles.required}>*</span></label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Vd: Phòng 1, Phòng A, VIP Hall"
          className={`${styles.input} ${errors.name ? styles.error : ''}`}
          disabled={isLoading}
        />
        {errors.name && <span className={styles.errorText}>{errors.name}</span>}
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Số Hàng Ghế <span className={styles.required}>*</span></label>
          <input
            type="number"
            name="rows"
            value={formData.rows}
            onChange={handleChange}
            placeholder="10"
            min="1"
            max="30"
            className={`${styles.input} ${errors.rows ? styles.error : ''}`}
            disabled={isLoading}
          />
          {errors.rows && <span className={styles.errorText}>{errors.rows}</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Ghế Mỗi Hàng <span className={styles.required}>*</span></label>
          <input
            type="number"
            name="seatsPerRow"
            value={formData.seatsPerRow}
            onChange={handleChange}
            placeholder="15"
            min="1"
            max="50"
            className={`${styles.input} ${errors.seatsPerRow ? styles.error : ''}`}
            disabled={isLoading}
          />
          {errors.seatsPerRow && <span className={styles.errorText}>{errors.seatsPerRow}</span>}
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Loại Phòng</label>
          <select
            name="hallType"
            value={formData.hallType}
            onChange={handleChange}
            className={styles.input}
            disabled={isLoading}
          >
            {hallTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {totalSeats > 0 && (
        <div className={styles.info}>
          <FaBox /> Tổng ghế: <strong>{totalSeats}</strong> ghế
        </div>
      )}

      <div className={styles.formGroup}>
        <label className={styles.label}>Mô Tả</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Vd: Phòng có ghế tận hưởng thoải mái..."
          className={styles.textarea}
          disabled={isLoading}
          rows="2"
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.btnCancel}
          onClick={onCancel}
          disabled={isLoading}
        >
          Hủy
        </button>
        <button
          type="submit"
          className={styles.btnSubmit}
          disabled={isLoading}
        >
          {isLoading ? '⏳ Đang xử lý...' : (initialData ? 'Cập Nhật' : 'Tạo Mới')}
        </button>
      </div>
    </form>
  );
}
