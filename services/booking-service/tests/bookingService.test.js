import { jest } from '@jest/globals';

// 1. Mock dependencies first before importing the target service (needed for ES Modules in Jest)
jest.unstable_mockModule('../models/index.js', () => {
  return {
    Booking: {
      findByPk: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    BookingSeat: {
      findAll: jest.fn(),
      bulkCreate: jest.fn(),
    },
    sequelize: {
      transaction: jest.fn(() => ({
        commit: jest.fn(),
        rollback: jest.fn(),
        LOCK: { UPDATE: 'LOCK_UPDATE' }
      })),
    },
    Sequelize: {
      Op: { notIn: 'notIn', lt: 'lt' },
      literal: jest.fn(val => val),
    }
  };
});

jest.unstable_mockModule('axios', () => {
  return {
    default: {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
    }
  };
});

jest.unstable_mockModule('ioredis', () => {
  return {
    default: jest.fn().mockImplementation(() => {
      return {
        set: jest.fn(),
        del: jest.fn(),
      };
    })
  };
});

jest.unstable_mockModule('amqplib', () => {
  return {
    default: {
      connect: jest.fn(),
    }
  };
});

// 2. Import the mock objects and the target service dynamically
const { Booking, BookingSeat } = await import('../models/index.js');
const { cancelBooking, getBookingStatus } = await import('../services/bookingService.js');
const axios = (await import('axios')).default;

describe('Booking Service - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getBookingStatus', () => {
    it('should return booking status if booking exists', async () => {
      Booking.findByPk.mockResolvedValue({
        id: 1,
        status: 'locked',
        booking_code: 'TEST-CODE'
      });

      const result = await getBookingStatus({ booking_id: 1 });
      expect(result).toEqual({
        id: 1,
        status: 'locked',
        booking_code: 'TEST-CODE'
      });
      expect(Booking.findByPk).toHaveBeenCalledWith(1, { attributes: ['id', 'status', 'booking_code'] });
    });

    it('should return null if booking does not exist', async () => {
      Booking.findByPk.mockResolvedValue(null);

      const result = await getBookingStatus({ booking_id: 999 });
      expect(result).toBeNull();
    });
  });

  describe('cancelBooking', () => {
    it('should successfully cancel a locked booking', async () => {
      const mockSave = jest.fn();
      const mockBooking = {
        id: 123,
        showtime_id: 456,
        status: 'locked',
        save: mockSave,
        toJSON: () => ({ id: 123, status: 'cancelled' })
      };

      Booking.findByPk.mockResolvedValue(mockBooking);
      BookingSeat.findAll.mockResolvedValue([
        { seat_id: 1 },
        { seat_id: 2 }
      ]);

      // Mock ZaloPay HTTP void call
      axios.post.mockResolvedValue({ data: { success: true } });

      const result = await cancelBooking({ booking_id: 123 });

      expect(result.success).toBe(true);
      expect(mockBooking.status).toBe('cancelled');
      expect(mockSave).toHaveBeenCalled();
      expect(BookingSeat.findAll).toHaveBeenCalledWith({
        where: { booking_id: 123 },
        transaction: expect.any(Object)
      });
    });

    it('should fail to cancel if booking is already confirmed', async () => {
      const mockBooking = {
        id: 123,
        status: 'confirmed'
      };

      Booking.findByPk.mockResolvedValue(mockBooking);

      const result = await cancelBooking({ booking_id: 123 });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Cannot cancel a confirmed booking');
    });
  });
});
