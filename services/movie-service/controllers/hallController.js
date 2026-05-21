/**
 * Cinema Hall Controllers
 * Xử lý các yêu cầu liên quan đến quản lý phòng chiếu
 */

export const createHall = async (req, res) => {
  try {
    const { name, rows, seatsPerRow, hallType, description } = req.body;
    const { CinemaHall, Seat } = req.app.locals.models;
    
    const hallService = await import('../services/hallService.js');
    const hall = await hallService.createHall(CinemaHall, Seat, {
      name, rows, seatsPerRow, hallType, description
    });

    res.status(201).json({
      success: true,
      message: 'Phòng chiếu được tạo thành công',
      data: hall
    });
  } catch (error) {
    console.error('[Hall Controller] Error creating hall:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const getAllHalls = async (req, res) => {
  try {
    const { CinemaHall } = req.app.locals.models;
    console.log('[Hall Controller] CinemaHall model:', CinemaHall ? 'OK' : 'NOT FOUND');
    if (!CinemaHall) {
      console.log('[Hall Controller] Available models:', Object.keys(req.app.locals.models || {}));
      throw new Error('CinemaHall model not found in app.locals.models');
    }
    
    const hallService = await import('../services/hallService.js');
    const halls = await hallService.listHalls(CinemaHall);

    res.json({
      success: true,
      data: halls,
      total: halls.length
    });
  } catch (error) {
    console.error('[Hall Controller] Error getting all halls:', error.message);
    console.error('[Hall Controller] Full error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
};

export const getHallById = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { CinemaHall } = req.app.locals.models;
    
    const hallService = await import('../services/hallService.js');
    const hall = await hallService.getHallById(CinemaHall, hallId);

    res.json({
      success: true,
      data: hall
    });
  } catch (error) {
    console.error('[Hall Controller] Error getting hall by id:', error.message);
    const statusCode = error.message.includes('không tồn tại') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

export const getHallDetail = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { CinemaHall, Seat } = req.app.locals.models;
    
    const hallService = await import('../services/hallService.js');
    const detail = await hallService.getHallDetail(CinemaHall, Seat, { hallId });

    res.json({
      success: true,
      data: detail
    });
  } catch (error) {
    console.error('[Hall Controller] Error getting hall detail:', error.message);
    const statusCode = error.message.includes('không tồn tại') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

export const updateHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const updates = req.body;
    const { CinemaHall } = req.app.locals.models;
    
    const hallService = await import('../services/hallService.js');
    const hall = await hallService.updateHall(CinemaHall, hallId, updates);

    res.json({
      success: true,
      message: 'Phòng chiếu được cập nhật thành công',
      data: hall
    });
  } catch (error) {
    console.error('[Hall Controller] Error updating hall:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const { CinemaHall, Seat, Showtime } = req.app.locals.models;
    
    const hallService = await import('../services/hallService.js');
    const result = await hallService.deleteHall(CinemaHall, Seat, Showtime, hallId);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[Hall Controller] Error deleting hall:', error.message);
    const statusCode = error.message.includes('có suất') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};
