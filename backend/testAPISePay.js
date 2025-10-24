import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const SEPAY_API_KEY = process.env.SEPAY_API_KEY;
const SEPAY_ACCOUNT = process.env.SEPAY_ACCOUNT;
const SEPAY_BASE_URL = 'https://my.sepay.vn/userapi/transactions/list';

async function checkPayment() {
  try {
    const res = await axios.get(SEPAY_BASE_URL, {
      headers: { Authorization: `Bearer ${SEPAY_API_KEY}` },
      params: {
        account_number: SEPAY_ACCOUNT,
        limit: 10,          // Lấy 10 giao dịch gần nhất
        amount_in: 5000     // Lọc số tiền vào = 5000
      }
    });

    console.log('🔹 API trả về:', res.data);

    const transactions = res.data.transactions || res.data || [];
    const match = transactions.find(
      txn =>
        txn.description?.toUpperCase().includes('BOOK') // hoặc đổi mã bạn dùng trong QR
    );

    if (match) {
      console.log('✅ Đã nhận tiền thanh toán:', match);
    } else {
      console.log('❌ Chưa thấy giao dịch phù hợp.');
    }
  } catch (err) {
    console.error('🚫 Lỗi API:', err.response?.data || err.message);
  }
}

checkPayment();
