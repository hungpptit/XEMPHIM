import React, { useEffect, useState, useMemo } from 'react';
import API from '../../../../services/api';
import styles from '../MovieManagement/MovieList.module.css';
import { FaEdit, FaTrashAlt, FaPlus, FaCalendarAlt, FaSync } from 'react-icons/fa';
import ShowtimeForm from './ShowtimeForm';
import Toast from '../../../../components/Toast';

export default function ShowtimeList() {
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [dateFilter, setDateFilter] = useState('');
  const [moviesMap, setMoviesMap] = useState({});
  const [hallsMap, setHallsMap] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(t => [...t, { id, message, type, duration }]);
    return id;
  };
  const removeToast = (id) => setToasts(t => t.filter(x => x.id !== id));

  const fetchMovies = async () => {
    try {
      const res = await API.get('/movies?all=1');
      const payload = res.data;
      const list = payload?.movies || (Array.isArray(payload) ? payload : []);
      const map = {};
      list.forEach(m => { map[m.id] = m.title || m.name || `#${m.id}`; });
      setMoviesMap(map);
    } catch (err) {
      console.error('Error fetching movies for map', err);
      setMoviesMap({});
    }
    // fetch halls for map
    try {
      const resH = await API.get('/admin/halls');
      const listH = resH.data || [];
      const hmap = {};
      listH.forEach(h => { hmap[h.id] = h.name || `#${h.id}`; });
      setHallsMap(hmap);
    } catch (err) {
      setHallsMap({});
    }
  };

  const fetchShowtimes = async (date) => {
    setLoading(true);
    try {
      const url = date ? `/showtimes?date=${date}` : '/showtimes';
      const res = await API.get(url);
      setShowtimes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching showtimes', err);
      setShowtimes([]);
    } finally {
      setLoading(false);
    }
  };

  // intentionally run once on mount; dateFilter is handled by separate effect below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchMovies(); fetchShowtimes(dateFilter); }, []);

  useEffect(() => { fetchShowtimes(dateFilter); setPage(1); }, [dateFilter]);

  const totalPages = Math.max(1, Math.ceil(showtimes.length / pageSize));

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return showtimes.slice(start, start + pageSize);
  }, [showtimes, page]);

  const isPast = (st) => {
    try { const d = parseLocal(st.end_time) || new Date(st.end_time); return d < new Date(); } catch (e) { return false; }
  };

  // Parse database timestamp strings as local Date (avoid timezone conversion from UTC)
  const parseLocal = (val) => {
    if (!val) return null;
    if (val instanceof Date) return val;
    const s = String(val);
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      const y = parseInt(m[1], 10);
      const mo = parseInt(m[2], 10) - 1;
      const d = parseInt(m[3], 10);
      const hh = parseInt(m[4], 10);
      const mm = parseInt(m[5], 10);
      const ss = m[6] ? parseInt(m[6], 10) : 0;
      return new Date(y, mo, d, hh, mm, ss);
    }
    const dd = new Date(s);
    return isNaN(dd.getTime()) ? null : dd;
  };

  const handleDelete = async (id, st) => {
    if (isPast(st)) { showToast('Suất chiếu đã kết thúc, không thể xóa', 'error'); return; }
    if (!window.confirm('Xóa suất chiếu này?')) return;
    try {
      await API.delete(`/showtimes/${id}`);
      await fetchShowtimes(dateFilter);
      showToast('Xóa thành công', 'success');
      setPage(1);
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Lỗi khi xóa suất chiếu', 'error');
    }
  };

  const handleEditClick = (st) => {
    setEditing(st);
    setShowForm(true);
  };

  const handleSaved = async (msg) => {
    await fetchMovies(); // Refresh names/halls maps
    await fetchShowtimes(dateFilter);
    if (msg) showToast(msg, 'success');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🎟️ Quản Lý Suất Chiếu</h2>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <button className={styles.primaryBtn} onClick={() => { setEditing(null); setShowForm(true); }}>
            <FaPlus /> Tạo suất chiếu
          </button>
          <div className={styles.filterGroup}>
            <input type="date" className={styles.dateInput} value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
            <button className={styles.clearFilterBtn} onClick={() => { setDateFilter(''); fetchShowtimes(''); }}>
              <FaSync /> Hiển thị tất cả
            </button>
          </div>
          <span className={styles.statsBadge}>
            <FaCalendarAlt /> Tổng {showtimes.length} suất
          </span>
        </div>
      </div>

      {loading ? <div className={styles.loading}>Đang tải...</div> : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>ID</th>
                  <th>Phim</th>
                  <th>Phòng</th>
                  <th>Bắt đầu</th>
                  <th>Kết thúc</th>
                  <th>Giá</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 && (
                  <tr><td colSpan={8} className={styles.empty}>Không có suất chiếu.</td></tr>
                )}
                {pageItems.map((st, idx) => (
                  <tr key={st.id}>
                    <td>{(page-1)*pageSize + idx + 1}</td>
                    <td>{st.id}</td>
                    <td>
                      <div style={{fontWeight:600}}>{st.movie_title}</div>
                    </td>
                    <td>
                      <div>{st.hall_name}</div>
                      <div style={{fontSize:11, color:'#888'}}>{st.cinema_name}</div>
                    </td>
                    <td>{(parseLocal(st.start_time) || new Date(st.start_time)).toLocaleString()}</td>
                    <td>{(parseLocal(st.end_time) || new Date(st.end_time)).toLocaleString()}</td>
                    <td>{st.base_price || '-'}</td>
                    <td className={styles.actions}>
                      <button className={styles.btnEdit} title="Chỉnh sửa" onClick={() => handleEditClick(st)}>
                        <FaEdit />
                      </button>
                      <button
                        className={styles.btnDelete}
                        title={isPast(st) ? 'Không thể xóa suất đã chiếu' : 'Xóa'}
                        onClick={() => handleDelete(st.id, st)}
                        disabled={isPast(st)}
                        style={isPast(st) ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                      >
                        <FaTrashAlt />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.paginationBar}>
            <button className={styles.pageBtn} disabled={page<=1} onClick={() => setPage(p => Math.max(1, p-1))}>‹ Prev</button>
            <span className={styles.pageInfo}>Trang {page} / {totalPages}</span>
            <button className={styles.pageBtn} disabled={page>=totalPages} onClick={() => setPage(p => Math.min(totalPages, p+1))}>Next ›</button>
          </div>
        </>
      )}
      {showForm && (
        <ShowtimeForm show={showForm} initial={editing} onClose={() => { setShowForm(false); setEditing(null); }} onSaved={handleSaved} showToast={showToast} />
      )}

      {toasts.map(t => (
        <Toast key={t.id} id={t.id} message={t.message} type={t.type} duration={t.duration} onClose={removeToast} />
      ))}
    </div>
  );
}
