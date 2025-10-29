import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.sendMail({
  from: process.env.EMAIL_FROM,
  to: process.env.EMAIL_USER,
  subject: '🎟 Test gửi email XemPhim',
  html: '<p>✅ Nếu bạn thấy mail này, nghĩa là Gmail App Password hoạt động thành công!</p>'
})
.then(info => console.log('📩 Sent:', info.response))
.catch(err => console.error('❌ Error:', err));
