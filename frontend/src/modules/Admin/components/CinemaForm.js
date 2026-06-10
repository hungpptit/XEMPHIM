import React, { useState } from 'react';
import styles from './CinemaForm.module.css';
import { FaBuilding, FaMapMarkerAlt, FaPhone, FaEnvelope } from 'react-icons/fa';

export default function CinemaForm({ onSubmit, onCancel, initialData = null, isLoading = false }) {
  const [formData, setFormData] = useState(initialData || {
    name: '',
    location: '',
    hotline: '',
    email: '',
    address: ''
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name?.trim()) newErrors.name = 'Tên rạp là bắt buộc';
    if (!formData.location?.trim()) newErrors.location = 'Địa chỉ là bắt buộc';
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
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
    // Clear error for this field
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
      onSubmit(formData);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.title}>
        <FaBuilding /> {initialData ? 'Chỉnh Sửa Rạp Chiếu' : 'Tạo Rạp Chiếu Mới'}
      </h3>

      <div className={styles.formGroup}>
        <label className={styles.label}>Tên Rạp <span className={styles.required}>*</span></label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Vd: CGV Vincom Landmark 81"
          className={`${styles.input} ${errors.name ? styles.error : ''}`}
          disabled={isLoading}
        />
        {errors.name && <span className={styles.errorText}>{errors.name}</span>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          <FaMapMarkerAlt className={styles.icon} />
          Địa Chỉ <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          name="location"
          value={formData.location}
          onChange={handleChange}
          placeholder="Vd: Thành phố Hồ Chí Minh"
          className={`${styles.input} ${errors.location ? styles.error : ''}`}
          disabled={isLoading}
        />
        {errors.location && <span className={styles.errorText}>{errors.location}</span>}
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label className={styles.label}>
            <FaPhone className={styles.icon} />
            Hotline
          </label>
          <input
            type="tel"
            name="hotline"
            value={formData.hotline}
            onChange={handleChange}
            placeholder="Vd: 1900 1234"
            className={styles.input}
            disabled={isLoading}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>
            <FaEnvelope className={styles.icon} />
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Vd: info@cinema.com"
            className={`${styles.input} ${errors.email ? styles.error : ''}`}
            disabled={isLoading}
          />
          {errors.email && <span className={styles.errorText}>{errors.email}</span>}
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Mô Tả Thêm</label>
        <textarea
          name="address"
          value={formData.address}
          onChange={handleChange}
          placeholder="Vd: 206 Nguyễn Hữu Cảnh, Phường 22, Bình Thạnh..."
          className={styles.textarea}
          disabled={isLoading}
          rows="3"
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
