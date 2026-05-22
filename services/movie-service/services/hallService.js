/**
 * Cinema Hall Management Service
 * Quản lý các phòng chiếu
 */

export const createHall = async (CinemaHall, Seat, { name, rows, seatsPerRow, hallType, description }) => {
  // Support two creation modes:
  // 1) Full mode: provide rows and seatsPerRow to create seats layout
  // 2) Minimal mode: provide total_seats and optional cinema_name to create a simple hall record
  try {
    if (rows && seatsPerRow) {
      const rowsNum = parseInt(rows);
      const seatsPerRowNum = parseInt(seatsPerRow);

      if (rowsNum <= 0 || rowsNum > 30) {
        throw new Error('Số hàng phải từ 1 đến 30');
      }

      if (seatsPerRowNum <= 0 || seatsPerRowNum > 50) {
        throw new Error('Số ghế mỗi hàng phải từ 1 đến 50');
      }

      const totalSeats = rowsNum * seatsPerRowNum;

      // Create hall with detailed schema (if DB supports)
      const hall = await CinemaHall.create({
        name: name.trim(),
        rows: rowsNum,
        seats_per_row: seatsPerRowNum,
        total_seats: totalSeats,
        hall_type: hallType || 'Standard',
        description: description?.trim()
      });

      // Auto-generate seats for this hall when Seat model exists
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
              price_modifier: 0
            });
          }
        }

        await Seat.bulkCreate(seatsToCreate);
      }

      return hall;
    }

    // Minimal mode: require name and total_seats
    if (!name) throw new Error('Tên phòng là bắt buộc');
    // allow total_seats to be provided as number or string
    const totalSeats = updatesToInt({ total_seats: undefined }) || null;
    // create basic hall record using columns available in DB
    const createPayload = {
      name: name.trim(),
      total_seats: totalSeats
    };
    // allow optional cinema_name if provided in the payload; caller can pass it in place of hallType/description
    // in our API we accept cinema_name via body.cinema_name
    // The calling code should pass cinema_name in the object if needed.
    // (Above function signature doesn't include cinema_name param explicitly; read from arguments)
    // To support this, we check arguments object
    const args = arguments[2] || {};
    if (args.cinema_name) createPayload.cinema_name = args.cinema_name;

    const hall = await CinemaHall.create(createPayload);
    return hall;
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      throw new Error(`Lỗi dữ liệu: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw new Error('Lỗi khi tạo phòng chiếu: ' + (error.message || error));
  }
};

// helper to parse int from possible inputs (kept minimal)
function updatesToInt(obj) {
  try {
    if (obj && obj.total_seats !== undefined) {
      const v = parseInt(obj.total_seats, 10);
      return Number.isNaN(v) ? null : v;
    }
    return null;
  } catch (e) {
    return null;
  }
}

export const listHalls = async (CinemaHall) => {
  try {
    // Return minimal fields (id, name, cinema_name, total_seats) matching current DB schema
    const halls = await CinemaHall.findAll({
      attributes: ['id', 'name', 'cinema_name', 'total_seats'],
      // DB doesn't have created_at column in current schema; order by id instead
      order: [['id', 'DESC']]
    });

    return halls;
  } catch (error) {
    console.error('[hallService] listHalls error details:', error);
    if (error.original?.errors) {
      console.error('[hallService] Database errors:', error.original.errors.map(e => ({
        number: e.number,
        message: e.message,
        state: e.state
      })));
    }
    console.error('[hallService] Query:', error.sql);
    throw new Error('Lỗi khi lấy danh sách phòng: ' + (error.original?.message || error.message));
  }
};

export const getHallById = async (CinemaHall, hallId) => {
  if (!hallId) {
    throw new Error('Hall ID là bắt buộc');
  }

  try {
    // Select only columns that exist in the current DB schema to avoid invalid column errors
    const hall = await CinemaHall.findByPk(hallId, {
      attributes: ['id', 'name', 'cinema_name', 'total_seats']
    });
    if (!hall) {
      throw new Error('Phòng chiếu không tồn tại');
    }
    return hall;
  } catch (error) {
    if (error.message === 'Phòng chiếu không tồn tại') throw error;
    throw new Error('Lỗi khi lấy thông tin phòng: ' + error.message);
  }
};

export const updateHall = async (CinemaHall, hallId, updates) => {
  const hall = await getHallById(CinemaHall, hallId);

  // Current DB only contains minimal columns; allow updating only these
  const allowedUpdates = ['name', 'cinema_name', 'total_seats'];
  const updateData = {};

  allowedUpdates.forEach(field => {
    if (updates[field] !== undefined) {
      updateData[field] = typeof updates[field] === 'string' ? updates[field].trim() : updates[field];
    }
  });

  try {
    await hall.update(updateData);
    return hall;
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      throw new Error(`Lỗi dữ liệu: ${error.errors.map(e => e.message).join(', ')}`);
    }
    throw new Error('Lỗi khi cập nhật phòng: ' + (error.message || error));
  }
};

export const deleteHall = async (CinemaHall, Seat, Showtime, hallId) => {
  const hall = await getHallById(CinemaHall, hallId);

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

export const getHallDetail = async (CinemaHall, Seat, { hallId }) => {
  const hall = await getHallById(CinemaHall, hallId);

  try {
    const seats = await Seat.findAll({
      where: { hall_id: hallId },
      order: [['row_name', 'ASC'], ['seat_number', 'ASC']]
    });

    return {
      id: hall.id,
      name: hall.name,
      rows: hall.rows,
      seats_per_row: hall.seats_per_row,
      total_seats: hall.total_seats,
      hall_type: hall.hall_type,
      description: hall.description,
      is_active: hall.is_active,
      seats: seats,
      seatLayout: generateSeatLayout(seats, hall.rows, hall.seats_per_row)
    };
  } catch (error) {
    throw new Error('Lỗi khi lấy chi tiết phòng: ' + error.message);
  }
};

// Helper function to generate seat layout
const generateSeatLayout = (seats, rows, seatsPerRow) => {
  const layout = {};
  const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  for (let i = 0; i < rows; i++) {
    const rowLetter = rowLetters[i];
    layout[rowLetter] = [];
    for (let j = 1; j <= seatsPerRow; j++) {
      const seat = seats.find(s => s.row_name === rowLetter && s.seat_number === j);
      layout[rowLetter].push({
        id: seat?.id,
        number: j,
        type: seat?.seat_type || 'Standard',
        modifier: seat?.price_modifier || 0
      });
    }
  }

  return layout;
};
