import zalopayService from '../services/zalopayService.js';
import bookingService from '../services/bookingService.js';

/**
 * Webhook callback từ ZaloPay khi thanh toán thành công
 * POST /api/zalopay/callback
 */
export const zalopayCallbackHandler = async (req, res) => {
  try {
    const { data: dataStr, mac: reqMac } = req.body;
    
    console.log('📬 [ZaloPay Callback] Received:', {
      dataStr: dataStr?.substring(0, 100),
      mac: reqMac
    });

    // 1. Verify MAC signature
    const isValid = zalopayService.verifyCallback(dataStr, reqMac);
    if (!isValid) {
      console.error('❌ [ZaloPay Callback] Invalid MAC signature');
      return res.json({ 
        return_code: -1, 
        return_message: 'mac not equal' 
      });
    }

    // 2. Parse data
    const dataJson = JSON.parse(dataStr);
    const { 
      app_trans_id, 
      zp_trans_id, 
      amount,
      embed_data 
    } = dataJson;

    console.log('✅ [ZaloPay Callback] Valid payment:', {
      app_trans_id,
      zp_trans_id,
      amount
    });

    // 3. Parse embed_data to get booking info
    const embedObj = JSON.parse(embed_data);
    const { booking_id, booking_code } = embedObj;

    if (!booking_id) {
      console.error('❌ [ZaloPay Callback] Missing booking_id in embed_data');
      return res.json({ 
        return_code: 0, 
        return_message: 'booking_id not found' 
      });
    }

    // 4. Confirm payment in booking service
    const confirmResult = await bookingService.confirmPayment({
      booking_id: Number(booking_id),
      payment_method: 'zalopay',
      payment_payload: {
        transaction_ref: zp_trans_id,
        app_trans_id: app_trans_id,
        response_code: '1',
        amount: amount
      }
    });

    if (confirmResult.success) {
      console.log(`✅ [ZaloPay Callback] Booking ${booking_id} confirmed successfully`);
      return res.json({ 
        return_code: 1, 
        return_message: 'success' 
      });
    } else {
      console.error(`❌ [ZaloPay Callback] Failed to confirm booking ${booking_id}:`, confirmResult.message);
      return res.json({ 
        return_code: 0, 
        return_message: confirmResult.message 
      });
    }

  } catch (error) {
    console.error('💥 [ZaloPay Callback] Error:', error);
    return res.status(500).json({ 
      return_code: 0, 
      return_message: 'Internal server error' 
    });
  }
};

/**
 * Query order status (for testing/debugging)
 * GET /api/zalopay/query/:app_trans_id
 */
export const queryOrderHandler = async (req, res) => {
  try {
    const { app_trans_id } = req.params;
    
    const result = await zalopayService.queryOrder(app_trans_id);
    
    res.json(result);
  } catch (error) {
    console.error('Error querying ZaloPay order:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
};

/**
 * Query refund status
 * GET /api/zalopay/query-refund/:m_refund_id
 */
export const queryRefundHandler = async (req, res) => {
  try {
    const { m_refund_id } = req.params;
    
    console.log('🔍 [ZaloPay] Querying refund status:', m_refund_id);
    
    const result = await zalopayService.queryRefund(m_refund_id);
    
    res.json(result);
  } catch (error) {
    console.error('Error querying ZaloPay refund:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message
    });
  }
};

export default {
  zalopayCallbackHandler,
  queryOrderHandler,
  queryRefundHandler
};
