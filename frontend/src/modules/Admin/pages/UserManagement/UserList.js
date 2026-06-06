import React, { useEffect, useState, useCallback } from 'react';
import { FaTrashAlt, FaUserEdit, FaUserTag, FaSearch } from 'react-icons/fa';
import { adminService } from '../../services/adminService';
import styles from './UserList.module.css';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Edit State
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: 'user',
    phone_number: ''
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminService.user.list();
      setUsers(response.data?.data || response.data || []);
    } catch (err) {
      setError('Lỗi tải danh sách người dùng: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleEditClick = (user) => {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      role: user.role || 'user',
      phone_number: user.phone_number || ''
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await adminService.user.update(editingUser.id, editForm);
      setSuccess('Cập nhật người dùng thành công!');
      setEditingUser(null);
      loadUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Lỗi cập nhật: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Bạn có chắc muốn xoá người dùng "${name}"?`)) {
      try {
        await adminService.user.delete(id);
        setSuccess('Xoá người dùng thành công!');
        loadUsers();
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Lỗi xoá người dùng: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone_number?.includes(searchTerm)
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>👥 Quản Lý Người Dùng</h2>
        <div className={styles.searchBar}>
          <FaSearch className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên, email hoặc SĐT..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}
      {success && <div className={styles.successAlert}>{success}</div>}

      {editingUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Chỉnh sửa người dùng: {editingUser.email}</h3>
            <form onSubmit={handleUpdate}>
              <div className={styles.formGroup}>
                <label>Họ tên:</label>
                <input 
                  type="text" 
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({...editForm, full_name: e.target.value})}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Số điện thoại:</label>
                <input 
                  type="text" 
                  value={editForm.phone_number}
                  onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Vai trò:</label>
                <select 
                  value={editForm.role}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="submit" className={styles.btnSave}>Lưu thay đổi</button>
                <button type="button" className={styles.btnCancel} onClick={() => setEditingUser(null)}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className={styles.tableCard}>
        {loading ? (
          <div className={styles.loading}>Đang tải danh sách người dùng...</div>
        ) : filteredUsers.length > 0 ? (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Người dùng</th>
                <th>Số điện thoại</th>
                <th>Vai trò</th>
                <th>Ngày tham gia</th>
                <th className={styles.textCenter}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td className={styles.userId}>#{user.id}</td>
                  <td>
                    <div className={styles.userInfo}>
                      <div className={styles.userAvatar}>
                        {(user.full_name || user.email || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.userName}>{user.full_name || 'Chưa đặt tên'}</div>
                        <div className={styles.userEmail}>{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className={styles.userPhone}>{user.phone_number || '-'}</td>
                  <td>
                    <span className={`${styles.roleBadge} ${user.role === 'admin' ? styles.admin : styles.user}`}>
                      {user.role === 'admin' ? 'QUẢN TRỊ VIÊN' : 'KHÁCH HÀNG'}
                    </span>
                  </td>
                  <td className={styles.userDate}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN') : '-'}
                  </td>
                  <td className={styles.actions}>
                    <button className={styles.btnEdit} onClick={() => handleEditClick(user)} title="Chỉnh sửa">
                      <FaUserEdit />
                    </button>
                    <button className={styles.btnDelete} onClick={() => handleDelete(user.id, user.full_name || user.email)} title="Xóa">
                      <FaTrashAlt />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.empty}>
            <p>Không tìm thấy người dùng nào phù hợp với tìm kiếm.</p>
          </div>
        )}
      </div>
    </div>
  );
}
