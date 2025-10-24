import express from 'express';
import zalopayController from '../controllers/zalopayController.js';

const router = express.Router();

// Webhook callback từ ZaloPay
router.post('/callback', zalopayController.zalopayCallbackHandler);

// Query order status (optional - for debugging)
router.get('/query/:app_trans_id', zalopayController.queryOrderHandler);

// Query refund status (optional - for debugging)
router.get('/query-refund/:m_refund_id', zalopayController.queryRefundHandler);

export default router;
