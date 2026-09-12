import { jest } from '@jest/globals';

// ─── 1. Mock all dependencies BEFORE dynamic imports ─────────────────────────
jest.unstable_mockModule('axios', () => ({
  default: {
    post: jest.fn(),
  },
}));

jest.unstable_mockModule('crypto-js', () => ({
  default: {
    HmacSHA256: jest.fn(() => ({
      toString: () => 'mock_hmac_sha256_signature',
    })),
  },
}));

jest.unstable_mockModule('moment', () => ({
  default: jest.fn(() => ({
    format: jest.fn(() => '260822'),
  })),
}));

// ─── 2. Dynamically import after mocks ───────────────────────────────────────
const { createOrder, verifyCallback, refundOrder } = await import('../services/zalopayService.js');
const CryptoJS = (await import('crypto-js')).default;
const axios = (await import('axios')).default;

// ─── 3. Test Suites ───────────────────────────────────────────────────────────
describe('ZaloPay Service — Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CryptoJS.HmacSHA256.mockImplementation(() => ({
      toString: () => 'mock_hmac_sha256_signature',
    }));
  });

  // ─── verifyCallback ─────────────────────────────────────────────────────────
  describe('verifyCallback', () => {
    it('should return TRUE when computed MAC matches received MAC', () => {
      const dataStr = '{"app_trans_id":"260822_123","amount":100000}';
      const validMac = 'mock_hmac_sha256_signature';

      const result = verifyCallback(dataStr, validMac);

      expect(result).toBe(true);
      expect(CryptoJS.HmacSHA256).toHaveBeenCalledWith(dataStr, expect.any(String));
    });

    it('should return FALSE when MAC does not match (tampered data)', () => {
      const dataStr = '{"app_trans_id":"260822_123","amount":100000}';
      const tamperedMac = 'completely_wrong_mac_signature';

      const result = verifyCallback(dataStr, tamperedMac);

      expect(result).toBe(false);
    });

    it('should return FALSE when receivedMac is empty string', () => {
      const result = verifyCallback('{"data":"test"}', '');
      expect(result).toBe(false);
    });

    it('should handle exceptions gracefully and return false', () => {
      CryptoJS.HmacSHA256.mockImplementation(() => {
        throw new Error('Crypto error');
      });

      const result = verifyCallback('data', 'mac');
      expect(result).toBe(false);
    });
  });

  // ─── createOrder ────────────────────────────────────────────────────────────
  describe('createOrder', () => {
    it('should create ZaloPay order successfully and return success=true', async () => {
      axios.post.mockResolvedValue({
        data: {
          return_code: 1,
          return_message: 'Success',
          order_url: 'https://qr.zalopay.vn/mock-qr-url',
          zp_trans_token: 'mock_zp_token_abc123',
        },
      });

      const result = await createOrder({
        booking_id: 42,
        booking_code: 'BOOK-42',
        amount: 172500,
        description: 'Thanh toan ve phim BOOK-42',
      });

      expect(result.success).toBe(true);
      expect(result.order_url).toBe('https://qr.zalopay.vn/mock-qr-url');
      expect(result.zp_trans_token).toBe('mock_zp_token_abc123');
      expect(result.app_trans_id).toBeDefined();
      expect(typeof result.app_trans_id).toBe('string');
    });

    it('should return success=false when ZaloPay returns return_code !== 1', async () => {
      axios.post.mockResolvedValue({
        data: {
          return_code: -1,
          return_message: 'App không tồn tại',
          order_url: null,
          zp_trans_token: null,
        },
      });

      const result = await createOrder({
        booking_id: 99,
        booking_code: 'BOOK-99',
        amount: 50000,
        description: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.return_code).toBe(-1);
    });

    it('should throw error when ZaloPay API is unreachable', async () => {
      axios.post.mockRejectedValue(new Error('Network Error: ZaloPay API is down'));

      await expect(
        createOrder({ booking_id: 1, booking_code: 'B1', amount: 100000, description: 'Test' })
      ).rejects.toThrow('Network Error: ZaloPay API is down');
    });

    it('should round the amount to integer before sending to ZaloPay', async () => {
      axios.post.mockResolvedValue({
        data: { return_code: 1, return_message: 'OK', order_url: 'https://qr.zalopay.vn/x', zp_trans_token: 'tok' },
      });

      await createOrder({ booking_id: 1, booking_code: 'B1', amount: 172500.7, description: 'Test' });

      const callArgs = axios.post.mock.calls[0];
      const params = callArgs[2]?.params;
      expect(params?.amount).toBe(172501); // Math.round(172500.7)
    });

    it('should call HMAC-SHA256 to generate MAC signature for security', async () => {
      axios.post.mockResolvedValue({
        data: { return_code: 1, return_message: 'OK', order_url: 'https://q.zp/x', zp_trans_token: 't' },
      });

      await createOrder({ booking_id: 5, booking_code: 'B5', amount: 85000, description: 'Test' });

      expect(CryptoJS.HmacSHA256).toHaveBeenCalled();
    });
  });

  // ─── refundOrder ─────────────────────────────────────────────────────────────
  describe('refundOrder', () => {
    it('should return success=true when ZaloPay returns return_code 1 (immediate refund)', async () => {
      axios.post.mockResolvedValue({
        data: {
          return_code: 1,
          return_message: 'Success',
          refund_id: 789,
          sub_return_code: 1,
          sub_return_message: 'Success',
        },
      });

      const result = await refundOrder({
        zp_trans_id: '261225000123456',
        amount: 172500,
        description: 'Refund booking BOOK-42',
        booking_id: 42,
      });

      expect(result.success).toBe(true);
      expect(result.refund_id).toBe(789);
      expect(result.m_refund_id).toBeDefined();
    });

    it('should return success=true when ZaloPay returns return_code 3 (processing)', async () => {
      axios.post.mockResolvedValue({
        data: {
          return_code: 3,
          return_message: 'Processing',
          refund_id: 790,
        },
      });

      const result = await refundOrder({
        zp_trans_id: '261225000123456',
        amount: 100000,
        description: 'Refund',
        booking_id: 10,
      });

      expect(result.success).toBe(true); // return_code 3 = accepted/processing
    });

    it('should return success=false when ZaloPay returns return_code -1 (failure)', async () => {
      axios.post.mockResolvedValue({
        data: {
          return_code: -1,
          return_message: 'Invalid transaction ID',
          refund_id: null,
        },
      });

      const result = await refundOrder({
        zp_trans_id: '999',
        amount: 50000,
        description: 'Refund',
        booking_id: 5,
      });

      expect(result.success).toBe(false);
      expect(result.return_code).toBe(-1);
    });

    it('should throw error when ZaloPay refund API is unreachable', async () => {
      axios.post.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(
        refundOrder({ zp_trans_id: '123', amount: 100000, description: 'R', booking_id: 1 })
      ).rejects.toThrow('ECONNREFUSED');
    });
  });
});
