const http = require('http');
const fs = require('fs');
const path = require('path');

function fetchJson(url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

(async () => {
  console.log('1/4: Đang tải danh sách phim từ database...');
  const moviesRes = await fetchJson('http://localhost:8080/api/movies');
  const movies = moviesRes?.movies || [];

  console.log('2/4: Đang tải lịch chiếu và sơ đồ ghế...');
  const showtimesByMovie = {};
  const seatMapByShowtime = {};

  for (const m of movies) {
    const stList = await fetchJson(`http://localhost:8080/api/movies/${m.id}/showtimes`);
    if (stList && Array.isArray(stList)) {
      showtimesByMovie[m.id] = stList;
      for (const st of stList.slice(0, 3)) {
        if (!seatMapByShowtime[st.id]) {
          const sm = await fetchJson(`http://localhost:8080/api/seats/showtimes/${st.id}/seats`);
          if (sm) seatMapByShowtime[st.id] = sm;
        }
      }
    }
  }

  console.log('3/4: Đang tải danh sách vé mẫu từ user 5 & 6...');
  const b5 = await fetchJson('http://localhost:8080/api/bookings/user/5');
  const b6 = await fetchJson('http://localhost:8080/api/bookings/user/6');
  const allBookings = [...(b5?.bookings || []), ...(b6?.bookings || [])];
  
  const sampleBookings = allBookings
    .filter((b) => b.status === 'confirmed' || b.status === 'refunded')
    .slice(0, 8);

  console.log('4/4: Đang ghi dữ liệu vào frontend/src/mock/mockData.js...');
  const mockDataDir = path.join(__dirname, '..', 'frontend', 'src', 'mock');
  if (!fs.existsSync(mockDataDir)) {
    fs.mkdirSync(mockDataDir, { recursive: true });
  }

  const fileContent = `/**
 * DỮ LIỆU MOCK / FALLBACK CHO DỰ ÁN XEMPHIM (LIVE DEMO CV)
 * Dữ liệu được trích xuất trực tiếp từ Database PostgreSQL/MSSQL đang chạy của dự án.
 * Cho phép người xem (HR / Tech Lead) trải nghiệm 100% tính năng khi deploy lên Vercel mà không cần backend local.
 */

export const mockMovies = ${JSON.stringify(movies, null, 2)};

export const mockShowtimes = ${JSON.stringify(showtimesByMovie, null, 2)};

export const mockSeatMaps = ${JSON.stringify(seatMapByShowtime, null, 2)};

export const mockUser = {
  id: 1,
  name: "Nhà Tuyển Dụng (Demo VIP)",
  fullName: "Nhà Tuyển Dụng (Demo VIP)",
  email: "recruiter.demo@xemphim.vn",
  phone: "0988888888",
  role: "vip_member",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
};

export const mockBookings = ${JSON.stringify(sampleBookings, null, 2)};
`;

  fs.writeFileSync(path.join(mockDataDir, 'mockData.js'), fileContent, 'utf-8');
  console.log(`✅ Xuất thành công! Dung lượng file: ${(fileContent.length / 1024).toFixed(1)} KB`);
})();
