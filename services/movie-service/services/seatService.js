/**
 * Seat Management Service
 * Quản lý ghế của từng phòng chiếu
 */

export const createSeats = async (Seat, CinemaHall, { hallId, seats }) => {
  if (!hallId || !seats || !Array.isArray(seats) || seats.length === 0) {
    throw new Error('Hall ID và danh sách ghế là bắt buộc');
  }

  try {
    const hall = await CinemaHall.findByPk(hallId);
    if (!hall) {
      throw new Error('Phòng chiếu không tồn tại');
    }

    // Validate seats
    for (const seat of seats) {
      if (!seat.row_name || !seat.seat_number) {
        throw new Error('Mỗi ghế phải có hàng và số ghế');
      }
    }

    const createdSeats = await Seat.bulkCreate(seats.map(s => ({
      hall_id: hallId,
      row_name: s.row_name,
      seat_number: s.seat_number,
      seat_type: s.seat_type || 'Standard',
      price_modifier: s.price_modifier || 0
    })));

    return createdSeats;
  } catch (error) {
    if (error.message.includes('bắt buộc') || error.message === 'Phòng chiếu không tồn tại') {
      throw error;
    }
    throw new Error('Lỗi khi tạo ghế: ' + error.message);
  }
};

export const getSeatsByHall = async (Seat, { hallId }) => {
  if (!hallId) {
    throw new Error('Hall ID là bắt buộc');
  }

  try {
    const seats = await Seat.findAll({
      where: { hall_id: hallId, is_active: true },
      order: [['row_name', 'ASC'], ['seat_number', 'ASC']]
    });

    return seats;
  } catch (error) {
    throw new Error('Lỗi khi lấy danh sách ghế: ' + error.message);
  }
};

export const updateSeat = async (Seat, seatId, updates) => {
  try {
    const seat = await Seat.findByPk(seatId);
    if (!seat) {
      throw new Error('Ghế không tồn tại');
    }

    const allowedUpdates = ['seat_type', 'price_modifier', 'is_active'];
    const updateData = {};

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    });

    await seat.update(updateData);
    return seat;
  } catch (error) {
    if (error.message === 'Ghế không tồn tại') throw error;
    throw new Error('Lỗi khi cập nhật ghế: ' + error.message);
  }
};

export const updateSeatType = async (Seat, { hallId, seatType, priceModifier }) => {
  if (!hallId || !seatType) {
    throw new Error('Hall ID và loại ghế là bắt buộc');
  }

  try {
    const result = await Seat.update(
      {
        seat_type: seatType,
        price_modifier: priceModifier || 0
      },
      { where: { hall_id: hallId } }
    );

    return { message: `Đã cập nhật ${result[0]} ghế` };
  } catch (error) {
    throw new Error('Lỗi khi cập nhật loại ghế: ' + error.message);
  }
};

export const getSeatLayout = async (Seat, CinemaHall, { hallId }) => {
  if (!hallId) {
    throw new Error('Hall ID là bắt buộc');
  }

  try {
    const hall = await CinemaHall.findByPk(hallId);
    if (!hall) {
      throw new Error('Phòng chiếu không tồn tại');
    }

    const seats = await Seat.findAll({
      where: { hall_id: hallId },
      order: [['row_name', 'ASC'], ['seat_number', 'ASC']]
    });

    // Generate layout
    const layout = {};
    for (const seat of seats) {
      if (!layout[seat.row_name]) {
        layout[seat.row_name] = [];
      }
      layout[seat.row_name].push({
        id: seat.id,
        number: seat.seat_number,
        type: seat.seat_type,
        modifier: seat.price_modifier,
        active: seat.is_active
      });
    }

    return {
      hallId,
      name: hall.name,
      rows: hall.rows,
      seatsPerRow: hall.seats_per_row,
      totalSeats: hall.total_seats,
      layout
    };
  } catch (error) {
    if (error.message === 'Phòng chiếu không tồn tại') throw error;
    throw new Error('Lỗi khi lấy sơ đồ ghế: ' + error.message);
  }
};

export const deleteSeat = async (Seat, seatId) => {
  try {
    const seat = await Seat.findByPk(seatId);
    if (!seat) {
      throw new Error('Ghế không tồn tại');
    }

    await seat.destroy();
    return { message: 'Ghế đã xoá thành công' };
  } catch (error) {
    if (error.message === 'Ghế không tồn tại') throw error;
    throw new Error('Lỗi khi xoá ghế: ' + error.message);
  }
};
