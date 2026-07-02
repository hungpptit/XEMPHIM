import zalopayService from '../services/zalopayService.js';
import axios from 'axios';
import { Payment, Sequelize } from '../models/index.js';
import { v4 as uuidv4 } from 'uuid';

const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://localhost:4004';

// Handler xử lý yêu cầu tạo đơn hàng thanh toán mới (tạo link QR code)
export const createOrderHandler = async (req, res) => {
  try {
    const { booking_id, booking_code, amount, description } = req.body;
    const result = await zalopayService.createOrder({ booking_id, booking_code, amount, description });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Handler xử lý yêu cầu hoàn tiền cho đơn đặt vé đã thanh toán
export const refundOrderHandler = async (req, res) => {
  try {
    const { zp_trans_id, amount, description, booking_id } = req.body;
    const result = await zalopayService.refundOrder({ zp_trans_id, amount, description, booking_id });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Webhook/Callback Handler nhận phản hồi kết quả giao dịch tự động từ ZaloPay
export const zalopayCallbackHandler = async (req, res) => {
  try {
    const { data: dataStr, mac: reqMac } = req.body;
    console.log('📬 [Webhook ZaloPay] Callback Received:', { dataStr: dataStr?.substring(0, 100), mac: reqMac });

    // Xác thực chữ ký số (MAC) từ ZaloPay gửi sang
    const isValid = zalopayService.verifyCallback(dataStr, reqMac);
    if (!isValid) {
      console.error('❌ [ZaloPay Callback] Invalid MAC signature');
      return res.json({ return_code: -1, return_message: 'mac not equal' });
    }

    const dataJson = JSON.parse(dataStr);
    const { app_trans_id, zp_trans_id, amount, embed_data } = dataJson;

    const embedObj = JSON.parse(embed_data);
    const { booking_id } = embedObj;

    if (!booking_id) {
      console.error('❌ [ZaloPay Callback] Missing booking_id in embed_data');
      return res.json({ return_code: 0, return_message: 'booking_id not found' });
    }

    // 1. Cập nhật trạng thái bản ghi thanh toán nội bộ của hệ thống sang 'paid'
    try {
      const payment = await Payment.findOne({
        where: { booking_id, status: 'pending' },
        order: [['created_at', 'DESC']]
      });

      if (payment) {
        payment.status = 'paid';
        payment.transaction_ref = zp_trans_id;
        payment.payment_code = app_trans_id;
        payment.response_code = '1';
        payment.amount = amount;
        await payment.save();
        console.log(`✅ [ZaloPay Callback] Internal Payment updated to 'paid' for booking ${booking_id}`);
      } else {
        await Payment.create({
          booking_id,
          payment_method: 'zalopay',
          payment_code: app_trans_id,
          amount: amount,
          qr_url: null,
          expire_at: null,
          status: 'paid',
          transaction_ref: zp_trans_id,
          response_code: '1',
          created_at: new Date().toISOString()
        });
        console.log(`✅ [ZaloPay Callback] Internal Payment created as 'paid' for booking ${booking_id}`);
      }
    } catch (dbErr) {
      console.error('⚠️ [ZaloPay Callback] Failed to update Payment in DB:', dbErr.message);
    }

    // 2. Gọi API của Booking Service để hoàn tất xác nhận đặt vé và gửi mail thông báo
    try {
      const response = await axios.post(`${BOOKING_SERVICE}/api/bookings/${booking_id}/confirm-payment`, {
        payment_method: 'zalopay',
        payment_payload: {
          transaction_ref: zp_trans_id,
          app_trans_id: app_trans_id,
          response_code: '1',
          amount: amount
        }
      });
      if (response.data && response.data.booking) {
        console.log(`✅ [ZaloPay Callback] Booking ${booking_id} confirmed via booking-service`);
        return res.json({ return_code: 1, return_message: 'success' });
      } else {
        return res.json({ return_code: 0, return_message: 'Failed to confirm booking status' });
      }
    } catch (apiErr) {
      console.error('❌ [ZaloPay Callback] Failed calling Booking Service confirmPayment API:', apiErr.message);
      return res.json({ return_code: 0, return_message: apiErr.message });
    }
  } catch (error) {
    console.error('💥 [ZaloPay Callback] Error:', error);
    return res.status(500).json({ return_code: 0, return_message: 'Internal server error' });
  }
};

// Handler truy vấn trực tiếp trạng thái đơn hàng từ ZaloPay
export const queryOrderHandler = async (req, res) => {
  try {
    const { app_trans_id } = req.params;
    const result = await zalopayService.queryOrder(app_trans_id);
    res.json(result);
  } catch (error) {
    console.error('Error querying ZaloPay order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Handler truy vấn trạng thái yêu cầu hoàn tiền từ ZaloPay
export const queryRefundHandler = async (req, res) => {
  try {
    const { m_refund_id } = req.params;
    const result = await zalopayService.queryRefund(m_refund_id);
    res.json(result);
  } catch (error) {
    console.error('Error querying ZaloPay refund:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Truy vấn thông tin bản ghi thanh toán theo ID đặt vé (phục vụ giao tiếp nội bộ giữa các services)
export const getPaymentByBooking = async (req, res) => {
  try {
    const { booking_id } = req.params;
    const { status } = req.query;
    const where = { booking_id };
    if (status) where.status = status;

    const payment = await Payment.findOne({
      where,
      order: [['created_at', 'DESC']]
    });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Tạo bản ghi thanh toán mới trong Database (phục vụ giao tiếp nội bộ giữa các services)
export const createPaymentRecord = async (req, res) => {
  try {
    const payment = await Payment.create({
      booking_id: req.body.booking_id,
      payment_method: req.body.payment_method,
      payment_code: req.body.payment_code,
      amount: req.body.amount,
      qr_url: req.body.qr_url,
      expire_at: req.body.expire_at,
      status: req.body.status,
      transaction_ref: req.body.transaction_ref,
      response_code: req.body.response_code,
      secure_hash: req.body.secure_hash,
      created_at: req.body.created_at || new Date().toISOString()
    });
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Cập nhật bản ghi thanh toán trong Database (phục vụ giao tiếp nội bộ giữa các services)
export const updatePaymentRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findByPk(id);
    if (!payment) return res.status(404).json({ message: 'Payment record not found' });
    
    await payment.update(req.body);
    res.json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Vô hiệu hóa (void) các giao dịch thanh toán đang ở trạng thái pending khi booking bị hủy
export const voidPendingPayments = async (req, res) => {
  try {
    const { booking_id } = req.body;
    const [count] = await Payment.update(
      { status: 'void' },
      { where: { booking_id, status: 'pending' } }
    );
    res.json({ success: true, voidedCount: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Đánh dấu hết hạn các bản ghi thanh toán pending quá thời hạn
export const expirePendingPaymentsRecord = async (req, res) => {
  try {
    const now = new Date().toISOString();
    const expiredPayments = await Payment.findAll({
      where: {
        status: 'pending',
        expire_at: { [Sequelize.Op.lt]: Sequelize.literal(`'${now}'`) }
      }
    });

    if (expiredPayments.length === 0) {
      return res.json({ expiredCount: 0, bookingIds: [] });
    }

    const paymentIds = expiredPayments.map(p => p.id);
    const bookingIds = expiredPayments.map(p => p.booking_id);

    await Payment.update(
      { status: 'expired' },
      { where: { id: paymentIds } }
    );

    res.json({ expiredCount: expiredPayments.length, bookingIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
