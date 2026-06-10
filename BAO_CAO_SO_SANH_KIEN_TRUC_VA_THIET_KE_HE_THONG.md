# BÁO CÁO SO SÁNH TÀI LIỆU KIẾN TRÚC VỚI HỆ THỐNG THỰC TẾ

**Tài liệu gốc được kiểm tra:** [KIẾN TRÚC VÀ THIẾT KẾ HỆ THỐNG.md](d:/XEMPHIM/XEMPHIM/KI%E1%BA%BEN%20TR%C3%9AC%20V%C3%80%20TH%E1%BA%BET%20K%E1%BA%BE%20H%E1%BB%86%20TH%E1%BB%90NG.md)

## Các điểm còn sai hoặc cần chốt lại

### 1.1 Thời gian giữ ghế chưa thống nhất: 180 giây

Trong tài liệu gốc và code hiện tại vẫn còn lệch giữa 2 mốc:
- Swagger đang ghi 120 giây.
- Luồng controller/QR flow đang chạy 180 giây.

Cần chốt lại một con số thống nhất trong toàn bộ tài liệu. Nếu muốn bám theo luồng thực tế hiện tại thì nên ghi 180 giây và sửa luôn các chỗ còn nhắc 120 giây để tránh bị hỏi ngược khi bảo vệ.

### 1.2 Ghi chú về lock ghế nên đồng nhất với con số đã chốt

Nếu đã chọn 180 giây thì các đoạn mô tả liên quan đến Redis lock, QR flow và expiry job cũng պետք phải dùng cùng một mốc này. Không nên để một chỗ 180 giây, chỗ khác 120 giây vì dễ gây hiểu nhầm là hệ thống có hai TTL khác nhau.

## Kết luận ngắn

Hiện tại lỗi còn lại đáng chú ý nhất là thời gian giữ ghế chưa đồng nhất. Các phần khác trong file kiến trúc đã khá sát thực tế hơn trước, nên file báo cáo chỉ cần giữ ngắn gọn như trên để bạn sửa tiếp đúng chỗ.