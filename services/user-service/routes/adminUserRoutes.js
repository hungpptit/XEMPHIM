import express from 'express';
import { adminAuth } from '../middleware/adminAuth.js';
import * as adminUserController from '../controllers/adminUserController.js';

const router = express.Router();

// All routes here require admin privileges
router.use(adminAuth);

router.get('/', adminUserController.getUsers);
router.put('/:id', adminUserController.updateUser);
router.delete('/:id', adminUserController.deleteUser);

export default router;
