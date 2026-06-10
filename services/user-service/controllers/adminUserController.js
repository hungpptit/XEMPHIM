import * as adminUserService from '../services/adminUserService.js';

export const getUsers = async (req, res) => {
  try {
    const { User } = req.app.locals.models;
    const users = await adminUserService.listUsers(User);
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { User } = req.app.locals.models;
    const user = await adminUserService.updateUser(User, id, updates);
    res.json({
      success: true,
      message: 'Cập nhật người dùng thành công',
      data: user
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { User } = req.app.locals.models;
    const result = await adminUserService.deleteUser(User, id);
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
