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

export const updateSeatType = async (Seat, { hallId, seatType, totalPrice, basePrice = 60000 }) => {
  if (!hallId || !seatType) {
    throw new Error('Hall ID và loại ghế là bắt buộc');
  }

  try {
    const sequelize = Seat.sequelize;
    // Calculate modifier if totalPrice is provided, otherwise use 0
    const priceModifier = totalPrice ? (Number(totalPrice) - Number(basePrice)) : 0;

    await sequelize.query(
      `UPDATE seats 
       SET seat_type = :seatType, 
           price_modifier = CAST(:priceModifier AS DECIMAL(15, 2)) 
       WHERE hall_id = CAST(:hallId AS INT)`,
      {
        replacements: { 
          seatType, 
          priceModifier,
          hallId: Number(hallId)
        }
      }
    );

    return { message: `Đã cập nhật giá cho loại ghế ${seatType} thành công` };
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

    // Generate layout grid based on hall dimensions
    const layout = {};
    const rowNames = [...new Set(seats.map(s => s.row_name))].sort();
    
    // Use rows from hall if available, otherwise from existing seat rows
    const distinctRows = Math.max(hall.rows || 0, rowNames.length);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const rowsToProcess = rowNames.length > 0 ? rowNames : alphabet.slice(0, distinctRows);

    const maxSeatsPerRow = hall.seats_per_row || seats.reduce((max, s) => s.seat_number > max ? s.seat_number : max, 0);

    for (const rowLetter of rowsToProcess) {
      layout[rowLetter] = [];
      for (let j = 1; j <= maxSeatsPerRow; j++) {
        const seat = seats.find(s => s.row_name === rowLetter && s.seat_number === j);
        if (seat) {
          layout[rowLetter].push({
            id: seat.id,
            number: seat.seat_number,
            type: seat.seat_type,
            modifier: seat.price_modifier,
            active: seat.is_active
          });
        } else {
          // Push a placeholder for missing seat to maintain grid alignment
          layout[rowLetter].push({
            id: null,
            number: j,
            type: 'none',
            active: false
          });
        }
      }
    }

    // Calculate current pricing info
    const regularModifier = seats.find(s => s.seat_type.toLowerCase() === 'regular')?.price_modifier || 0;
    const vipModifier = seats.find(s => s.seat_type.toLowerCase() === 'vip')?.price_modifier || 0;

    return {
      hallId,
      name: hall.name,
      rows: rowsToProcess.length,
      seatsPerRow: maxSeatsPerRow,
      totalSeats: hall.total_seats,
      pricing: {
        regularModifier: parseFloat(regularModifier),
        vipModifier: parseFloat(vipModifier)
      },
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
