import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import styles from './HallList.module.css';

export default function HallManagement() {
  const { cinemaId } = useParams();
  
  const [halls, setHalls] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [cinemaName, setCinemaName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    cinemaId: cinemaId || '',
    rows: '10',
    seatsPerRow: '12',
    hallType: 'Standard',
    description: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadHalls();
    loadCinemas();
    if (cinemaId) {
      loadCinemaName();
    }
  }, [cinemaId]);

  useEffect(() => {
    if (cinemaId) {
      setFormData(prev => ({ ...prev, cinemaId: cinemaId }));
    }
  }, [cinemaId]);

  const loadCinemaName = async () => {
    try {
      const response = await adminService.cinema.getById(cinemaId);
      const data = response.data?.data || response.data;
      if (data) {
        setCinemaName(data.name);
      }
    } catch (err) {
      console.error('Error loading cinema name:', err);
    }
  };

  const loadCinemas = async () => {
    try {
      const response = await adminService.cinema.list();
      setCinemas(response.data || []);
    } catch (err) {
      console.error('Error loading cinemas:', err);
    }
  };

  const loadHalls = async () => {
    try {
      setLoading(true);
      setError('');
      let response;
      if (cinemaId) {
        response = await adminService.cinema.getHalls(cinemaId);
      } else {
        response = await adminService.hall.list();
      }
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

    const selectedCinemaId = formData.cinemaId || cinemaId;
    if (!selectedCinemaId) {
      setError('Vui lòng chọn rạp chiếu');
      return;
    }

    try {
      if (editingId) {
        const updateData = {
          name: formData.name,
          cinema_id: parseInt(selectedCinemaId, 10)
        };
        await adminService.hall.update(editingId, updateData);
        setSuccess('Cập nhật phòng chiếu thành công!');
      } else {
        const createData = {
          name: formData.name,
          cinema_id: parseInt(selectedCinemaId, 10),
          rows: parseInt(formData.rows, 10),
          seatsPerRow: parseInt(formData.seatsPerRow, 10),
          hallType: formData.hallType,
          description: formData.description
        };
        await adminService.hall.create(createData);
        setSuccess('Tạo phòng chiếu mới thành công!');
      }
      
      setFormData({
        name: '',
        cinemaId: cinemaId || '',
        rows: '10',
        seatsPerRow: '12',
        hallType: 'Standard',
        description: ''
      });
      setEditingId(null);
      setShowForm(false);
      loadHalls();
    } catch (err) {
      setError('Lỗi: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (hall) => {
    setFormData({
      name: hall.name || '',
      cinemaId: hall.cinema_id || '',
      rows: '10', // Not editable for existing room but provide default
      seatsPerRow: '12',
      hallType: 'Standard',
      description: ''
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
    setFormData({
      name: '',
      cinemaId: cinemaId || '',
      rows: '10',
      seatsPerRow: '12',
      hallType: 'Standard',
      description: ''
    });
    setError('');
  };

  const getCinemaNameById = (id) => {
    const cinema = cinemas.find(c => c.id === id);
    return cinema ? cinema.name : '-';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🎭 Quản Lý Phòng Chiếu {cinemaName ? `- Rạp ${cinemaName}` : ''}</h2>
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
                placeholder="VD: Phòng 1, Phòng IMAX, Phòng 3D"
                required
              />
            </div>

            {!cinemaId && (
              <div className={styles.formGroup}>
                <label>Rạp Chiếu:</label>
                <select
                  name="cinemaId"
                  value={formData.cinemaId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">-- Chọn Rạp --</option>
                  {cinemas.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {!editingId && (
              <>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label>Số Hàng Ghế (A-Z):</label>
                    <input
                      type="number"
                      name="rows"
                      value={formData.rows}
                      onChange={handleInputChange}
                      placeholder="VD: 10"
                      min="1"
                      max="26"
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Số Ghế Mỗi Hàng:</label>
                    <input
                      type="number"
                      name="seatsPerRow"
                      value={formData.seatsPerRow}
                      onChange={handleInputChange}
                      placeholder="VD: 12"
                      min="1"
                      max="30"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label>Loại Phòng:</label>
                  <select
                    name="hallType"
                    value={formData.hallType}
                    onChange={handleInputChange}
                  >
                    <option value="Standard">Standard</option>
                    <option value="IMAX">IMAX</option>
                    <option value="VIP">VIP</option>
                  </select>
                </div>
              </>
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

      {loading ? (
        <div className={styles.loading}>Đang tải...</div>
      ) : (
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
                    <td className={styles.cinemaName}>
                      {hall.cinema_name || getCinemaNameById(hall.cinema_id)}
                    </td>
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
      )}
    </div>
  );
}
