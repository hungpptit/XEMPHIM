# 🎬 XEMPHIM - Hệ thống đặt vé xem phim online

[![React](https://img.shields.io/badge/React-18.x-blue)](https://reactjs.org/)
[![CSS Modules](https://img.shields.io/badge/CSS-Modules-green)](https://github.com/css-modules/css-modules)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Một ứng dụng web hiện đại cho việc đặt vé xem phim online với giao diện tối màu, cảm giác rạp chiếu phim thực tế.

![CinemaX Preview](https://images.unsplash.com/photo-1489599185395-bef5ad3c77e1?ixlib=rb-4.0.3&w=1200&h=400&fit=crop)

## ✨ Tính năng chính

- 🎥 **Xem phim**: Danh sách phim đang chiếu và sắp chiếu
- 🎫 **Đặt vé dễ dàng**: Chọn suất chiếu, ghế ngồi trực quan
- 💳 **Thanh toán an toàn**: Hỗ trợ MoMo, VNPay, Visa, Chuyển khoản
- 📱 **Responsive Design**: Tương thích mọi thiết bị
- 🎟️ **Quản lý vé**: Xem và quản lý vé đã đặt với QR code
- ⚡ **Hiệu suất cao**: Loading nhanh, animations mượt mà

## 🎨 Giao diện & UX

### Theme rạp chiếu phim
- **Tông màu chủ đạo**: Đen (#0C0C0C) + Vàng Gold (#FFD700) + Đỏ nhung (#B22222)
- **Typography**: Poppins (chính) + Bebas Neue (tiêu đề)
- **Hiệu ứng**: Glow effects, smooth transitions, hover animations

### Screenshots
- 🏠 **Trang chủ**: Hero banner + phim đang chiếu
- 🎞️ **Chi tiết phim**: Poster, trailer, lịch chiếu
- 🪑 **Chọn ghế**: Sơ đồ rạp interactive
- 💳 **Thanh toán**: Form payment với validation
- 🎟️ **Vé của tôi**: Danh sách vé với QR code

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 18** - UI Framework với Hooks
- **React Router DOM** - Client-side routing
- **CSS Modules** - Scoped styling
- **React Icons** - Icon library
- **Axios** - HTTP client

### Development
- **Create React App** - Build toolchain
- **ESLint** - Code linting
- **Prettier** - Code formatting

## 📁 Cấu trúc dự án

```
XEMPHIM/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   │   ├── Navbar.js
│   │   │   └── MovieCard.js
│   │   ├── modules/          # Feature modules
│   │   │   ├── Home/         # Trang chủ
│   │   │   ├── MovieDetail/  # Chi tiết phim
│   │   │   ├── SeatSelection/# Chọn ghế
│   │   │   ├── Payment/      # Thanh toán
│   │   │   └── MyTickets/    # Vé của tôi
│   │   ├── services/         # API services
│   │   ├── utils/            # Utility functions
│   │   └── styles/           # Global styles
│   ├── public/
│   └── package.json
├── docs/                     # Documentation
├── .gitignore
└── README.md
```

## 🚀 Cài đặt và chạy

### Prerequisites
- Node.js 16+ 
- npm hoặc yarn

### Installation

1. **Clone repository**
```bash
git clone https://github.com/hungpptit/XEMPHIM.git
cd XEMPHIM
```

2. **Install dependencies**
```bash
cd frontend
npm install
```

3. **Start development server**
```bash
npm start
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

### Build for production
```bash
npm run build
```

## 📱 User Flow

1. **🏠 Trang chủ**: Xem danh sách phim đang chiếu/sắp chiếu
2. **🎞️ Chi tiết phim**: Xem thông tin chi tiết, trailer, chọn suất chiếu
3. **🪑 Chọn ghế**: Chọn ghế ngồi trên sơ đồ rạp (VIP/Thường)
4. **💳 Thanh toán**: Nhập thông tin khách hàng và thanh toán
5. **🎟️ Vé của tôi**: Xem vé đã đặt, QR code, có thể hủy vé

## 🎭 Mock Data

Hiện tại sử dụng mock data cho demo:
- **6 phim mẫu** với thông tin đầy đủ
- **Lịch chiếu 3 ngày** (hôm nay, ngày mai, thứ 5)
- **Sơ đồ ghế 8x12** với 3 loại: Trống/Đã đặt/VIP
- **4 phương thức thanh toán**: MoMo, VNPay, Visa, Chuyển khoản

> 📋 Xem chi tiết tại: [MOCK_DATA_LOCATIONS.md](./MOCK_DATA_LOCATIONS.md)

## 🔧 Customization

### Thêm phim mới
```javascript
// Chỉnh sửa: src/modules/Home/Home.js
const newMovie = {
  id: 7,
  title: "Tên phim mới",
  description: "Mô tả phim...",
  poster: "URL ảnh poster",
  rating: 8.5,
  duration: 120,
  releaseYear: 2024,
  genre: "Thể loại",
  isAvailable: true
};
```

### Thay đổi theme colors
```css
/* Chỉnh sửa: src/styles/theme.module.css */
:root {
  --bg-primary: #0C0C0C;        /* Màu nền chính */
  --color-gold: #FFD700;        /* Màu vàng gold */
  --color-red: #B22222;         /* Màu đỏ nhung */
  --color-silver: #C0C0C0;      /* Màu bạc */
}
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Netlify
```bash
npm run build
# Upload build folder to Netlify
```

### Traditional Hosting
```bash
npm run build
# Upload build folder to your web server
```

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## 📈 Performance

- ⚡ **Fast loading**: Optimized images, code splitting
- 🎨 **CSS Modules**: No style conflicts, optimized CSS
- 🔍 **SEO friendly**: Meta tags, semantic HTML
- ♿ **Accessibility**: ARIA labels, keyboard navigation

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**hungpptit**
- GitHub: [@hungpptit](https://github.com/hungpptit)

## 🙏 Acknowledgments

- Design inspiration from modern cinema websites
- Icons from React Icons library
- Images from Unsplash
- Fonts from Google Fonts

---

<div align="center">

**🎬 Developed with ❤️ for OOAD Project**

*Trải nghiệm đặt vé xem phim hiện đại và tiện lợi*

[![GitHub stars](https://img.shields.io/github/stars/hungpptit/XEMPHIM?style=social)](https://github.com/hungpptit/XEMPHIM/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/hungpptit/XEMPHIM?style=social)](https://github.com/hungpptit/XEMPHIM/network/members)

</div>