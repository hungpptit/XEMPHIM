import React, { useEffect, useMemo, useState } from 'react';
import { FaEdit, FaTrashAlt, FaEye } from 'react-icons/fa';
import { useLocation, useParams } from 'react-router-dom';
import { adminService } from '../../services/adminService';
import styles from './HallList.module.css';

export default function HallManagement() {
  const params = useParams();
  const location = useLocation();
  const cinemaId = useMemo(() => {
    if (params.cinemaId) return params.cinemaId;
    const match = location.pathname.match(/^\/admin\/halls\/(\d+)$/);
    return match?.[1] || '';
  }, [params.cinemaId, location.pathname]);
  
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
    vipRows: '2'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [selectedHall, setSelectedHall] = useState(null);
  const [hallDetail, setHallDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadCinemaName = React.useCallback(async () => {
    try {
      const response = await adminService.cinema.getById(cinemaId);
      const data = response.data?.data || response.data;
      if (data) {
        setCinemaName(data.name);
      }
    } catch (err) {
      console.error('Error loading cinema name:', err);
    }
  }, [cinemaId]);

  const loadCinemas = React.useCallback(async () => {
    try {
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
      setCinemas([]);
    }
  }, []);

  const loadHalls = React.useCallback(async () => {
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
  }, [cinemaId]);

  useEffect(() => {
    loadHalls();
    loadCinemas();
    if (cinemaId) {
      loadCinemaName();
    }
  }, [cinemaId, loadHalls, loadCinemas, loadCinemaName]);

  useEffect(() => {
    if (cinemaId) {
      setFormData(prev => ({ ...prev, cinemaId: cinemaId }));
    }
  }, [cinemaId]);

  useEffect(() => {
    if (!showForm) {
      return undefined;
    }

    // Add one local history state so browser Back closes the form first.
    window.history.pushState({ hallFormOpen: true }, '', window.location.href);

    const handlePopState = () => {
      setShowForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        cinemaId: cinemaId || '',
        rows: '10',
        seatsPerRow: '12',
        vipRows: '2'
      });
      setError('');
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showForm, cinemaId]);


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
          vipRows: parseInt(formData.vipRows, 10)
        };
        await adminService.hall.create(createData);
        setSuccess('Tạo phòng chiếu mới thành công!');
      }
      
      setFormData({
        name: '',
        cinemaId: cinemaId || '',
        rows: '10',
        seatsPerRow: '12',
        vipRows: '2',
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
      vipRows: '0'
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

  const handleViewSeats = async (hall) => {
    setSelectedHall(hall);
    setShowSeatModal(true);
    setLoadingDetail(true);
    setHallDetail(null);
    try {
      const response = await adminService.hall.getDetail(hall.id);
      setHallDetail(response.data?.data || response.data);
    } catch (err) {
      console.error('Error loading hall detail:', err);
      setError('Lỗi tải sơ đồ ghế: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleCloseModal = () => {
    setShowSeatModal(false);
    setHallDetail(null);
    setSelectedHall(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      cinemaId: cinemaId || '',
      rows: '10',
      seatsPerRow: '12',
      vipRows: '2'
    });
    setError('');
  };

  const getCinemaNameById = (id) => {
    const cinema = cinemas.find(c => Number(c.id) === Number(id));
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
                  <label>Số Hàng Ghế VIP (từ dưới lên):</label>
                  <input
                    type="number"
                    name="vipRows"
                    value={formData.vipRows}
                    onChange={handleInputChange}
                    placeholder="VD: 2"
                    min="0"
                    max={formData.rows}
                    required
                  />
                  <small style={{ color: '#666', fontSize: '0.8rem', display: 'block', marginTop: '4px' }}>
                    Các hàng ghế phía sau sẽ được thiết lập là VIP (+50.000đ giá vé)
                  </small>
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
                        className={styles.btnView}
                        onClick={() => handleViewSeats(hall)}
                        title="Xem sơ đồ ghế"
                        aria-label={`Xem sơ đồ ghế phòng ${hall.name}`}
                      >
                        <FaEye />
                      </button>
                      <button 
                        className={styles.btnEdit}
                        onClick={() => handleEdit(hall)}
                        title="Chỉnh sửa"
                        aria-label={`Chỉnh sửa phòng ${hall.name}`}
                      >
                        <FaEdit />
                      </button>
                      <button 
                        className={styles.btnDelete}
                        onClick={() => handleDelete(hall.id)}
                        title="Xóa"
                        aria-label={`Xóa phòng ${hall.name}`}
                      >
                        <FaTrashAlt />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showSeatModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Sơ đồ ghế: {selectedHall?.name}</h3>
              <button className={styles.btnClose} onClick={handleCloseModal}>×</button>
            </div>
            <div className={styles.modalBody}>
              {loadingDetail ? (
                <div className={styles.modalLoading}>Đang tải sơ đồ ghế...</div>
              ) : hallDetail ? (
                <div className={styles.seatMapContainer}>
                  <div className={styles.screen}>MÀN HÌNH</div>
                  <div className={styles.seatGrid}>
                    {Object.entries(hallDetail.seatLayout || {}).map(([rowLetter, seats]) => (
                      <div key={rowLetter} className={styles.seatRow}>
                        <div className={styles.rowLabel}>{rowLetter}</div>
                        <div className={styles.rowSeats}>
                          {seats.map(seat => (
                            <div 
                              key={`${rowLetter}${seat.number}`} 
                              className={`${styles.seat} ${styles[seat.type?.toLowerCase()] || styles.regular}`}
                              title={`Ghế ${rowLetter}${seat.number} - ${seat.type === 'vip' ? 'VIP' : 'Thường'}`}
                            >
                              {seat.number}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className={styles.legend}>
                    <div className={styles.legendItem}>
                      <div className={`${styles.seat} ${styles.regular}`}></div>
                      <span>Ghế Thường</span>
                    </div>
                    <div className={styles.legendItem}>
                      <div className={`${styles.seat} ${styles.vip}`}></div>
                      <span>Ghế VIP</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.modalError}>Không thể tải sơ đồ ghế.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
