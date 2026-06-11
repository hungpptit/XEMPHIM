import { Op, Sequelize } from 'sequelize';
import axios from 'axios';

const MOVIE_SERVICE = process.env.MOVIE_SERVICE_URL || 'http://localhost:4002';

/**
 * Admin Statistics Service
 * Logic for calculating revenue and analytics with date filtering
 */
export const getRevenueStats = async (appModels, filters = {}) => {
  const { Booking, BookingSeat } = appModels;
  const { startDate, endDate } = filters;

  try {
    // 1. Build where clause based on filters
    const where = { status: 'confirmed' };
    
    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        // Ensure starting from 00:00:00 local time converted to ISO
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.created_at[Op.gte] = Sequelize.literal(`'${start.toISOString()}'`);
      }
      if (endDate) {
        // Ensure ending at 23:59:59 local time converted to ISO
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.created_at[Op.lte] = Sequelize.literal(`'${end.toISOString()}'`);
      }
    }

    // 2. Fetch all matching bookings with booking seats
    const bookings = await Booking.findAll({
      where,
      attributes: ['id', 'showtime_id', 'total_price', 'created_at'],
      include: [{ model: BookingSeat, attributes: ['id', 'price'] }]
    });

    // 3. Fetch showtime details in parallel from movie-service
    const showtimeIds = [...new Set(bookings.map(b => b.showtime_id).filter(Boolean))];
    const showtimes = await Promise.all(
      showtimeIds.map(async (sid) => {
        try {
          const res = await axios.get(`${MOVIE_SERVICE}/api/showtimes/${sid}`);
          return res.data;
        } catch (err) {
          console.error(`Failed to fetch showtime ${sid} for stats:`, err.message);
          return null;
        }
      })
    );

    const showtimeMap = showtimes.filter(Boolean).reduce((acc, st) => {
      acc[st.id] = st;
      return acc;
    }, {});

    // 4. Aggregate revenue and tickets count
    let totalRevenue = 0;
    let totalTickets = 0;
    const movieStats = {};   // { [title]: { revenue, ticketsCount } }
    const cinemaStats = {};  // { [name]: { revenue, ticketsCount } }

    bookings.forEach(b => {
      const showtime = showtimeMap[b.showtime_id];
      const movieTitle = showtime?.movie_title || 'Phim không xác định';
      const cinemaName = showtime?.cinema_name || 'Rạp không xác định';
      const price = Number(b.total_price) || 0;
      const tickets = b.BookingSeats ? b.BookingSeats.length : 0;

      totalRevenue += price;
      totalTickets += tickets;

      // Movie aggregations
      if (!movieStats[movieTitle]) {
        movieStats[movieTitle] = { title: movieTitle, revenue: 0, ticketsCount: 0 };
      }
      movieStats[movieTitle].revenue += price;
      movieStats[movieTitle].ticketsCount += tickets;

      // Cinema aggregations
      if (!cinemaStats[cinemaName]) {
        cinemaStats[cinemaName] = { name: cinemaName, revenue: 0, ticketsCount: 0 };
      }
      cinemaStats[cinemaName].revenue += price;
      cinemaStats[cinemaName].ticketsCount += tickets;
    });

    // 5. Generate lists and top selling movies
    const moviesList = Object.values(movieStats).sort((a, b) => b.revenue - a.revenue);
    const cinemasList = Object.values(cinemaStats).sort((a, b) => b.revenue - a.revenue);
    const topSellingMovies = Object.values(movieStats)
      .sort((a, b) => b.ticketsCount - a.ticketsCount)
      .slice(0, 10);

    // 6. Generate chart data (grouped by date)
    const chartData = [];
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Limit chart points to max 31 days to keep it readable
      const daysToGenerate = Math.min(diffDays + 1, 31);
      for (let i = 0; i < daysToGenerate; i++) {
        const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        const startStr = new Date(d.setHours(0, 0, 0, 0)).getTime();
        const endStr = new Date(d.setHours(23, 59, 59, 999)).getTime();

        const dayRev = bookings.filter(b => {
          const bTime = new Date(b.created_at).getTime();
          return bTime >= startStr && bTime <= endStr;
        }).reduce((sum, b) => sum + Number(b.total_price), 0);

        chartData.push({
          date: d.toLocaleDateString('vi-VN'),
          revenue: dayRev
        });
      }
    } else {
      // Default to last 7 days chart
      const now = new Date();
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const startStr = new Date(d.setHours(0, 0, 0, 0)).getTime();
        const endStr = new Date(d.setHours(23, 59, 59, 999)).getTime();

        const dayRev = bookings.filter(b => {
          const bTime = new Date(b.created_at).getTime();
          return bTime >= startStr && bTime <= endStr;
        }).reduce((sum, b) => sum + Number(b.total_price), 0);

        chartData.push({
          date: d.toLocaleDateString('vi-VN'),
          revenue: dayRev
        });
      }
    }

    return {
      summary: {
        totalRevenue,
        totalTickets
      },
      chartData,
      moviesList,
      cinemasList,
      topSellingMovies
    };
  } catch (error) {
    throw new Error('Lỗi khi tính toán thống kê: ' + error.message);
  }
};
