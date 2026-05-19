import { sequelize, Movie, Showtime, Booking, BookingSeat, Payment } from './src/models/index.js';

async function resetData() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database.');

    // 1. Xóa sạch các bảng liên quan đến booking và showtime cũ trước để tránh xung đột khoá ngoại khi đổi trạng thái/xoá showtime
    console.log('⏳ Cleaning up old bookings and showtimes...');
    await BookingSeat.destroy({ where: {} });
    await Payment.destroy({ where: {} });
    await Booking.destroy({ where: {} });
    await Showtime.destroy({ where: {} });
    console.log('✅ Cleaned up old bookings and showtimes.');

    // 2. Lấy tất cả phim và phân bổ trạng thái (10 phim đang chiếu, 5 phim sắp chiếu)
    const movies = await Movie.findAll({ order: [['id', 'ASC']] });
    console.log(`🎬 Found ${movies.length} movies in database.`);
    if (movies.length === 0) {
      console.log('❌ No movies found in database to process.');
      process.exit(1);
    }

    for (let i = 0; i < movies.length; i++) {
      const status = i < 10 ? 'now_showing' : 'coming_soon';
      await movies[i].update({ status });
    }
    console.log('✅ Updated movies status (10 now_showing, 5 coming_soon)');

    // 3. Tạo lịch chiếu mới từ hôm nay trong vòng 7 ngày
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const showtimesToCreate = [];

    // Định nghĩa các khung giờ chiếu cố định cho 3 phòng chiếu
    const slots = [
      // Hall 1
      { hall_id: 1, startHour: 8, startMin: 30, endHour: 10, endMin: 30 },
      { hall_id: 1, startHour: 11, startMin: 0, endHour: 13, endMin: 0 },
      { hall_id: 1, startHour: 13, startMin: 30, endHour: 15, endMin: 30 },
      { hall_id: 1, startHour: 16, startMin: 0, endHour: 18, endMin: 0 },
      { hall_id: 1, startHour: 18, startMin: 30, endHour: 20, endMin: 30 },
      { hall_id: 1, startHour: 21, startMin: 0, endHour: 23, endMin: 0 },

      // Hall 2
      { hall_id: 2, startHour: 9, startMin: 0, endHour: 11, endMin: 0 },
      { hall_id: 2, startHour: 11, startMin: 30, endHour: 13, endMin: 30 },
      { hall_id: 2, startHour: 14, startMin: 0, endHour: 16, endMin: 0 },
      { hall_id: 2, startHour: 16, startMin: 30, endHour: 18, endMin: 30 },
      { hall_id: 2, startHour: 19, startMin: 0, endHour: 21, endMin: 0 },
      { hall_id: 2, startHour: 21, startMin: 30, endHour: 23, endMin: 30 },

      // Hall 3
      { hall_id: 3, startHour: 9, startMin: 30, endHour: 11, endMin: 30 },
      { hall_id: 3, startHour: 12, startMin: 0, endHour: 14, endMin: 0 },
      { hall_id: 3, startHour: 14, startMin: 30, endHour: 16, endMin: 30 },
      { hall_id: 3, startHour: 17, startMin: 0, endHour: 19, endMin: 0 },
      { hall_id: 3, startHour: 19, startMin: 30, endHour: 21, endMin: 30 },
      { hall_id: 3, startHour: 22, startMin: 0, endHour: 0, endMin: 0 },
    ];

    // Lặp qua 7 ngày tiếp theo (tính từ hôm nay)
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const targetDate = new Date(startOfToday);
      targetDate.setDate(startOfToday.getDate() + dayOffset);

      // Chỉ tạo lịch chiếu cho các phim đang chiếu (status === 'now_showing')
      const nowShowingMovies = movies.filter(m => m.status === 'now_showing');
      for (let i = 0; i < nowShowingMovies.length; i++) {
        const movie = nowShowingMovies[i];

        // Chọn slot cho phim này. Mỗi ngày chúng ta dịch chuyển slot (shift) để phim chiếu ở khung giờ và phòng khác nhau
        const slotIndex = (i + dayOffset) % slots.length;
        const slot = slots[slotIndex];

        const start_time = new Date(targetDate);
        start_time.setHours(slot.startHour, slot.startMin, 0, 0);

        const end_time = new Date(targetDate);
        if (slot.endHour === 0) {
          end_time.setDate(targetDate.getDate() + 1);
        }
        end_time.setHours(slot.endHour, slot.endMin, 0, 0);

        const base_price = 75000;

        showtimesToCreate.push({
          movie_id: movie.id,
          hall_id: slot.hall_id,
          start_time,
          end_time,
          base_price
        });
      }
    }

    // Kiểm tra xem có showtime nào bị Invalid Date không
    const invalidShowtimes = showtimesToCreate.filter(s => isNaN(s.start_time.getTime()) || isNaN(s.end_time.getTime()));
    if (invalidShowtimes.length > 0) {
      console.error('❌ Found invalid showtimes in memory:', invalidShowtimes);
      process.exit(1);
    }

    console.log(`⏳ Creating ${showtimesToCreate.length} new showtimes...`);
    await Showtime.bulkCreate(showtimesToCreate);
    console.log('✅ Successfully created new showtimes.');

    console.log('\n🎉 --- TẤT CẢ ĐÃ CẬP NHẬT HOÀN TẤT VÀ SẴN SÀNG ---');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating database:', error);
    process.exit(1);
  }
}

resetData();
