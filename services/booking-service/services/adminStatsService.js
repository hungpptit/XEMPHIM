import { Op } from 'sequelize';

/**
 * Admin Statistics Service
 * Logic for calculating revenue and analytics
 */

export const getRevenueStats = async (appModels) => {
  const { Booking, Movie, Cinema, Showtime } = appModels;

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Summary Stats
    const totalRevenueResult = await Booking.sum('total_price', {
      where: { status: 'confirmed' }
    });
    
    const todayRevenueResult = await Booking.sum('total_price', {
      where: { 
        status: 'confirmed',
        created_at: { [Op.gte]: startOfDay }
      }
    });

    const monthRevenueResult = await Booking.sum('total_price', {
      where: { 
        status: 'confirmed',
        created_at: { [Op.gte]: startOfMonth }
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
      
      const dayRev = await Booking.sum('total_price', {
        where: {
          status: 'confirmed',
          created_at: { [Op.between]: [start, end] }
        }
      });
      
      last7Days.push({
        date: start.toLocaleDateString('vi-VN'),
        revenue: dayRev || 0
      });
    }

    // 3. Top Movies by Revenue
    // Since we need to join with Movie via Showtime, it's easier to do this:
    const bookings = await Booking.findAll({
      where: { status: 'confirmed' },
      include: [{
        model: Showtime,
        include: [{ model: Movie }]
      }]
    });

    const movieRevenue = {};
    bookings.forEach(b => {
      const movieTitle = b.Showtime?.Movie?.title || 'Unknown';
      movieRevenue[movieTitle] = (movieRevenue[movieTitle] || 0) + Number(b.total_price);
    });

    const topMovies = Object.entries(movieRevenue)
      .map(([title, revenue]) => ({ title, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // 4. Revenue by Cinema
    const cinemaRevenue = {};
    bookings.forEach(b => {
      const cinemaName = b.Showtime?.Cinema?.name || 'Unknown';
      cinemaRevenue[cinemaName] = (cinemaRevenue[cinemaName] || 0) + Number(b.total_price);
    });

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
