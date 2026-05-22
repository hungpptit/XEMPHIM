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
    cinema_name: '',
    total_seats: ''
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
      const response = await adminService.hall.list();
      setHalls(response.data?.data || response.data || []);
    } catch (err) {
      console.error('Error loading halls:', err);
      setError('Lỗi tải danh sách phòng: ' + (err.response?.data?.error || err.message));
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

    if (!formData.name) {
      setError('Vui lòng nhập tên phòng');
      return;
    }

    const totalSeatsNum = formData.total_seats ? parseInt(formData.total_seats, 10) : null;

    try {
      let data;
      if (editingId) {
        data = { name: formData.name };
        await adminService.hall.update(editingId, data);
        setSuccess('Cập nhật phòng chiếu thành công!');
      } else {
        data = {
          name: formData.name,
          cinema_name: formData.cinema_name || undefined,
          total_seats: totalSeatsNum
        };
        await adminService.hall.create(data);
        setSuccess('Tạo phòng chiếu mới thành công!');
      }
      
      setFormData({ name: '', cinema_name: '', total_seats: '' });
      setEditingId(null);
      setShowForm(false);
      loadHalls();
    } catch (err) {
      setError('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (hall) => {
    // Only allow editing the name
    setFormData({
      name: hall.name || '',
      cinema_name: hall.cinema_name || '',
      total_seats: hall.total_seats || ''
    });
    setEditingId(hall.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bạn có chắc muốn xoá phòng chiếu này?')) {
      try {
        await adminService.hall.delete(id);
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
    setFormData({ name: '', cinema_name: '', total_seats: '' });
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

            {/* When editing, only allow changing the name. For creation, show extra fields. */}
            {!editingId && (
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Tên Rạp (tùy chọn):</label>
                  <input
                    type="text"
                    name="cinema_name"
                    value={formData.cinema_name}
                    onChange={handleInputChange}
                    placeholder="VD: Cineplex A"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Tổng Ghế (tùy chọn):</label>
                  <input
                    type="number"
                    name="total_seats"
                    value={formData.total_seats}
                    onChange={handleInputChange}
                    placeholder="VD: 120"
                    min="0"
                  />
                </div>
              </div>
            )}

            {/* show read-only total when creating with total_seats provided; hide when editing */}
            {!editingId && formData.total_seats && (
              <div className={styles.totalSeats}>
                Tổng ghế: <strong>{parseInt(formData.total_seats, 10) || 0}</strong>
              </div>
            )}

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
        {halls.length === 0 ? (
          <div className={styles.empty}>
            Chưa có phòng chiếu nào. Hãy thêm phòng mới bằng nút "+ Thêm Phòng Mới"
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>STT</th>
                <th>Tên Phòng</th>
                <th>Tên Rạp</th>
                <th>Tổng Ghế</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {halls.map((hall, index) => (
                <tr key={hall.id}>
                  <td>{index + 1}</td>
                  <td className={styles.hallName}>{hall.name}</td>
                  <td className={styles.cinemaName}>{hall.cinema_name || '-'}</td>
                  <td className={styles.seatCount}>{hall.total_seats || 0} ghế</td>
                  <td className={styles.actions}>
                    <button 
                      className={styles.btnEdit}
                      onClick={() => handleEdit(hall)}
                      title="Chỉnh sửa"
                    >
                      ✏️
                    </button>
                    <button 
                      className={styles.btnDelete}
                      onClick={() => handleDelete(hall.id)}
                      title="Xóa"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
