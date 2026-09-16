import axios from 'axios';
import CryptoJS from 'crypto-js';
import moment from 'moment';

// Cấu hình môi trường tích hợp cổng thanh toán ZaloPay (Sandbox)
const config = {
  app_id: process.env.APP_ID || '2554',
  key1: process.env.KEY1 || 'sdngKKJmqEMzvh5QQcdD2A9XBSKUNaYn',
  key2: process.env.KEY2 || 'trMrHtvjo6myautxDUiAcYsVtaeQ8nhf',
  endpoint: process.env.ZALOPAY_ENDPOINT || 'https://sb-openapi.zalopay.vn',
  callback_url: process.env.ZALOPAY_CALLBACK_URL || 'https://unsentiently-fattenable-daria.ngrok-free.dev/api/zalopay/callback'
};

// Tạo đơn hàng thanh toán ZaloPay (Sinh liên kết quét mã QR thanh toán)
export const createOrder = async ({ booking_id, booking_code, amount, description }) => {
  try {
    // Sinh mã app_trans_id duy nhất cho đơn hàng theo định dạng YYMMDD_idNgauNhien
    const transID = Math.floor(Math.random() * 1000000);
    const app_trans_id = `${moment().format('YYMMDD')}_${transID}`;
    
    // Xây dựng payload đối tượng đơn hàng theo đặc tả yêu cầu của ZaloPay (Adapter)
    const order = {
      app_id: config.app_id,
      app_trans_id,
      app_user: `user_${booking_id}`,
      app_time: Date.now(),
      amount: Math.round(Number(amount)),
      item: JSON.stringify([{
        itemid: booking_id.toString(),
        itemname: `Ve phim - ${booking_code}`,
        itemprice: Math.round(Number(amount)),
        itemquantity: 1
      }]),
      embed_data: JSON.stringify({
        booking_id,
        booking_code,
        redirecturl: 'https://xemphim.com/payment-success'
      }),
      callback_url: config.callback_url,
      description: description || `Thanh toan ve phim ${booking_code}`,
      bank_code: ''
    };

    // Chuỗi dữ liệu thô để tạo chữ ký số (MAC) gửi sang ZaloPay để chống giả mạo
    // Công thức: app_id|app_trans_id|app_user|amount|app_time|embed_data|item
    const data = `${config.app_id}|${app_trans_id}|${order.app_user}|${order.amount}|${order.app_time}|${order.embed_data}|${order.item}`;
    // Sử dụng thuật toán HMAC-SHA256 kết hợp Key1 để sinh chữ ký số (MAC)
    order.mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    console.log('📤 [ZaloPay] Creating order:', {
      app_trans_id,
      booking_id,
      booking_code,
      amount: order.amount,
      callback_url: config.callback_url
    });

    const result = await axios.post(`${config.endpoint}/v2/create`, null, {
      params: order,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    // return_code: 1 = ZaloPay TẠO ORDER thành công (CHƯA thanh toán)
    // Thanh toán thực sự chỉ xác nhận khi ZaloPay gọi callback về /api/zalopay/callback
    console.log('✅ [ZaloPay] Order created (chờ user quét QR, CHƯA thanh toán):', {
      app_trans_id,
      zalopay_return_code: result.data.return_code,        // 1 = tạo order OK
      zalopay_return_message: result.data.return_message,  // ZaloPay tự trả, ko phải trạng thái thanh toán
      order_url: result.data.order_url ? '(có QR URL)' : '(không có)'
    });

    return {
      success: result.data.return_code === 1,
      app_trans_id,
      order_url: result.data.order_url,
      zp_trans_token: result.data.zp_trans_token,
      return_code: result.data.return_code,
      return_message: result.data.return_message
    };
  } catch (error) {
    console.error('❌ [ZaloPay] Error creating order:', error.response?.data || error.message);
    throw error;
  }
};

// Xác thực tính hợp lệ của chữ ký số (MAC) nhận từ Webhook/Callback của ZaloPay
export const verifyCallback = (dataStr, receivedMac) => {
  try {
    // Tính toán lại mã MAC dựa trên dữ liệu nhận được và Key2 (khóa nhận callback)
    const mac = CryptoJS.HmacSHA256(dataStr, config.key2).toString();
    const isValid = mac === receivedMac;
    
    console.log('🔐 [ZaloPay] Callback MAC verification:', {
      received: receivedMac,
      calculated: mac,
      valid: isValid
    });
    
    return isValid;
  } catch (error) {
    console.error('❌ [ZaloPay] Error verifying callback:', error);
    return false;
  }
};

// Truy vấn trạng thái giao dịch thanh toán từ ZaloPay bằng mã app_trans_id
export const queryOrder = async (app_trans_id) => {
  try {
    // Chuỗi tạo chữ ký truy vấn: app_id|app_trans_id|key1
    const data = `${config.app_id}|${app_trans_id}|${config.key1}`;
    const mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    const params = {
      app_id: config.app_id,
      app_trans_id,
      mac
    };

    console.log('🔍 [ZaloPay] Querying order:', app_trans_id);

    const result = await axios.post(`${config.endpoint}/v2/query`, null, {
      params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log('📊 [ZaloPay] Query result:', result.data);

    return {
      success: result.data.return_code === 1,
      return_code: result.data.return_code,
      return_message: result.data.return_message,
      is_processing: result.data.is_processing,
      amount: result.data.amount,
      zp_trans_id: result.data.zp_trans_id
    };
  } catch (error) {
    console.error('❌ [ZaloPay] Error querying order:', error.response?.data || error.message);
    throw error;
  }
};

// Yêu cầu hoàn tiền (Refund) đơn đặt vé đã thanh toán thành công qua ZaloPay
export const refundOrder = async ({ zp_trans_id, amount, description, booking_id }) => {
  try {
    const timestamp = Date.now();
    const refundID = Math.floor(Math.random() * 1000000);
    // Sinh mã hoàn tiền duy nhất m_refund_id theo định dạng YYMMDD_appid_idNgauNhien
    const m_refund_id = `${moment().format('YYMMDD')}_${config.app_id}_${refundID}`;
    
    const zpTransIdStr = String(zp_trans_id);
    const refundAmount = Math.round(Number(amount));
    const refundFeeAmount = 0;
    
    // Tạo chuỗi thô để ký số hoàn tiền theo định dạng quy định của ZaloPay
    const macInput = `${config.app_id}|${zpTransIdStr}|${refundAmount}|${refundFeeAmount}|${description}|${timestamp}`;
    const mac = CryptoJS.HmacSHA256(macInput, config.key1).toString();

    const refundData = {
      app_id: Number(config.app_id),
      m_refund_id,
      zp_trans_id: zpTransIdStr,
      amount: refundAmount,
      refund_fee_amount: refundFeeAmount,
      timestamp,
      description,
      mac
    };

    console.log('💸 [ZaloPay] Creating refund:', {
      m_refund_id,
      zp_trans_id: zpTransIdStr,
      amount: refundAmount,
      refund_fee_amount: refundFeeAmount,
      description,
      mac_input: macInput,
      mac: mac.substring(0, 20) + '...'
    });

    const result = await axios.post(`${config.endpoint}/v2/refund`, refundData, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log('✅ [ZaloPay] Refund response:', result.data);

    const isSuccess = result.data.return_code === 1 || result.data.return_code === 3;

    return {
      success: isSuccess,
      m_refund_id,
      refund_id: result.data.refund_id,
      return_code: result.data.return_code,
      return_message: result.data.return_message,
      sub_return_code: result.data.sub_return_code,
      sub_return_message: result.data.sub_return_message
    };
  } catch (error) {
    console.error('❌ [ZaloPay] Error creating refund:', error.response?.data || error.message);
    throw error;
  }
};

// Truy vấn trạng thái của yêu cầu hoàn tiền (Refund) bằng mã m_refund_id
export const queryRefund = async (m_refund_id) => {
  try {
    const timestamp = Date.now();
    const data = `${config.app_id}|${m_refund_id}|${timestamp}`;
    const mac = CryptoJS.HmacSHA256(data, config.key1).toString();

    const params = {
      app_id: config.app_id,
      m_refund_id,
      timestamp,
      mac
    };

    console.log('🔍 [ZaloPay] Querying refund:', m_refund_id);

    const result = await axios.post(`${config.endpoint}/v2/query_refund`, null, {
      params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    console.log('📊 [ZaloPay] Refund query result:', result.data);

    return {
      success: result.data.return_code === 1,
      return_code: result.data.return_code,
      return_message: result.data.return_message,
      sub_return_code: result.data.sub_return_code,
      sub_return_message: result.data.sub_return_message,
      refund_amount: result.data.refund_amount
    };
  } catch (error) {
    console.error('❌ [ZaloPay] Error querying refund:', error.response?.data || error.message);
    throw error;
  }
};

export default {
  createOrder,
  verifyCallback,
  queryOrder,
  refundOrder,
  queryRefund
};
