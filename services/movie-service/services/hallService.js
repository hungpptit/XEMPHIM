/**
 * Cinema Hall Management Service
 * Quản lý các phòng chiếu
 */

export const createHall = async (CinemaHall, Seat, { name, rows, seatsPerRow, hallType, description, cinemaId, cinema_id }) => {
  try {
    const targetCinemaId = cinema_id || cinemaId;
    if (!targetCinemaId) {
      throw new Error('cinema_id (hoặc cinemaId) là bắt buộc');
    }

    if (!name) {
      throw new Error('Tên phòng là bắt buộc');
    }

    const rowsNum = parseInt(rows, 10);
    const seatsPerRowNum = parseInt(seatsPerRow, 10);

    if (isNaN(rowsNum) || rowsNum <= 0 || rowsNum > 30) {
      throw new Error('Số hàng phải từ 1 đến 30');
    }

    if (isNaN(seatsPerRowNum) || seatsPerRowNum <= 0 || seatsPerRowNum > 50) {
      throw new Error('Số ghế mỗi hàng phải từ 1 đến 50');
    }

    const totalSeats = rowsNum * seatsPerRowNum;

    // Create basic hall record matching database schema (id, name, total_seats, cinema_id)
    const hall = await CinemaHall.create({
      name: name.trim(),
      total_seats: totalSeats,
      cinema_id: targetCinemaId
    });

    // Auto-generate seats for this hall
    if (Seat) {
      const seatsToCreate = [];
      const rows_letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

      for (let i = 0; i < rowsNum; i++) {
        const rowLetter = rows_letters[i];
        for (let j = 1; j <= seatsPerRowNum; j++) {
          seatsToCreate.push({
            hall_id: hall.id,
            row_name: rowLetter,
            seat_number: j,
            seat_type: 'Standard',
            price_modifier: 0,
            is_active: true
          });
        }
      }

      await Seat.bulkCreate(seatsToCreate);
    }

    return hall;
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      throw new Error(`Lỗi dữ liệu: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw new Error('Lỗi khi tạo phòng chiếu: ' + (error.message || error));
  }
};

export const listHalls = async (CinemaHall, Cinema) => {
  try {
    const halls = await CinemaHall.findAll({
      attributes: ['id', 'name', 'cinema_id', 'total_seats'],
      include: [
        {
          model: Cinema,
          attributes: ['name']
        }
      ],
      order: [['id', 'DESC']]
    });

    return halls.map(hall => {
      const hallJson = hall.toJSON();
      hallJson.cinema_name = hallJson.Cinema?.name || '';
      delete hallJson.Cinema;
      return hallJson;
    });
  } catch (error) {
    throw new Error('Lỗi khi lấy danh sách phòng: ' + error.message);
  }
};

export const getHallById = async (CinemaHall, Cinema, hallId) => {
  if (!hallId) {
    throw new Error('Hall ID là bắt buộc');
  }

  try {
    const hall = await CinemaHall.findByPk(hallId, {
      attributes: ['id', 'name', 'cinema_id', 'total_seats'],
      include: [
        {
          model: Cinema,
          attributes: ['name']
        }
      ]
    });
    if (!hall) {
      throw new Error('Phòng chiếu không tồn tại');
    }
    const hallJson = hall.toJSON();
    hallJson.cinema_name = hallJson.Cinema?.name || '';
    delete hallJson.Cinema;
    return hallJson;
  } catch (error) {
    if (error.message === 'Phòng chiếu không tồn tại') throw error;
    throw new Error('Lỗi khi lấy thông tin phòng: ' + error.message);
  }
};

export const getHallsByCinema = async (CinemaHall, cinemaId) => {
  if (!cinemaId) {
    throw new Error('ID rạp là bắt buộc');
  }

  try {
    const halls = await CinemaHall.findAll({
      where: { cinema_id: cinemaId },
      order: [['id', 'DESC']]
    });
    return halls;
  } catch (error) {
    throw new Error('Lỗi khi lấy danh sách phòng của rạp: ' + error.message);
  }
};

export const updateHall = async (CinemaHall, Cinema, hallId, updates) => {
  const hall = await CinemaHall.findByPk(hallId);
  if (!hall) {
    throw new Error('Phòng chiếu không tồn tại');
  }

  const allowedUpdates = ['name', 'cinema_id', 'cinemaId', 'total_seats'];
  const updateData = {};

  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      const dbField = field === 'cinemaId' ? 'cinema_id' : field;
      updateData[dbField] = typeof updates[field] === 'string' ? updates[field].trim() : updates[field];
    }
  });

  try {
    await hall.update(updateData);
    
    // Fetch updated hall with Cinema relation for backward compatibility
    const updatedHall = await CinemaHall.findByPk(hallId, {
      attributes: ['id', 'name', 'cinema_id', 'total_seats'],
      include: [{ model: Cinema, attributes: ['name'] }]
    });
    const hallJson = updatedHall.toJSON();
    hallJson.cinema_name = hallJson.Cinema?.name || '';
    delete hallJson.Cinema;
    return hallJson;
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      throw new Error(`Lỗi dữ liệu: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw new Error('Lỗi khi cập nhật phòng: ' + (error.message || error));
  }
};

export const deleteHall = async (CinemaHall, Seat, Showtime, hallId) => {
  const hall = await CinemaHall.findByPk(hallId);
  if (!hall) {
    throw new Error('Phòng chiếu không tồn tại');
  }

  // Check if hall has active showtimes
  const showtimeCount = await Showtime.count({ where: { hall_id: hallId } });
  if (showtimeCount > 0) {
    throw new Error('Không thể xoá phòng có suất chiếu. Vui lòng xoá các suất chiếu trước.');
  }

  try {
    // Delete all seats in this hall
    await Seat.destroy({ where: { hall_id: hallId } });
    
    // Delete the hall
    await hall.destroy();
    return { message: 'Phòng chiếu đã xoá thành công' };
  } catch (error) {
    throw new Error('Lỗi khi xoá phòng: ' + error.message);
  }
};

export const getHallDetail = async (CinemaHall, Seat, Cinema, { hallId }) => {
  const hall = await CinemaHall.findByPk(hallId, {
    attributes: ['id', 'name', 'cinema_id', 'total_seats'],
    include: [{ model: Cinema, attributes: ['name'] }]
  });
  if (!hall) {
    throw new Error('Phòng chiếu không tồn tại');
  }

  try {
    const seats = await Seat.findAll({
      where: { hall_id: hallId },
      order: [['row_name', 'ASC'], ['seat_number', 'ASC']]
    });

    // Dynamically calculate rows and seats_per_row from seats
    const rowNames = [...new Set(seats.map(s => s.row_name))].sort();
    const rows = rowNames.length;
    const seatsPerRow = seats.reduce((max, s) => s.seat_number > max ? s.seat_number : max, 0);

    return {
      id: hall.id,
      name: hall.name,
      cinema_id: hall.cinema_id,
      cinema_name: hall.Cinema?.name || '',
      rows: rows,
      seats_per_row: seatsPerRow,
      total_seats: hall.total_seats,
      hall_type: 'Standard',
      description: '',
      is_active: true,
      seats: seats,
      seatLayout: generateSeatLayout(seats, rows, seatsPerRow, rowNames)
    };
  } catch (error) {
    throw new Error('Lỗi khi lấy chi tiết phòng: ' + error.message);
  }
};

// Helper function to generate seat layout
const generateSeatLayout = (seats, rows, seatsPerRow, rowNames) => {
  const layout = {};
  const rowLetters = rowNames.length > 0 ? rowNames : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  for (let i = 0; i < rows; i++) {
    const rowLetter = rowLetters[i];
    layout[rowLetter] = [];
    for (let j = 1; j <= seatsPerRow; j++) {
      const seat = seats.find(s => s.row_name === rowLetter && s.seat_number === j);
      layout[rowLetter].push({
        id: seat?.id,
        number: j,
        type: seat?.seat_type || 'Standard',
        modifier: seat?.price_modifier || 0,
        is_active: seat?.is_active ?? true
      });
    }
  }

  return layout;
};
