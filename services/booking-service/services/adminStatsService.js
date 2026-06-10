import { Op, Sequelize } from 'sequelize';
import axios from 'axios';

const MOVIE_SERVICE = process.env.MOVIE_SERVICE_URL || 'http://localhost:4002';

/**
 * Admin Statistics Service
 * Logic for calculating revenue and analytics
 */

export const getRevenueStats = async (appModels) => {
  const { Booking } = appModels;

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // 1. Summary Stats
    const totalRevenueResult = await Booking.sum('total_price', {
      where: { status: 'confirmed' }
    });
    
    const todayRevenueResult = await Booking.sum('total_price', {
      where: { 
        status: 'confirmed',
        created_at: { [Op.gte]: Sequelize.literal(`'${startOfDay}'`) }
      }
    });

    const monthRevenueResult = await Booking.sum('total_price', {
      where: { 
        status: 'confirmed',
        created_at: { [Op.gte]: Sequelize.literal(`'${startOfMonth}'`) }
      }
    });

    const totalTickets = await Booking.count({
      where: { status: 'confirmed' }
    });

    // 2. Revenue over the last 7 days (for chart)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const start = new Date(d.setHours(0, 0, 0, 0));
      const end = new Date(d.setHours(23, 59, 59, 999));
      const startStr = start.toISOString();
      const endStr = end.toISOString();
      
      const dayRev = await Booking.sum('total_price', {
        where: {
          status: 'confirmed',
          created_at: { [Op.between]: [Sequelize.literal(`'${startStr}'`), Sequelize.literal(`'${endStr}'`)] }
        }
      });
      
      last7Days.push({
        date: start.toLocaleDateString('vi-VN'),
        revenue: dayRev || 0
      });
    }

    // 3. Top Movies and Cinemas by Revenue
    const bookings = await Booking.findAll({
      where: { status: 'confirmed' },
      attributes: ['showtime_id', 'total_price']
    });

    const showtimeIds = [...new Set(bookings.map(b => b.showtime_id).filter(Boolean))];
    
    // Fetch showtime details in parallel from movie-service
    const showtimes = await Promise.all(showtimeIds.map(async (sid) => {
      try {
        const res = await axios.get(`${MOVIE_SERVICE}/api/showtimes/${sid}`);
        return res.data;
      } catch (err) {
        console.error(`Failed to fetch showtime ${sid} for stats:`, err.message);
        return null;
      }
    }));

    const showtimeMap = showtimes.filter(Boolean).reduce((acc, st) => {
      acc[st.id] = st;
      return acc;
    }, {});

    const movieRevenue = {};
    const cinemaRevenue = {};

    bookings.forEach(b => {
      const showtime = showtimeMap[b.showtime_id];
      const movieTitle = showtime?.movie_title || 'Unknown';
      const cinemaName = showtime?.cinema_name || 'Unknown';

      movieRevenue[movieTitle] = (movieRevenue[movieTitle] || 0) + Number(b.total_price);
      cinemaRevenue[cinemaName] = (cinemaRevenue[cinemaName] || 0) + Number(b.total_price);
    });

    const topMovies = Object.entries(movieRevenue)
      .map(([title, revenue]) => ({ title, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const topCinemas = Object.entries(cinemaRevenue)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    return {
      summary: {
        totalRevenue: totalRevenueResult || 0,
        todayRevenue: todayRevenueResult || 0,
        monthRevenue: monthRevenueResult || 0,
        totalTickets: totalTickets || 0
      },
      chartData: last7Days,
      topMovies,
      topCinemas
    };
  } catch (error) {
    throw new Error('Lỗi khi tính toán thống kê: ' + error.message);
  }
};
