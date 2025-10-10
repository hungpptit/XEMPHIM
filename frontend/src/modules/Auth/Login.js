import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';
import authService from '../../services/authService';

export default function Login(){
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try{
      await authService.login({ email, password });
      navigate('/');
    }catch(err){
      setError(err.message || 'Đăng nhập thất bại');
    }finally{
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <form className={styles.authForm} onSubmit={submit}>
        <h2>Đăng nhập</h2>
        {error && <div className={styles.error}>{error}</div>}
        <label>
          Email
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </label>
        <label>
          Mật khẩu
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Đang...' : 'Đăng nhập'}</button>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
          <button type="button" className={styles.secondaryBtn} onClick={() => navigate('/register')}>Đăng ký</button>
        </div>
      </form>
    </div>
  );
}
