import React, { useEffect, useState, useCallback } from 'react';
import { adminService } from '../../services/adminService';
import styles from './MovieList.module.css';

export default function MovieManagement() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    poster_url: '',
    backdrop_url: '',
    trailer_url: '',
    duration_minutes: '',
    release_date: '',
    director: '',
    status: 'coming_soon',
    genre: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  

  const loadMovies = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const pageSize = 10;
      const res = await adminService.movie.list({ page, limit: pageSize });
      // Movie service returns { movies: [...] }.
      const payload = res.data;
      const list = Array.isArray(payload?.movies) ? payload.movies : (Array.isArray(payload) ? payload : []);
      setMovies(list);
      // handle total when pagination
      if (payload.total !== undefined) setTotal(payload.total);
    } catch (err) {
      console.error('Load movies error', err);
      setError('Lỗi tải danh sách phim: ' + (err.response?.data?.error || err.message));
      setMovies([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadMovies();
  }, [loadMovies]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title) {
      setError('Vui lòng nhập tiêu đề phim');
      return;
    }

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        poster_url: formData.poster_url,
        backdrop_url: formData.backdrop_url,
        trailer_url: formData.trailer_url,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes, 10) : null,
        release_date: formData.release_date || null,
        director: formData.director,
        status: formData.status,
        genre: formData.genre
      };

      if (editingId) {
        await adminService.movie.update(editingId, payload);
        setSuccess('Cập nhật phim thành công');
      } else {
        await adminService.movie.create(payload);
        setSuccess('Thêm phim mới thành công');
      }
      setFormData({ title: '', duration: '', release_year: '', genre: '', is_available: true });
      setEditingId(null);
      setShowForm(false);
      loadMovies();
    } catch (err) {
      setError('Lỗi thao tác: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleEdit = (movie) => {
    setFormData({
      title: movie.title || '',
      description: movie.description || '',
      poster_url: movie.poster_url || movie.poster_url || '',
      backdrop_url: movie.backdrop_url || movie.backdrop_url || '',
      trailer_url: movie.trailer_url || '',
      duration_minutes: movie.duration_minutes || movie.duration || '',
      release_date: movie.release_date ? movie.release_date.split('T')[0] : (movie.release_year || ''),
      director: movie.director || '',
      status: movie.status || 'coming_soon',
      genre: movie.genre || ''
    });
    setEditingId(movie.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xoá phim này?')) return;
    try {
      await adminService.movie.delete(id);
      setSuccess('Xoá phim thành công');
      loadMovies();
    } catch (err) {
      setError('Lỗi xoá phim: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ title: '', duration: '', release_year: '', genre: '', is_available: true });
    setError('');
  };

  if (loading) return <div className={styles.loading}>Đang tải...</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🎬 Quản Lý Phim</h2>
        {!showForm && (
          <button className={styles.btnAdd} onClick={() => setShowForm(true)}>+ Thêm Phim Mới</button>
        )}
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}
      {success && <div className={styles.successAlert}>{success}</div>}

      {showForm && (
        <div className={styles.formContainer}>
          <h3>{editingId ? 'Chỉnh Sửa Phim' : 'Thêm Phim'}</h3>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Tiêu đề:</label>
                <input name="title" value={formData.title} onChange={handleInputChange} required />
              </div>
              <div className={styles.formGroup}>
                <label>Thời lượng (phút):</label>
                <input type="number" name="duration_minutes" value={formData.duration_minutes} onChange={handleInputChange} min="0" />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Ngày phát hành:</label>
                <input type="date" name="release_date" value={formData.release_date} onChange={handleInputChange} />
              </div>
              <div className={styles.formGroup}>
                <label>Đạo diễn:</label>
                <input name="director" value={formData.director} onChange={handleInputChange} />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Poster URL:</label>
                <div className={styles.mediaRow}>
                  <input name="poster_url" value={formData.poster_url} onChange={handleInputChange} placeholder="https://...jpg" />
                  {formData.poster_url && <img src={formData.poster_url} alt="poster" className={styles.posterPreview} />}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Backdrop URL:</label>
                <div className={styles.mediaRow}>
                  <input name="backdrop_url" value={formData.backdrop_url} onChange={handleInputChange} placeholder="https://...jpg" />
                  {formData.backdrop_url && <img src={formData.backdrop_url} alt="backdrop" className={styles.posterPreview} />}
                </div>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Trailer (YouTube URL):</label>
                <input name="trailer_url" value={formData.trailer_url} onChange={handleInputChange} placeholder="https://youtube.com/..." />
              </div>
              <div className={styles.formGroup}>
                <label>Trạng thái:</label>
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="now_showing">Đang chiếu</option>
                  <option value="coming_soon">Sắp chiếu</option>
                </select>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={`${styles.formGroup} ${styles.full}`}>
                <label>Mô tả:</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="4" />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.btnSubmit}>{editingId ? '💾 Cập Nhật' : '➕ Tạo Mới'}</button>
              <button type="button" className={styles.btnCancel} onClick={handleCancel}>❌ Huỷ</button>
            </div>
          </form>
        </div>
      )}

      <div className={styles.tableWrap}>
        {movies.length === 0 ? (
          <div className={styles.empty}>Chưa có phim nào. Hãy thêm phim mới.</div>
        ) : (
          <>
            <div className={styles.paginationBar}>
              <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p-1))} disabled={page<=1}>‹ Prev</button>
              <span className={styles.pageInfo}>Trang {page}{total?` / ${Math.ceil(total/10)}`:''}</span>
              <button className={styles.pageBtn} onClick={() => setPage(p => p+1)} disabled={total && page >= Math.ceil(total/10)}>Next ›</button>
            </div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>STT</th>
                <th>Poster</th>
                <th>Tiêu đề</th>
                {/* <th>Thể loại</th> */}
                <th>Thời lượng</th>
                <th>Năm</th>
                <th>Đạo diễn</th>
                <th>Trạng thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {movies.map((m, idx) => {
                const duration = m.duration_minutes || m.duration || m.duration_min || '-';
                const year = m.release_date ? new Date(m.release_date).getFullYear() : (m.release_year || '-');
                const statusText = m.status === 'now_showing' ? 'Đang chiếu' : (m.status === 'coming_soon' ? 'Sắp chiếu' : (m.status || 'Không'));
                const poster = m.poster_url || m.poster || '';
                return (
                  <tr key={m.id}>
                    <td>{idx + 1}</td>
                    <td>
                      {poster ? (
                        <img src={poster} alt={m.title} className={styles.thumb} />
                      ) : (
                        <div className={styles.noThumb}>-</div>
                      )}
                    </td>
                    <td className={styles.title}>{m.title}</td>
                    {/* <td>{m.genre || '-'}</td> */}
                    <td>{duration ? `${duration} phút` : '-'}</td>
                    <td>{year}</td>
                    <td>{m.director || '-'}</td>
                    <td>{statusText}</td>
                    <td className={styles.actions}>
                      <button className={styles.btnEdit} onClick={() => handleEdit(m)} title="Chỉnh sửa">✏️</button>
                      <button className={styles.btnDelete} onClick={() => handleDelete(m.id)} title="Xóa">🗑️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </>
        )}
      </div>
    </div>
  );
}
