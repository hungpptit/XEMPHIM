/**
 * Cinema Management Service
 * Quản lý các rạp chiếu phim
 */

export const createCinema = async (Cinema, { name, location, hotline, email, address }) => {
  if (!name || !location) {
    throw new Error('Tên rạp và địa chỉ là bắt buộc');
  }

  try {
    const cinema = await Cinema.create({
      name: name.trim(),
      location: location.trim(),
      hotline: hotline?.trim(),
      email: email?.trim(),
      address: address?.trim(),
      is_active: true
    });

    return cinema;
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      throw new Error(`Lỗi dữ liệu: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const listCinemas = async (Cinema) => {
  try {
    const cinemas = await Cinema.findAll({
      where: { is_active: true },
      order: [['created_at', 'DESC']]
    });
    return cinemas;
  } catch (error) {
    throw new Error('Lỗi khi lấy danh sách rạp: ' + error.message);
  }
};

export const getCinemaById = async (Cinema, cinemaId) => {
  if (!cinemaId) {
    throw new Error('ID rạp là bắt buộc');
  }

  try {
    const cinema = await Cinema.findByPk(cinemaId);
    if (!cinema) {
      throw new Error('Rạp chiếu không tồn tại');
    }
    return cinema;
  } catch (error) {
    if (error.message === 'Rạp chiếu không tồn tại') throw error;
    throw new Error('Lỗi khi lấy thông tin rạp: ' + error.message);
  }
};

export const updateCinema = async (Cinema, cinemaId, updates) => {
  const cinema = await getCinemaById(Cinema, cinemaId);

  const allowedUpdates = ['name', 'location', 'hotline', 'email', 'address', 'is_active'];
  const updateData = {};

  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      updateData[field] = typeof updates[field] === 'string' ? updates[field].trim() : updates[field];
    }
  });

  try {
    await cinema.update(updateData);
    return cinema;
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      throw new Error(`Lỗi dữ liệu: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw error;
  }
};

export const deleteCinema = async (Cinema, CinemaHall, Showtime, cinemaId) => {
  const cinema = await getCinemaById(Cinema, cinemaId);

  // Kiểm tra xem rạp có phòng chiếu hay không
  const hallCount = await CinemaHall.count({ where: { cinema_id: cinemaId } });
  if (hallCount > 0) {
    throw new Error('Không thể xoá rạp có phòng chiếu. Vui lòng xoá các phòng chiếu trước.');
  }

  try {
    await cinema.destroy();
    return { message: 'Rạp chiếu đã xoá thành công' };
  } catch (error) {
    throw new Error('Lỗi khi xoá rạp: ' + error.message);
  }
};

export const getCinemaStats = async (Cinema, CinemaHall, Seat) => {
  try {
    const totalCinemas = await Cinema.count();
    const activeCinemas = await Cinema.count({ where: { is_active: true } });
    const totalHalls = await CinemaHall.count();
    const totalSeats = await Seat.count();

    return {
      totalCinemas,
      activeCinemas,
      totalHalls,
      totalSeats
    };
  } catch (error) {
    throw new Error('Lỗi khi lấy thống kê: ' + error.message);
  }
};
