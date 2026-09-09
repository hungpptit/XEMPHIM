import axios from 'axios';
const SEAT_SERVICE = process.env.SEAT_SERVICE_URL || 'http://localhost:4003';

/**
 * Cinema Hall Management Service
 * Quản lý các phòng chiếu
 */

export const createHall = async (CinemaHall, Seat_Ignored, { name, rows, seatsPerRow, hallType, description, cinemaId, cinema_id, vipRows }) => {
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
    const vipRowsNum = parseInt(vipRows, 10) || 0;

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

    // Delegate seat creation directly to seat-service (Single Source of Truth)
    console.log(`[Hall Service] Requesting seat-service to initialize seats for hall ${hall.id}...`);
    try {
      await axios.post(`${SEAT_SERVICE}/api/seats/hall/${hall.id}/init`, {
        rows: rowsNum,
        seatsPerRow: seatsPerRowNum,
        vipRows: vipRowsNum
      });
      console.log(`[Hall Service] Successfully initialized seats in seat-service.`);
    } catch (syncErr) {
      console.error(`[Hall Service] Failed to initialize seats in seat-service:`, syncErr.message);
      // Rollback hall creation if seat initialization fails
      await hall.destroy();
      throw new Error('Lỗi khởi tạo ghế tại Seat Service: ' + syncErr.message);
    }

    return hall;
  } catch (error) {
    console.error('DATABASE ERROR DETAIL:', error);
    throw new Error('Lỗi khi tạo phòng chiếu hoặc ghế: ' + (error.message || error));
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

export const deleteHall = async (CinemaHall, Seat_Ignored, Showtime, hallId) => {
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
    // Delete all seats in this hall via seat-service
    try {
      await axios.delete(`${SEAT_SERVICE}/api/seats/hall/${hallId}`);
      console.log(`[Hall Service] Deleted seats in seat-service for hall ${hallId}`);
    } catch (seatErr) {
      console.warn(`[Hall Service] Warning deleting seats in seat-service:`, seatErr.message);
    }
    
    // Delete the hall
    await hall.destroy();
    return { message: 'Phòng chiếu đã xoá thành công' };
  } catch (error) {
    throw new Error('Lỗi khi xoá phòng: ' + error.message);
  }
};

export const getHallDetail = async (CinemaHall, Seat_Ignored, Cinema, { hallId }) => {
  const hall = await CinemaHall.findByPk(hallId, {
    attributes: ['id', 'name', 'cinema_id', 'total_seats'],
    include: [{ model: Cinema, attributes: ['name'] }]
  });
  if (!hall) {
    throw new Error('Phòng chiếu không tồn tại');
  }

  try {
    let seatData = { layout: {}, seats: [], rows: 0, seatsPerRow: 0 };
    try {
      const res = await axios.get(`${SEAT_SERVICE}/api/seats/hall/${hallId}/layout`);
      if (res.data && res.data.data) {
        seatData = res.data.data;
      }
    } catch (seatErr) {
      console.warn(`[Hall Service] Could not fetch seat layout from seat-service:`, seatErr.message);
    }

    return {
      id: hall.id,
      name: hall.name,
      cinema_id: hall.cinema_id,
      cinema_name: hall.Cinema?.name || '',
      rows: seatData.rows || 0,
      seats_per_row: seatData.seatsPerRow || 0,
      total_seats: hall.total_seats,
      hall_type: 'Standard',
      description: '',
      is_active: true,
      seats: seatData.seats || [],
      seatLayout: seatData.seatLayout || seatData.layout || {}
    };
  } catch (error) {
    throw new Error('Lỗi khi lấy chi tiết phòng: ' + error.message);
  }
};

