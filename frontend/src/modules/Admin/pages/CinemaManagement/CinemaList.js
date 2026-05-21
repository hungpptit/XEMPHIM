import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import CinemaForm from '../../components/CinemaForm';
import styles from './CinemaList.module.css';
import { FaPlus, FaEdit, FaTrash, FaBuilding, FaExclamationTriangle } from 'react-icons/fa';

export default function CinemaManagement() {
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCinema, setEditingCinema] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    loadCinemas();
  }, []);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const loadCinemas = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminService.cinema.list();
      setCinemas(response.data || []);
    } catch (err) {
      console.error('Error loading cinemas:', err);
      const errorMsg = err.error || err.message || 'Lỗi khi tải danh sách rạp';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.location) {
      setError('Vui lòng nhập tên rạp và địa chỉ');
      return;
    }

    try {
      if (editingId) {
        await adminService.updateCinema(editingId, formData);
        setSuccess('Cập nhật rạp thành công!');
      } else {
        await adminService.createCinema(formData);
        setSuccess('Tạo rạp mới thành công!');
      }
      setFormData({ name: '', location: '', hotline: '' });
      setEditingId(null);
      setShowForm(false);
      loadCinemas();
    } catch (err) {
      setError('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (cinema) => {
    setFormData({
      name: cinema.name || '',
      location: cinema.cinema_name || '',
      hotline: cinema.hotline || ''
    });
    setEditingId(cinema.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xoá rạp này?')) {
      try {
        await adminService.deleteCinema(id);
        setSuccess('Xoá rạp thành công!');
        loadCinemas();
      } catch (err) {
        setError('Lỗi xoá rạp: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', location: '', hotline: '' });
    setError('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🏢 Quản Lý Rạp Chiếu</h2>
        {!showForm && (
          <button 
            className={styles.btnAdd}
            onClick={() => setShowForm(true)}
          >
            + Thêm Rạp Mới
          </button>
        )}
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}
      {success && <div className={styles.successAlert}>{success}</div>}

      {showForm && (
        <div className={styles.formContainer}>
          <h3>{editingId ? 'Chỉnh Sửa Rạp' : 'Thêm Rạp Mới'}</h3>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Tên Rạp:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="VD: CGV Vincom Đồng Khởi"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Địa Chỉ:</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                placeholder="VD: 72 Lê Thánh Tôn, Quận 1, TP.HCM"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Hotline:</label>
              <input
                type="tel"
                name="hotline"
                value={formData.hotline}
                onChange={handleInputChange}
                placeholder="VD: 028 6291 2000"
              />
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.btnSubmit}>
                {editingId ? '💾 Cập Nhật' : '➕ Tạo Mới'}
              </button>
              <button type="button" className={styles.btnCancel} onClick={handleCancel}>
                ❌ Huỷ
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Đang tải...</div>
      ) : (
        <div className={styles.cinemasGrid}>
          {cinemas.length === 0 ? (
            <p className={styles.empty}>Chưa có rạp nào. Hãy thêm rạp mới!</p>
          ) : (
            cinemas.map(cinema => (
              <div key={cinema.id} className={styles.cinemaCard}>
                <div className={styles.cardHeader}>
                  <h3>{cinema.name}</h3>
                  <div className={styles.cardActions}>
                    <button
                      className={styles.btnEdit}
                      onClick={() => handleEdit(cinema)}
                      title="Chỉnh sửa"
                    >
                      ✏️
                    </button>
                    <button
                      className={styles.btnDelete}
                      onClick={() => handleDelete(cinema.id)}
                      title="Xoá"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <p className={styles.location}>📍 {cinema.cinema_name}</p>
                  {cinema.hotline && <p className={styles.hotline}>📞 {cinema.hotline}</p>}
                  <p className={styles.seats}>🎟️ Tổng ghế: {cinema.total_seats || 0}</p>
                </div>

                <div className={styles.cardFooter}>
                  <button
                    className={styles.btnManageHalls}
                    onClick={() => window.location.href = `/admin/halls/${cinema.id}`}
                  >
                    🎭 Quản Lý Phòng Chiếu
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
