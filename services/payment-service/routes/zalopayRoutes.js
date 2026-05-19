import express from 'express';
import {
  zalopayCallbackHandler,
  queryOrderHandler,
  queryRefundHandler
} from '../controllers/paymentController.js';

const router = express.Router();

router.post('/callback', zalopayCallbackHandler);
router.get('/query/:app_trans_id', queryOrderHandler);
router.get('/query-refund/:m_refund_id', queryRefundHandler);

export default router;
