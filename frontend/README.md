# 🎬 CinemaX - Hệ thống đặt vé xem phim online

Một ứng dụng web hiện đại cho việc đặt vé xem phim online với giao diện tối màu, cảm giác rạp chiếu phim thực tế.

## 🚀 Tính năng

- ✨ **Giao diện hiện đại**: Theme tối với hiệu ứng ánh sáng vàng gold
- 🎥 **Xem phim**: Danh sách phim đang chiếu và sắp chiếu
- 🎫 **Đặt vé dễ dàng**: Chọn suất chiếu, ghế ngồi trực quan
- 💳 **Thanh toán an toàn**: Hỗ trợ nhiều phương thức thanh toán
- 📱 **Responsive**: Tương thích mọi thiết bị
- 🎟️ **Quản lý vé**: Xem và quản lý vé đã đặt

## 🛠️ Công nghệ sử dụng

- **Frontend**: React 18 + CSS Modules
- **Routing**: React Router DOM
- **Icons**: React Icons
- **HTTP Client**: Axios
- **State Management**: React Hooks
- **Storage**: LocalStorage

## 📁 Cấu trúc dự án

```
frontend/
├── src/
│   ├── components/          # Components tái sử dụng
│   │   ├── Navbar.js
│   │   ├── Navbar.module.css
│   │   ├── MovieCard.js
│   │   └── MovieCard.module.css
│   ├── modules/             # Modules chính
│   │   ├── Home/
│   │   ├── MovieDetail/
│   │   ├── SeatSelection/
│   │   ├── Payment/
│   │   └── MyTickets/
│   ├── services/            # API services
│   │   └── api.js
│   ├── utils/               # Utility functions
│   │   └── helpers.js
│   ├── styles/              # Global styles
│   │   └── theme.module.css
│   ├── App.js
│   └── index.js
├── public/
├── package.json
└── README.md
```

## 🎨 Theme & Design

### Màu sắc chủ đạo
- **Nền**: `#0C0C0C` (Đen rạp chiếu phim)
- **Vàng Gold**: `#FFD700` (Ánh sáng màn chiếu)
- **Đỏ nhung**: `#B22222` (Ghế rạp & rèm màn)
- **Xám bạc**: `#C0C0C0` (Tương phản tinh tế)

### Hiệu ứng
- Animation fadeIn, slideUp, glowPulse
- Hover effects với shadow và transform
- Gradient backgrounds
- Box-shadow với màu gold

## 🚦 Cài đặt và chạy

### 1. Cài đặt dependencies

```bash
cd frontend
npm install
```

### 2. Chạy ứng dụng

```bash
npm start
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

### 3. Build for production

```bash
npm run build
```

## 🎯 Flow sử dụng

1. **Trang chủ**: Xem danh sách phim đang chiếu/sắp chiếu
2. **Chi tiết phim**: Xem thông tin chi tiết, trailer, lịch chiếu
3. **Chọn ghế**: Chọn ghế ngồi trên sơ đồ rạp
4. **Thanh toán**: Nhập thông tin và thanh toán
5. **Vé của tôi**: Quản lý và xem vé đã đặt

## 📱 Responsive Design

- **Desktop**: Giao diện đầy đủ với sidebar và grid layout
- **Tablet**: Responsive grid, adjust components
- **Mobile**: Single column, touch-friendly interface

## 🎭 Mock Data

Ứng dụng sử dụng mock data cho demo:
- 6 phim mẫu với thông tin đầy đủ
- Lịch chiếu 3 ngày
- Sơ đồ ghế 8 hàng x 12 ghế
- Trạng thái ghế: Trống, Đã đặt, VIP

## 🔧 Tùy chỉnh

### Thêm phim mới
Chỉnh sửa file `src/modules/Home/Home.js` - `mockMovies` array

### Thay đổi theme
Chỉnh sửa file `src/styles/theme.module.css` - CSS variables

### Thêm phương thức thanh toán
Chỉnh sửa file `src/modules/Payment/Payment.js` - `paymentMethods` array

## 🐛 Debug

### Common Issues

1. **CSS không load**: Kiểm tra import path CSS modules
2. **Router không hoạt động**: Kiểm tra BrowserRouter setup
3. **LocalStorage data**: Xóa localStorage để reset data

### Browser DevTools

- React Developer Tools
- Network tab để debug API calls
- Console để xem errors

## 📈 Performance

- Lazy loading images
- CSS Modules để tránh conflict
- Debounced search
- Memoized components

## 🔒 Security

- Input validation
- XSS prevention
- CSRF protection (khi có backend)
- Secure storage practices

## 🚀 Deployment

### Vercel
```bash
npm install -g vercel
vercel --prod
```

### Netlify
```bash
npm run build
# Upload dist folder to Netlify
```

### Traditional hosting
```bash
npm run build
# Upload build folder to server
```

## 📄 License

MIT License - Có thể sử dụng cho mục đích học tập và thương mại.

## 👨‍💻 Developer Notes

### Code Style
- ESLint + Prettier
- CSS Modules naming: camelCase
- Component naming: PascalCase
- Function naming: camelCase

### Best Practices
- Single responsibility components
- Reusable utility functions
- Consistent error handling
- Accessible design (a11y)

---

**Developed with ❤️ for OOAD Project**

*Hệ thống đặt vé xem phim online với trải nghiệm người dùng tối ưu*