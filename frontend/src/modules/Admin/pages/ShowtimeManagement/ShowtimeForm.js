import React, { useState, useEffect } from 'react';
import API from '../../../../services/api';
import styles from '../MovieManagement/MovieList.module.css';

export default function ShowtimeForm({ show, onClose, onSaved, initial, showToast }) {
  const [movies, setMovies] = useState([]);
  const [halls, setHalls] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [form, setForm] = useState({
    movie_id: '', cinema_id: '', hall_id: '', start_time: '', end_time: '', base_price: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const m = await API.get('/movies?all=1');
        const listM = m.data?.movies || [];
        setMovies(listM);
      } catch (e) { setMovies([]); }

      try {
        const res = await API.get('/admin/cinemas');
        const listC = res.data?.data || res.data || [];
        setCinemas(Array.isArray(listC) ? listC : []);
      } catch (e) { setCinemas([]); }
    };
    load();
  }, []);

  // If editing an existing showtime, try to fetch the hall detail to determine cinema
  useEffect(() => {
    const loadInitialHall = async () => {
      if (initial?.hall_id) {
        try {
          const one = await API.get(`/admin/halls/${initial.hall_id}`);
          const hallObj = one.data?.data || one.data || null;
          if (hallObj) {
            // set cinema and halls for that cinema
            setForm(f => ({ ...f, cinema_id: hallObj.cinema_id ? String(hallObj.cinema_id) : '', hall_id: String(hallObj.id) }));
            try {
              const res = await API.get(`/admin/cinemas/${hallObj.cinema_id}/halls`);
              const list = res.data?.data || res.data || [];
              setHalls(Array.isArray(list) ? list : [hallObj]);
            } catch (e) {
              setHalls([hallObj]);
            }
          } else {
            setHalls([{ id: initial.hall_id, name: `Phòng #${initial.hall_id}` }]);
          }
        } catch (e) {
          setHalls([{ id: initial.hall_id, name: `Phòng #${initial.hall_id}` }]);
        }
      }
    };
    loadInitialHall();
  }, [initial]);

  const parseLocal = React.useCallback((val) => {
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
  }, []);

  const formatLocalForInput = React.useCallback((val) => {
    try {
      const d = parseLocal(val);
      if (!d) return '';
      const pad = (n) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) { return ''; }
  }, [parseLocal]);

  useEffect(() => {
    if (initial) {
      setForm({
        movie_id: initial.movie_id ? String(initial.movie_id) : '',
        cinema_id: initial.cinema_id ? String(initial.cinema_id) : '',
        hall_id: initial.hall_id ? String(initial.hall_id) : '',
        start_time: initial.start_time ? formatLocalForInput(initial.start_time) : '',
        end_time: initial.end_time ? formatLocalForInput(initial.end_time) : '',
        base_price: initial.base_price != null ? String(initial.base_price) : ''
      });
    }
  }, [initial, formatLocalForInput]);

    // When cinema is selected, load halls for that cinema
    useEffect(() => {
      const cid = form.cinema_id;
      if (!cid) return;
      const loadHalls = async () => {
        try {
          const res = await API.get(`/admin/cinemas/${cid}/halls`);
          const list = res.data?.data || res.data || [];
          setHalls(Array.isArray(list) ? list : []);
        } catch (e) {
          setHalls([]);
        }
      };
      loadHalls();
    }, [form.cinema_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // if changing cinema, reset hall selection
    if (name === 'cinema_id') {
      setForm(f => ({ ...f, cinema_id: value, hall_id: '' }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.movie_id || !form.hall_id || !form.start_time || !form.end_time) {
      setError('Vui lòng điền đầy đủ thông tin');
      return;
    }
    // client-side validation: start < end
    const s = parseLocal(form.start_time) || new Date(form.start_time);
    const eD = parseLocal(form.end_time) || new Date(form.end_time);
    if (!s || !eD || s >= eD) {
      setError('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        movie_id: parseInt(form.movie_id,10),
        hall_id: parseInt(form.hall_id,10),
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        base_price: form.base_price ? parseFloat(form.base_price) : null
      };

      if (initial && initial.id) {
        await API.put(`/showtimes/${initial.id}`, payload);
      } else {
        await API.post('/showtimes', payload);
      }

      onSaved && onSaved('Lưu suất chiếu thành công');
      showToast && showToast('Lưu suất chiếu thành công', 'success');
      onClose && onClose();
    } catch (err) {
      console.error('Save showtime error', err);
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000}}>
      <div className={styles.formContainer} style={{width:820}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <h3 style={{marginTop:0}}>{initial?.id ? `Chỉnh sửa suất chiếu #${initial.id}` : 'Tạo suất chiếu'}</h3>
        </div>
        {error && <div className={styles.errorAlert}>{error}</div>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={`${styles.formGroup} ${styles.full}`}>
              <label>Phim</label>
              <select name="movie_id" value={form.movie_id} onChange={handleChange}>
                <option value="">-- Chọn phim --</option>
                {movies.map(m => <option key={m.id} value={String(m.id)}>{m.title || m.name || m.id}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Rạp</label>
              <select name="cinema_id" value={form.cinema_id} onChange={handleChange}>
                <option value="">-- Chọn rạp --</option>
                {cinemas.map(c => <option key={c.id} value={String(c.id)}>{c.name || c.id}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Phòng</label>
              <select name="hall_id" value={form.hall_id} onChange={handleChange}>
                <option value="">-- Chọn phòng --</option>
                {halls.map(h => <option key={h.id} value={String(h.id)}>{h.name || `Phòng #${h.id}`}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Bắt đầu</label>
              <input type="datetime-local" name="start_time" value={form.start_time} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Kết thúc</label>
              <input type="datetime-local" name="end_time" value={form.end_time} onChange={handleChange} />
            </div>
          </div>

          <div className={styles.formRowInline}>
            <div className={styles.formGroup} style={{flex:1}}>
              <label>Giá cơ bản</label>
              <input name="base_price" value={form.base_price} onChange={handleChange} placeholder="0.00" />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.btnSubmit} disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu'}</button>
            <button type="button" className={styles.btnCancel} onClick={onClose}>Huỷ</button>
          </div>
        </form>
      </div>
    </div>
  );
}
