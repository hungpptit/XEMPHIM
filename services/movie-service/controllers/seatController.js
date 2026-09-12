import httpClient from '../utils/httpClient.js';
const SEAT_SERVICE = process.env.SEAT_SERVICE_URL || 'http://localhost:4003';

/**
 * Seat Controllers in Movie Service
 * Ủy quyền hoàn toàn (Reverse Proxy / Service Delegation) sang Seat Service (Single Source of Truth)
 */

export const createSeats = async (req, res) => {
  try {
    const { hallId, seats } = req.body;
    const response = await httpClient.post(`${SEAT_SERVICE}/api/seats/bulk`, seats.map(s => ({ ...s, hall_id: hallId })));
    res.status(201).json({
      success: true,
      message: `${response.data.length} ghế được tạo thành công`,
      data: response.data
    });
  } catch (error) {
    console.error('[Seat Controller] Error creating seats via seat-service:', error.message);
    res.status(error.response?.status || 400).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
};

export const getSeatsByHall = async (req, res) => {
  try {
    const { hallId } = req.params;
    const response = await httpClient.get(`${SEAT_SERVICE}/api/seats/hall/${hallId}`);
    res.json(response.data);
  } catch (error) {
    console.error('[Seat Controller] Error getting seats from seat-service:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
};

export const getSeatLayout = async (req, res) => {
  try {
    const { hallId } = req.params;
    const response = await httpClient.get(`${SEAT_SERVICE}/api/seats/hall/${hallId}/layout`);
    res.json(response.data);
  } catch (error) {
    console.error('[Seat Controller] Error getting seat layout from seat-service:', error.message);
    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
};

export const updateSeat = async (req, res) => {
  try {
    const { seatId } = req.params;
    const response = await httpClient.put(`${SEAT_SERVICE}/api/seats/${seatId}`, req.body);
    res.json({
      success: true,
      message: 'Ghế được cập nhật thành công',
      data: response.data
    });
  } catch (error) {
    console.error('[Seat Controller] Error updating seat via seat-service:', error.message);
    res.status(error.response?.status || 400).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
};

export const updateSeatType = async (req, res) => {
  try {
    const { hallId } = req.params;
    const response = await httpClient.put(`${SEAT_SERVICE}/api/seats/hall/${hallId}/type`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error('[Seat Controller] Error updating seat type via seat-service:', error.message);
    res.status(error.response?.status || 400).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
};

export const deleteSeat = async (req, res) => {
  try {
    const { seatId } = req.params;
    const response = await httpClient.delete(`${SEAT_SERVICE}/api/seats/${seatId}`);
    res.json({
      success: true,
      message: 'Ghế đã xoá thành công',
      data: response.data
    });
  } catch (error) {
    console.error('[Seat Controller] Error deleting seat via seat-service:', error.message);
    res.status(error.response?.status || 400).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
};

