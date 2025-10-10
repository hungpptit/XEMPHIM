import bookingService from '../services/bookingService.js';

let timer = null;
export const startExpireJob = (intervalSeconds = 60) => {
  if (timer) return;
  timer = setInterval(async () => {
    try {
      const updated = await bookingService.expireLockedBookings();
      if (updated > 0) console.log(`Expired ${updated} locked bookings`);
    } catch (err) {
      console.error('Expire job error', err);
    }
  }, intervalSeconds * 1000);
};

export const stopExpireJob = () => {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
};

export default { startExpireJob, stopExpireJob };
