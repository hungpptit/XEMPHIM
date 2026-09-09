import amqp from 'amqplib';
import axios from 'axios';
import zalopayService from './zalopayService.js';

const BOOKING_SERVICE = process.env.BOOKING_SERVICE_URL || 'http://localhost:4004';
const MQ_URL = process.env.CLOUDAMQP_URL || process.env.RABBITMQ_URL || 'amqp://localhost:5672';

/**
 * Phát sự kiện thanh toán thành công (payment.successful) vào RabbitMQ
 * Kèm cơ chế dự phòng gọi HTTP trực tiếp nếu RabbitMQ chưa bật
 */
export const publishPaymentSuccess = async (payload) => {
  const queue = 'payment.successful';

  try {
    const conn = await amqp.connect(MQ_URL);
    const channel = await conn.createChannel();

    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
    console.log(`📤 [RabbitMQ Payment] Published 'payment.successful' for booking ID: ${payload.booking_id}`);

    await channel.close();
    await conn.close();
    return true;
  } catch (err) {
    console.warn(`⚠️ [RabbitMQ Payment] RabbitMQ unavailable (${err.message}). Falling back to direct HTTP call.`);
    
    // HTTP Fallback to ensure reliability
    try {
      await axios.post(`${BOOKING_SERVICE}/api/bookings/${payload.booking_id}/confirm-payment`, {
        payment_method: payload.payment_method || 'zalopay',
        payment_payload: {
          transaction_ref: payload.zp_trans_id,
          app_trans_id: payload.app_trans_id,
          response_code: '1',
          amount: payload.amount
        }
      });
      console.log(`✅ [HTTP Fallback] Booking ${payload.booking_id} confirmed directly via HTTP fallback`);
      return true;
    } catch (httpErr) {
      console.error(`❌ [HTTP Fallback Error] Failed to confirm booking ${payload.booking_id}:`, httpErr.message);
      return false;
    }
  }
};

/**
 * Lắng nghe sự kiện booking thất bại (booking.failed) để thực hiện giao dịch bù trừ (Refund / SAGA Compensating Transaction)
 */
export const startCompensatingConsumer = async () => {
  const queue = 'booking.failed';

  try {
    const conn = await amqp.connect(MQ_URL);
    const channel = await conn.createChannel();

    await channel.assertQueue(queue, { durable: true });
    channel.prefetch(1);

    console.log(`📥 [RabbitMQ Payment] Listening for compensation events on '${queue}'...`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const data = JSON.parse(msg.content.toString());
        console.warn(`🔄 [SAGA Compensating] Processing refund compensation for failed booking:`, data);

        if (data.zp_trans_id && data.amount) {
          const refundResult = await zalopayService.refundOrder({
            zp_trans_id: data.zp_trans_id,
            amount: data.amount,
            description: `Tự động hoàn tiền do giữ chỗ hết hạn hoặc lỗi: ${data.reason || 'Booking failed'}`,
            booking_id: data.booking_id
          });
          console.log(`💸 [SAGA Compensating] Refund result:`, refundResult);
        }

        channel.ack(msg);
      } catch (err) {
        console.error(`❌ [SAGA Compensating Error] Failed to execute refund compensation:`, err.message);
        channel.ack(msg); // Ack to prevent endless loop on bad payloads
      }
    });
  } catch (err) {
    console.warn(`⚠️ [RabbitMQ Consumer] Payment compensating consumer disabled or RabbitMQ offline:`, err.message);
  }
};
