import amqp from 'amqplib';
import QRCode from 'qrcode';
import nodemailer from 'nodemailer';

export const sendTicketEmail = async (payload) => {
  const {
    booking_id,
    booking_code,
    user_email,
    movie_title,
    poster_url,
    formatted_time,
    hall_name,
    seat_list,
    total_price,
    qr_data
  } = payload;

  console.log(`🎟 [Notification Service] Processing ticket email for booking: ${booking_code} -> ${user_email}`);

  // Generate QR code buffer
  const qrBuffer = await QRCode.toBuffer(qr_data, { errorCorrectionLevel: 'H' });

  // Build HTML email template
  const mailHtml = `
    <h2>🎟 Vé xem phim - ${movie_title}</h2>
    ${poster_url ? `<img src="${poster_url}" alt="Poster phim" width="200" style="border-radius:10px; margin-bottom:10px;">` : ''}
    
    <p><strong>Phim:</strong> ${movie_title}</p>
    <p><strong>Suất chiếu:</strong> ${formatted_time}</p>
    <p><strong>Phòng chiếu:</strong> ${hall_name}</p>
    <p><strong>Ghế:</strong> ${seat_list}</p>
    <p><strong>Tổng tiền:</strong> ${total_price}</p>
    <p><strong>Mã vé:</strong> ${booking_code}</p>
    
    <p><img src="cid:ticket_qr_${booking_id}" alt="QR code" width="180" height="180"/></p>
    <p><i>Vui lòng xuất trình mã QR này tại quầy soát vé để check-in vào rạp.</i></p>
  `;

  // Configure Nodemailer
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"XemPhim PTIT" <${process.env.EMAIL_USER}>`,
    to: user_email || process.env.DEV_MAIL_TO || 'user@example.com',
    subject: `🎟 Vé xem phim - ${movie_title}`,
    html: mailHtml,
    attachments: [
      {
        filename: 'qrcode.png',
        content: qrBuffer,
        cid: `ticket_qr_${booking_id}`
      }
    ]
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`📧 [Notification Service] Ticket email successfully sent to ${user_email}:`, info.response);
  return info;
};

export const startNotificationConsumer = async () => {
  const mqUrl = process.env.CLOUDAMQP_URL || process.env.RABBITMQ_URL;
  if (!mqUrl) {
    console.warn('⚠️ [RabbitMQ Consumer] CLOUDAMQP_URL/RABBITMQ_URL not configured. Notification consumer disabled.');
    return;
  }

  try {
    const conn = await amqp.connect(mqUrl);
    const channel = await conn.createChannel();
    const queue = 'ticket.notifications';

    await channel.assertQueue(queue, { durable: true });
    channel.prefetch(1);

    console.log(`📥 [Notification Service] Listening for ticket messages on queue '${queue}'...`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        await sendTicketEmail(payload);
        // Acknowledge message delivery
        channel.ack(msg);
      } catch (err) {
        console.error('❌ [Notification Service] Error processing queue message:', err.message);
        // Reject message and put it back to queue if it's a transient failure,
        // or discard/log it depending on policy. Here we requeue once:
        channel.nack(msg, false, true);
      }
    });

  } catch (err) {
    console.error('❌ [Notification Service] Failed to initialize consumer:', err.message);
    // Auto-retry connection in 10 seconds
    setTimeout(startNotificationConsumer, 10000);
  }
};
