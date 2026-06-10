/**
 * Cinema Controllers
 * Xử lý các yêu cầu liên quan đến quản lý rạp chiếu
 */

export const createCinema = async (req, res) => {
  try {
    const { name, address, city, status } = req.body;
    const { Cinema } = req.app.locals.models;
    
    const cinemaService = await import('../services/cinemaService.js');
    const cinema = await cinemaService.createCinema(Cinema, {
      name, address, city, status
    });

    res.status(201).json({
      success: true,
      message: 'Rạp chiếu được tạo thành công',
      data: cinema
    });
  } catch (error) {
    console.error('[Cinema Controller] Error creating cinema:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const getCinemas = async (req, res) => {
  try {
    const { Cinema } = req.app.locals.models;
    const cinemaService = await import('../services/cinemaService.js');
    const cinemas = await cinemaService.listCinemas(Cinema);

    res.json({
      success: true,
      data: cinemas,
      total: cinemas.length
    });
  } catch (error) {
    console.error('[Cinema Controller] Error listing cinemas:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getCinemaById = async (req, res) => {
  try {
    const { id } = req.params;
    const { Cinema } = req.app.locals.models;
    const cinemaService = await import('../services/cinemaService.js');
    const cinema = await cinemaService.getCinemaById(Cinema, id);

    res.json({
      success: true,
      data: cinema
    });
  } catch (error) {
    console.error('[Cinema Controller] Error getting cinema:', error.message);
    const statusCode = error.message.includes('không tồn tại') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

export const updateCinema = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { Cinema } = req.app.locals.models;
    const cinemaService = await import('../services/cinemaService.js');
    const cinema = await cinemaService.updateCinema(Cinema, id, updates);

    res.json({
      success: true,
      message: 'Rạp chiếu được cập nhật thành công',
      data: cinema
    });
  } catch (error) {
    console.error('[Cinema Controller] Error updating cinema:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteCinema = async (req, res) => {
  try {
    const { id } = req.params;
    const { Cinema, CinemaHall, Showtime } = req.app.locals.models;
    const cinemaService = await import('../services/cinemaService.js');
    const result = await cinemaService.deleteCinema(Cinema, CinemaHall, Showtime, id);

    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('[Cinema Controller] Error deleting cinema:', error.message);
    const statusCode = error.message.includes('có phòng') ? 409 : 400;
    res.status(statusCode).json({
      success: false,
      error: error.message
    });
  }
};

export const getCinemaStats = async (req, res) => {
  try {
    const { Cinema, CinemaHall, Seat, Movie } = req.app.locals.models;
    const cinemaService = await import('../services/cinemaService.js');
    const stats = await cinemaService.getCinemaStats(Cinema, CinemaHall, Seat, Movie);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('[Cinema Controller] Error getting stats:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
