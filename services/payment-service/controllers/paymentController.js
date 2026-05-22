import zalopayService from '../services/zalopayService.js';
import axios from 'axios';

const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://localhost:4004';

export const createOrderHandler = async (req, res) => {
  try {
    const { booking_id, booking_code, amount, description } = req.body;
    const result = await zalopayService.createOrder({ booking_id, booking_code, amount, description });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const refundOrderHandler = async (req, res) => {
  try {
    const { zp_trans_id, amount, description, booking_id } = req.body;
    const result = await zalopayService.refundOrder({ zp_trans_id, amount, description, booking_id });
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const zalopayCallbackHandler = async (req, res) => {
  try {
    const { data: dataStr, mac: reqMac } = req.body;
    console.log('📬 [Webhook ZaloPay] Callback Received:', { dataStr: dataStr?.substring(0, 100), mac: reqMac });

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

    // Call Booking Service to process DB confirmation and send notifications
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
