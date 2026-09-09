import amqp from 'amqplib';
import { confirmPayment } from './bookingService.js';

const MQ_URL = process.env.CLOUDAMQP_URL || process.env.RABBITMQ_URL || 'amqp://localhost:5672';

/**
 * Phát sự kiện booking thất bại (booking.failed) để kích hoạt hoàn tiền tự động (SAGA Compensating)
 */
export const publishBookingFailed = async (payload) => {
  const queue = 'booking.failed';
  try {
    const conn = await amqp.connect(MQ_URL);
    const channel = await conn.createChannel();
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(payload)), { persistent: true });
    console.log(`📤 [SAGA Event] Published 'booking.failed' for booking ${payload.booking_id}: ${payload.reason}`);
    await channel.close();
    await conn.close();
  } catch (err) {
    console.error(`❌ [SAGA Event Error] Failed to publish 'booking.failed':`, err.message);
  }
};

/**
 * Lắng nghe sự kiện payment.successful để tự động hoàn tất đặt vé và thông báo (SAGA Choreography)
 */
export const startBookingConsumer = async () => {
  const queue = 'payment.successful';

  try {
    const conn = await amqp.connect(MQ_URL);
    const channel = await conn.createChannel();

    await channel.assertQueue(queue, { durable: true });
    channel.prefetch(1);

    console.log(`📥 [Booking Consumer] Listening for 'payment.successful' on queue '${queue}'...`);

    channel.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const payload = JSON.parse(msg.content.toString());
        const { booking_id, payment_method, zp_trans_id, app_trans_id, amount } = payload;
        console.log(`🎟 [Booking Consumer] Processing confirmation for booking ID: ${booking_id}`);

        const result = await confirmPayment({
          booking_id,
          payment_method: payment_method || 'zalopay',
          payment_payload: {
            transaction_ref: zp_trans_id,
            app_trans_id,
            amount,
            response_code: '1'
          }
        });

        if (!result.success) {
          console.warn(`⚠️ [Booking Consumer] Booking confirmation failed: ${result.message}. Triggering SAGA compensation...`);
          await publishBookingFailed({
            booking_id,
            zp_trans_id,
            amount,
            reason: result.message
          });
        } else {
          console.log(`✅ [Booking Consumer] Booking ${booking_id} successfully confirmed!`);
        }

        channel.ack(msg);
      } catch (err) {
        console.error(`❌ [Booking Consumer Error] Error processing payment message:`, err.message);
        channel.ack(msg); // Ack to avoid infinite queue block
      }
    });
  } catch (err) {
    console.warn(`⚠️ [Booking Consumer] RabbitMQ unavailable or booking consumer disabled:`, err.message);
    // Auto-retry connection in 15 seconds
    setTimeout(startBookingConsumer, 15000);
  }
};
