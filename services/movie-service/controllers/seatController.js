/**
 * Seat Controllers
 * Xử lý các yêu cầu liên quan đến quản lý ghế
 */

export const createSeats = async (req, res) => {
  try {
    const { hallId, seats } = req.body;
    const { Seat, CinemaHall } = req.app.locals.models;
    
    const seatService = await import('../services/seatService.js');
    const createdSeats = await seatService.createSeats(Seat, CinemaHall, { hallId, seats });

    res.status(201).json({
      success: true,
      message: `${createdSeats.length} ghế được tạo thành công`,
      data: createdSeats
    });
  } catch (error) {
    console.error('[Seat Controller] Error creating seats:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const getSeatsByHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { Seat } = req.app.locals.models;
    
    const seatService = await import('../services/seatService.js');
    const seats = await seatService.getSeatsByHall(Seat, { hallId });

    res.json({
      success: true,
      data: seats,
      total: seats.length
    });
  } catch (error) {
    console.error('[Seat Controller] Error getting seats:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getSeatLayout = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { Seat, CinemaHall } = req.app.locals.models;
    
    const seatService = await import('../services/seatService.js');
    const layout = await seatService.getSeatLayout(Seat, CinemaHall, { hallId });

    res.json({
      success: true,
      data: layout
    });
  } catch (error) {
    console.error('[Seat Controller] Error getting seat layout:', error.message);
    const statusCode = error.message.includes('không tồn tại') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

export const updateSeat = async (req, res) => {
  try {
    const { seatId } = req.params;
    const updates = req.body;
    const { Seat } = req.app.locals.models;
    
    const seatService = await import('../services/seatService.js');
    const seat = await seatService.updateSeat(Seat, seatId, updates);

    res.json({
      success: true,
      message: 'Ghế được cập nhật thành công',
      data: seat
    });
  } catch (error) {
    console.error('[Seat Controller] Error updating seat:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const updateSeatType = async (req, res) => {
  try {
    const { hallId, seatType, priceModifier } = req.body;
    const { Seat } = req.app.locals.models;
    
    const seatService = await import('../services/seatService.js');
    const result = await seatService.updateSeatType(Seat, {
      hallId, seatType, priceModifier
    });

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[Seat Controller] Error updating seat type:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteSeat = async (req, res) => {
  try {
    const { seatId } = req.params;
    const { Seat } = req.app.locals.models;
    
    const seatService = await import('../services/seatService.js');
    const result = await seatService.deleteSeat(Seat, seatId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[Seat Controller] Error deleting seat:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
