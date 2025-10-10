import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import styles from './Profile.module.css';

export default function Profile(){
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const u = await authService.getCurrentUser();
      if(mounted) setUser(u);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const logout = async () => {
    await authService.logout();
    navigate('/');
  };

  if(loading) return <div className={styles.container}>Đang tải...</div>;
  if(!user) return <div className={styles.container}>Bạn chưa đăng nhập.</div>;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.title}>Hồ sơ cá nhân</h2>

        <div className={styles.formRow}>
          <label>Họ và tên</label>
          <input type="text" value={user.full_name || user.fullName || ''} readOnly />
        </div>

        <div className={styles.formRow}>
          <label>Email</label>
          <input type="email" value={user.email || ''} readOnly />
        </div>

        <div className={styles.formRow}>
          <label>Số điện thoại</label>
          <input type="text" value={user.phone_number || user.phoneNumber || ''} readOnly />
        </div>

        <div className={styles.actions}>
          <button className={styles.logoutBtn} onClick={logout}>Đăng xuất</button>
        </div>
      </div>
    </div>
  );
}
