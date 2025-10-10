import bookingService from '../services/bookingService.js';
import { Payment, Booking } from '../models/index.js';

export const confirmPaymentFromWebhook = async (req, res) => {
  console.log('📩 [Webhook] /api/payments/confirm called');
  console.log('🧾 Request body:', req.body);

  try {
    const { bookingCode, amount, referenceCode, accountNumber, transactionDate } = req.body;
    if (!bookingCode) return res.status(400).json({ message: 'bookingCode required' });

    let booking = null;
    const m = String(bookingCode).match(/BOOK(\d+)/i);
    if (m) {
      const id = Number(m[1]);
      booking = await Booking.findByPk(id);
      if (booking) console.log(`✅ Found booking by ID: ${id}`);
    }

    if (!booking) {
      booking = await Booking.findOne({ where: { booking_code: bookingCode } });
      if (booking) console.log(`✅ Found booking by booking_code: ${bookingCode}`);
    }

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.status === 'confirmed') {
      return res.json({ success: true, message: 'Booking already confirmed', booking: booking.toJSON() });
    }

    const expected = Number(booking.total_price || 0);
    const paid = Number(amount || 0);
    console.log(`💰 Expected: ${expected} | Paid: ${paid}`);

    if (paid < expected) {
      return res.status(400).json({ message: 'Paid amount does not match booking amount' });
    }

    console.log(`🧾 Creating Payment record for booking ${booking.id} ...`);
    const { v4: uuidv4 } = await import('uuid');
    const payment = await Payment.create({
      booking_id: booking.id,
      payment_method: 'sepay-webhook',
      payment_code: referenceCode || `SEPAY-${uuidv4()}`,
      amount: paid,
      qr_url: null,
      expire_at: null,
      status: 'paid',
      transaction_ref: referenceCode || null,
      response_code: null,
      secure_hash: accountNumber || null,
      created_at: transactionDate ? new Date(transactionDate) : new Date(),
    });

    booking.status = 'confirmed';
    await booking.save();
    console.log(`✅ Booking ${bookingCode} marked as confirmed.`);

    return res.json({
      success: true,
      message: `Payment confirmed for ${bookingCode}`,
      booking: booking.toJSON(),
      payment: payment.toJSON(),
    });
  } catch (err) {
    console.error('💥 Error in webhook confirm handler:', err);
    return res.status(500).json({ message: err.message });
  }
};
