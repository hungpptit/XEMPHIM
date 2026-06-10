import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

/**
 * PublicRoute - chặn user đã đăng nhập truy cập trang công khai như login/register.
 * Nếu đã có session hợp lệ thì điều hướng về trang phù hợp bằng replace.
 */
export default function PublicRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const checkPublicAccess = async () => {
      try {
        const user = await authService.getCurrentUser();

        if (user) {
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('Error checking public route access:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPublicAccess();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Đang kiểm tra phiên đăng nhập...</p>
      </div>
    );
  }

  if (currentUser) {
    const redirectPath = currentUser.role === 'admin' ? '/admin' : '/';
    return <Navigate to={redirectPath} replace />;
  }

  return children;
}
