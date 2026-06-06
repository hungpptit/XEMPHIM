import * as adminStatsService from '../services/adminStatsService.js';

export const getDashboardStats = async (req, res) => {
  try {
    const stats = await adminStatsService.getRevenueStats(req.app.locals.models);
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
