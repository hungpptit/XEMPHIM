import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import { VIETNAM_PROVINCES } from '../../../../utils/locations';
import styles from './CinemaList.module.css';

export default function CinemaManagement() {
  const navigate = useNavigate();
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    status: 'Active'
  });

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
      const payload = response?.data;
      const cinemaList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      setCinemas(cinemaList);
    } catch (err) {
      console.error('Error loading cinemas:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Lỗi khi tải danh sách rạp';
      setError(errorMsg);
      setCinemas([]);
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

    if (!formData.name || !formData.address || !formData.city) {
      setError('Vui lòng nhập tên rạp, địa chỉ và thành phố');
      return;
    }

    try {
      if (editingId) {
        await adminService.cinema.update(editingId, formData);
        setSuccess('Cập nhật rạp thành công!');
      } else {
        await adminService.cinema.create(formData);
        setSuccess('Tạo rạp mới thành công!');
      }
      setFormData({ name: '', address: '', city: '', status: 'Active' });
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
      address: cinema.address || '',
      city: cinema.city || '',
      status: cinema.status || 'Active'
    });
    setEditingId(cinema.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xoá rạp này?')) {
      try {
        await adminService.cinema.delete(id);
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
    setFormData({ name: '', address: '', city: '', status: 'Active' });
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
              <label>Thành Phố:</label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="VD: TP. Hồ Chí Minh"
                list="vietnam-provinces"
                required
              />
              <datalist id="vietnam-provinces">
                {VIETNAM_PROVINCES.map(province => (
                  <option key={province} value={province} />
                ))}
              </datalist>
            </div>

            <div className={styles.formGroup}>
              <label>Địa Chỉ:</label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="VD: 72 Lê Thánh Tôn, Quận 1"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Trạng Thái:</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
              >
                <option value="Active">Hoạt động</option>
                <option value="Inactive">Tạm dừng</option>
              </select>
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
                  <div className={styles.infoRow}>
                    <span className={styles.infoIcon}>📍</span>
                    <div className={styles.infoContent}>
                      <span className={styles.infoValue}>{cinema.address}</span>
                      <span className={styles.infoLabel}>{cinema.city}</span>
                    </div>
                  </div>

                  <div className={styles.statusRow}>
                    <span className={styles.infoIcon}>🏷️</span>
                    <span className={`${styles.statusBadge} ${cinema.status === 'Active' ? styles.statusActive : styles.statusInactive}`}>
                      {cinema.status === 'Active' ? 'Đang Hoạt Động' : 'Tạm Dừng'}
                    </span>
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <button
                    className={styles.btnManageHalls}
                    onClick={() => navigate(`/admin/halls/${cinema.id}`)}
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
