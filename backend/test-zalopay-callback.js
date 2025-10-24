/**
 * Script để test ZaloPay callback manually
 * Dùng để simulate thanh toán thành công
 */

import axios from 'axios';
import CryptoJS from 'crypto-js';

const KEY2 = 'trMrHtvjo6myautxDUiAcYsVtaeQ8nhf'; // Sandbox key2

// Thông tin booking cần test
const BOOKING_ID = 65;
const BOOKING_CODE = 'test-booking-code';
const APP_TRANS_ID = '251024_123456'; // Lấy từ payment_code trong DB
const AMOUNT = 5000;

// Tạo callback data giống ZaloPay gửi
const data = {
  app_id: 2554,
  app_trans_id: APP_TRANS_ID,
  app_time: Date.now(),
  app_user: `user_${BOOKING_ID}`,
  amount: AMOUNT,
  embed_data: JSON.stringify({
    booking_id: BOOKING_ID,
    booking_code: BOOKING_CODE
  }),
  item: JSON.stringify([]),
  zp_trans_id: Date.now(), // Fake zp_trans_id
  server_time: Date.now(),
  channel: 1,
  merchant_user_id: `user_${BOOKING_ID}`,
  user_fee_amount: 0,
  discount_amount: 0
};

const dataStr = JSON.stringify(data);
const mac = CryptoJS.HmacSHA256(dataStr, KEY2).toString();

console.log('📤 Sending test callback to backend...');
console.log('Data:', data);
console.log('MAC:', mac);

// Gửi callback đến backend
axios.post('http://localhost:8080/api/zalopay/callback', {
  data: dataStr,
  mac: mac
}, {
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('✅ Callback response:', response.data);
})
.catch(error => {
  console.error('❌ Callback error:', error.response?.data || error.message);
});
