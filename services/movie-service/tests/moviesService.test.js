import { jest } from '@jest/globals';

// ─── 1. Mock all dependencies BEFORE dynamic imports ─────────────────────────
jest.unstable_mockModule('../models/index.js', () => ({
  Movie: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    findAndCountAll: jest.fn(),
  },
  Genre: {
    findAll: jest.fn(),
  },
}));

jest.unstable_mockModule('ioredis', () => ({
  default: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
  })),
}));

// ─── 2. Dynamic imports after mocks ──────────────────────────────────────────
const { Movie } = await import('../models/index.js');
const Redis = (await import('ioredis')).default;
const { listMovies, getMovieById, invalidateListCache } = await import('../services/moviesService.js');

// Get the mock Redis instance
const redisMock = Redis.mock.results[0]?.value;

// ─── 3. Test Suites ───────────────────────────────────────────────────────────
describe('Movies Service — Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Redis mock methods
    if (redisMock) {
      redisMock.get.mockReset();
      redisMock.set.mockReset();
      redisMock.del.mockReset();
      redisMock.scan.mockReset();
    }
  });

  // ─── getMovieById ────────────────────────────────────────────────────────────
  describe('getMovieById', () => {
    const mockMovie = {
      id: 1,
      title: 'Avengers: Endgame',
      description: 'Epic Marvel movie',
      poster_url: 'https://example.com/poster.jpg',
      duration_minutes: 181,
      rating: 8.4,
      director: 'Anthony Russo',
      status: 'now_showing',
    };

    it('should return movie from DB when cache MISS', async () => {
      if (redisMock) redisMock.get.mockResolvedValue(null); // Cache miss
      Movie.findByPk.mockResolvedValue(mockMovie);

      const result = await getMovieById(1);

      expect(result).toEqual(mockMovie);
      expect(Movie.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({ attributes: expect.any(Array) }));
    });

    it('should return null when movie does not exist in DB', async () => {
      if (redisMock) redisMock.get.mockResolvedValue(null);
      Movie.findByPk.mockResolvedValue(null);

      const result = await getMovieById(9999);

      expect(result).toBeNull();
    });

    it('should return cached movie without hitting DB on cache HIT', async () => {
      const cachedData = JSON.stringify(mockMovie);
      if (redisMock) {
        redisMock.get.mockResolvedValue(cachedData); // Cache hit
      }

      const result = await getMovieById(1);

      // When Redis is configured and returns cached value, DB should NOT be called
      if (redisMock) {
        expect(Movie.findByPk).not.toHaveBeenCalled();
        expect(result).toEqual(mockMovie);
      } else {
        // No Redis - always hits DB
        expect(Movie.findByPk).toHaveBeenCalled();
      }
    });

    it('should store movie in cache after DB fetch', async () => {
      if (redisMock) {
        redisMock.get.mockResolvedValue(null); // Cache miss
        redisMock.set.mockResolvedValue('OK');
      }
      Movie.findByPk.mockResolvedValue(mockMovie);

      await getMovieById(1);

      if (redisMock) {
        expect(redisMock.set).toHaveBeenCalledWith(
          `movies:detail:1`,
          JSON.stringify(mockMovie),
          'EX',
          3600
        );
      }
    });
  });

  // ─── invalidateListCache ──────────────────────────────────────────────────────
  describe('invalidateListCache', () => {
    it('should scan and delete all movies:list* keys', async () => {
      if (!redisMock) {
        // No Redis configured - invalidate is a no-op
        await expect(invalidateListCache()).resolves.not.toThrow();
        return;
      }

      // Simulate SCAN returning keys in 2 iterations then done
      redisMock.scan
        .mockResolvedValueOnce(['1', ['movies:list', 'movies:list:1:10']])
        .mockResolvedValueOnce(['0', []]); // cursor = '0' means done

      redisMock.del.mockResolvedValue(2);

      await invalidateListCache();

      expect(redisMock.scan).toHaveBeenCalledWith('0', 'MATCH', 'movies:list*', 'COUNT', 100);
      expect(redisMock.del).toHaveBeenCalledWith('movies:list', 'movies:list:1:10');
    });

    it('should not throw if Redis DEL fails', async () => {
      if (!redisMock) {
        await expect(invalidateListCache()).resolves.not.toThrow();
        return;
      }

      redisMock.scan.mockResolvedValue(['0', ['movies:list']]);
      redisMock.del.mockRejectedValue(new Error('Redis connection lost'));

      // Should NOT propagate the error — just warn
      await expect(invalidateListCache()).resolves.not.toThrow();
    });
  });

  // ─── listMovies ──────────────────────────────────────────────────────────────
  describe('listMovies with options', () => {
    const mockMovies = [
      { id: 1, title: 'Movie A', status: 'now_showing' },
      { id: 2, title: 'Movie B', status: 'coming_soon' },
    ];

    it('should return paginated movies when page and limit options are given', async () => {
      if (redisMock) {
        redisMock.get.mockResolvedValue(null); // Cache miss
        redisMock.set.mockResolvedValue('OK');
      }

      Movie.findAndCountAll.mockResolvedValue({
        rows: mockMovies,
        count: 2,
      });

      const result = await listMovies({ page: 1, limit: 10 });

      expect(Movie.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 0,
        })
      );
      expect(result).toEqual({ rows: mockMovies, count: 2 });
    });

    it('should return cached result when paginated movies are in cache', async () => {
      const cachedMovies = { rows: [{ id: 1, title: 'Cached Movie' }], count: 1 };
      if (redisMock) {
        redisMock.get.mockResolvedValue(JSON.stringify(cachedMovies));
      }

      const result = await listMovies({ page: 1, limit: 10 });

      if (redisMock) {
        expect(Movie.findAndCountAll).not.toHaveBeenCalled();
        expect(result).toEqual(cachedMovies);
      }
    });
  });
});
