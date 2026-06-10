import * as adminService from '../services/adminService.js';

// ============= CINEMA CONTROLLERS =============

export const createCinema = async (req, res) => {
  try {
    const { name, location, hotline } = req.body;
    
    const cinema = await adminService.createCinema(name, location, hotline);
    res.status(201).json({
      success: true,
      message: 'Cinema created successfully',
      data: cinema
    });
  } catch (error) {
    console.error('Error creating cinema:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const getCinemas = async (req, res) => {
  try {
    const cinemas = await adminService.listCinemas();
    res.json({
      success: true,
      data: cinemas
    });
  } catch (error) {
    console.error('Error listing cinemas:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getCinemaById = async (req, res) => {
  try {
    const { id } = req.params;
    const cinema = await adminService.getCinemaById(id);
    
    if (!cinema) {
      return res.status(404).json({
        success: false,
        error: 'Cinema not found'
      });
    }
    
    res.json({
      success: true,
      data: cinema
    });
  } catch (error) {
    console.error('Error getting cinema:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const updateCinema = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const cinema = await adminService.updateCinema(id, updates);
    res.json({
      success: true,
      message: 'Cinema updated successfully',
      data: cinema
    });
  } catch (error) {
    console.error('Error updating cinema:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteCinema = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.deleteCinema(id);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting cinema:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============= HALL CONTROLLERS =============

export const createHall = async (req, res) => {
  try {
    const { cinemaId } = req.params;
    const { name, rows, seatsPerRow } = req.body;
    
    const hall = await adminService.createHall(cinemaId, name, rows, seatsPerRow);
    res.status(201).json({
      success: true,
      message: 'Hall created successfully',
      data: hall
    });
  } catch (error) {
    console.error('Error creating hall:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const getHallsByCinema = async (req, res) => {
  try {
    const { cinemaId } = req.params;
    const halls = await adminService.getHallsByCinema(cinemaId);
    
    res.json({
      success: true,
      data: halls
    });
  } catch (error) {
    console.error('Error getting halls:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const updateHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const updates = req.body;
    
    const hall = await adminService.updateHall(hallId, updates);
    res.json({
      success: true,
      message: 'Hall updated successfully',
      data: hall
    });
  } catch (error) {
    console.error('Error updating hall:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const result = await adminService.deleteHall(hallId);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting hall:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// ============= SHOWTIME CONTROLLERS =============

export const createShowtime = async (req, res) => {
  try {
    const { movie_id, hall_id, start_time, end_time, base_price } = req.body;
    
    const showtime = await adminService.createShowtime(
      movie_id, 
      hall_id, 
      start_time, 
      end_time, 
      base_price
    );
    
    res.status(201).json({
      success: true,
      message: 'Showtime created successfully',
      data: showtime
    });
  } catch (error) {
    console.error('Error creating showtime:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const getShowtimes = async (req, res) => {
  try {
    const showtimes = await adminService.getShowtimes();
    res.json({
      success: true,
      data: showtimes
    });
  } catch (error) {
    console.error('Error listing showtimes:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const deleteShowtime = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.deleteShowtime(id);
    
    res.json({
      success: true,
      message: result.message
    });
  } catch (error) {
    console.error('Error deleting showtime:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
