/**
 * Admin User Service
 * Logic for managing users by Admin
 */

export const listUsers = async (User) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      order: [['created_at', 'DESC']]
    });
    return users;
  } catch (error) {
    throw new Error('Lỗi khi lấy danh sách người dùng: ' + error.message);
  }
};

export const updateUser = async (User, userId, updates) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    const allowedUpdates = ['full_name', 'phone_number', 'role'];
    const updateData = {};
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    await user.update(updateData);
    
    // Return user without password
    const updatedUser = user.toJSON();
    delete updatedUser.password_hash;
    return updatedUser;
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async (User, userId) => {
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    if (user.role === 'admin') {
      // Security: Don't allow deleting other admins via simple UI if needed, 
      // or at least prevent self-deletion if we had the current user ID
      // For now, let's just allow it or add a check.
    }

    await user.destroy();
    return { message: 'Người dùng đã được xoá thành công' };
  } catch (error) {
    throw error;
  }
};
