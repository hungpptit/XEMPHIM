import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

/**
 * ProtectedRoute component - bảo vệ các route chỉ dành cho Admin
 * Nếu user không phải admin hoặc chưa đăng nhập, sẽ điều hướng về trang chủ
 */
export default function ProtectedRoute({ children, requiredRole = 'admin' }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Error checking auth:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen to auth changes
    const onAuthChanged = () => {
      checkAuth();
    };
    window.addEventListener('authChanged', onAuthChanged);
    return () => window.removeEventListener('authChanged', onAuthChanged);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Đang kiểm tra quyền hạn...</p>
      </div>
    );
  }

  // Kiểm tra nếu user tồn tại và có role yêu cầu
  if (!user || user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
