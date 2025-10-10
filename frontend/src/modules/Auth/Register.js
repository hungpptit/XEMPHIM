import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Auth.module.css';
import authService from '../../services/authService';

export default function Register(){
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try{
      await authService.register({ fullName, email, password, phone });
      navigate('/login');
    }catch(err){
      setError(err.message || 'Đăng ký thất bại');
    }finally{
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <form className={styles.authForm} onSubmit={submit}>
        <h2>Đăng ký</h2>
        {error && <div className={styles.error}>{error}</div>}
        <label>
          Họ và tên
          <input type="text" value={fullName} onChange={e=>setFullName(e.target.value)} required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
        </label>
        <label>
          Mật khẩu
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
        </label>
        <label>
          Số điện thoại (không bắt buộc)
          <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Ví dụ: 0912345678" />
        </label>
        <button type="submit" disabled={loading}>{loading ? 'Đang...' : 'Đăng ký'}</button>
      </form>
    </div>
  );
}
