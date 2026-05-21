import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import styles from './HallList.module.css';

export default function HallManagement() {
  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    rows: '',
    seatsPerRow: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadHalls();
  }, []);

  const loadHalls = async () => {
    try {
      setLoading(true);
      setError('');
      setHalls([]);
    } catch (err) {
      console.error('Error loading halls:', err);
      setHalls([]);
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

    if (!formData.name || !formData.rows || !formData.seatsPerRow) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    const rows = parseInt(formData.rows);
    const seatsPerRow = parseInt(formData.seatsPerRow);

    if (rows <= 0 || seatsPerRow <= 0) {
      setError('Số hàng và số ghế phải lớn hơn 0');
      return;
    }

    try {
      setSuccess('Tạo phòng chiếu mới thành công!');
      setFormData({ name: '', rows: '', seatsPerRow: '' });
      setEditingId(null);
      setShowForm(false);
      loadHalls();
    } catch (err) {
      setError('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (hall) => {
    const totalSeats = hall.total_seats || 0;
    const estimatedRows = Math.ceil(Math.sqrt(totalSeats));
    const estimatedSeatsPerRow = Math.ceil(totalSeats / estimatedRows);

    setFormData({
      name: hall.name || '',
      rows: estimatedRows,
      seatsPerRow: estimatedSeatsPerRow
    });
    setEditingId(hall.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xoá phòng chiếu này?')) {
      try {
        setSuccess('Xoá phòng chiếu thành công!');
        loadHalls();
      } catch (err) {
        setError('Lỗi xoá phòng: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', rows: '', seatsPerRow: '' });
    setError('');
  };

  if (loading) {
    return <div className={styles.loading}>Đang tải...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🎭 Quản Lý Phòng Chiếu</h2>
        {!showForm && (
          <button 
            className={styles.btnAdd}
            onClick={() => setShowForm(true)}
          >
            + Thêm Phòng Mới
          </button>
        )}
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}
      {success && <div className={styles.successAlert}>{success}</div>}

      {showForm && (
        <div className={styles.formContainer}>
          <h3>{editingId ? 'Chỉnh Sửa Phòng' : 'Thêm Phòng Mới'}</h3>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Tên Phòng:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="VD: Phòng A, Phòng IMAX, Phòng 3D"
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Số Hàng Ghế:</label>
                <input
                  type="number"
                  name="rows"
                  value={formData.rows}
                  onChange={handleInputChange}
                  placeholder="VD: 10"
                  min="1"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Ghế Mỗi Hàng:</label>
                <input
                  type="number"
                  name="seatsPerRow"
                  value={formData.seatsPerRow}
                  onChange={handleInputChange}
                  placeholder="VD: 16"
                  min="1"
                  required
                />
              </div>
            </div>

            <div className={styles.totalSeats}>
              Tổng ghế: <strong>
                {formData.rows && formData.seatsPerRow 
                  ? parseInt(formData.rows) * parseInt(formData.seatsPerRow) 
                  : 0}
              </strong>
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

      <div className={styles.hallsGrid}>
        <div className={styles.empty}>
          Chưa có phòng chiếu nào. Hãy thêm phòng mới bằng nút "+ Thêm Phòng Mới"
        </div>
      </div>
    </div>
  );
}
