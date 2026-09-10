import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Auth.module.css';
import authService from '../../services/authService';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Extract destination from query params or state
  const queryParams = new URLSearchParams(location.search);
  const redirectTarget = queryParams.get('redirect') || location.state?.from || null;
  const returnState = location.state || {};

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user } = await authService.login({ email, password });
      
      // If user is admin and didn't come from a specific action, redirect to admin
      if (user?.role === 'admin' && !redirectTarget) {
        navigate('/admin', { replace: true });
      } else if (redirectTarget) {
        navigate(redirectTarget, { replace: true, state: returnState });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => {
    const registerUrl = '/register' + (redirectTarget ? `?redirect=${encodeURIComponent(redirectTarget)}` : '');
    navigate(registerUrl, { state: returnState });
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

        <h2>Đăng nhập</h2>
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
            Đăng nhập để tiếp tục thao tác đặt vé của bạn.
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
        <label>
          Email
          <input 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            placeholder="example@gmail.com"
            required 
          />
        </label>
        <label>
          Mật khẩu
          <input 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            placeholder="••••••••"
            required 
          />
        </label>
        <button type="submit" disabled={loading}>
          {loading ? 'Đang xác thực...' : 'Đăng nhập'}
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12, fontSize: '13px', color: '#9CA3AF' }}>
          <span>Chưa có tài khoản?</span>
          <button type="button" className={styles.secondaryBtn} onClick={goToRegister}>
            Đăng ký ngay
          </button>
        </div>
      </form>
    </div>
  );
}
