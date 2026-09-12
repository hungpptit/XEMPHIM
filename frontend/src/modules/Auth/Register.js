import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Auth.module.css';
import authService from '../../services/authService';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const queryParams = new URLSearchParams(location.search);
  const redirectTarget = queryParams.get('redirect') || location.state?.from || null;
  const returnState = location.state || {};

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      setError('Email phải có định dạng @gmail.com (ví dụ: example@gmail.com)');
      return;
    }

    setLoading(true);
    try {
      await authService.register({ fullName, email, password, phone });
      alert('Đăng ký tài khoản thành công! Vui lòng đăng nhập để tiếp tục.');
      const loginUrl = '/login' + (redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : '');
      navigate(loginUrl, { replace: true, state: returnState });
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    const loginUrl = '/login' + (redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : '');
    navigate(loginUrl, { state: returnState });
  };

  return (
    <div className={styles.authPage}>
      <form className={styles.authForm} onSubmit={submit}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button
            type="button"
            onClick={() => redirectTarget ? navigate(redirectTarget, { state: returnState }) : navigate(-1)}
            style={{
              background: 'none',
              border: 'none',
              color: '#9CA3AF',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span>
            <span>Quay lại</span>
          </button>
          <span style={{ fontSize: '11px', color: '#D4AF37', fontWeight: 600, textTransform: 'uppercase' }}>
            VIP Member
          </span>
        </div>

        <h2>Đăng ký tài khoản</h2>
        {redirectTarget && (
          <div style={{
            fontSize: '12px',
            color: '#f2ca50',
            backgroundColor: 'rgba(212,175,55,0.1)',
            border: '1px solid rgba(212,175,55,0.3)',
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '12px'
          }}>
            Đăng ký để tiếp tục thao tác đặt vé của bạn.
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
        <label>
          Họ và tên
          <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nguyễn Văn A" required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@gmail.com" required />
        </label>
        <label>
          Mật khẩu
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
        </label>
        <label>
          Số điện thoại (không bắt buộc)
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Ví dụ: 0912345678" />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Đang đăng ký...' : 'Đăng ký'}</button>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12, fontSize: '13px', color: '#9CA3AF' }}>
          <span>Đã có tài khoản?</span>
          <button type="button" className={styles.secondaryBtn} onClick={goToLogin}>
            Đăng nhập
          </button>
        </div>
      </form>
    </div>
  );
}
