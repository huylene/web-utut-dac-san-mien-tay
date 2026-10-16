# 05 — Đặc tả chức năng

## 1. Danh sách sản phẩm
- Đọc sản phẩm `is_active = true`.
- Hiển thị tên, ảnh, giá VND, mô tả ngắn, nhãn nổi bật.
- Có loading, empty state và thông báo lỗi.
- Không hiển thị sản phẩm ngừng bán.
- Giá hiển thị theo định dạng Việt Nam; giá lưu dưới dạng số nguyên VND.

## 2. Chi tiết sản phẩm
- Ảnh sản phẩm thật, tên, giá, mô tả, tình trạng hàng.
- Chọn số lượng; không cho số lượng nhỏ hơn 1.
- Nút thêm giỏ hàng.
- Form đánh giá: tên hiển thị, số sao 1–5, bình luận.
- Review mặc định `pending`; chỉ hiển thị review `approved`.
- Escape nội dung do người dùng nhập; không chèn bình luận trực tiếp bằng `innerHTML`.

## 3. Giỏ hàng
- Lưu danh sách `product_id` và quantity trong `localStorage`.
- Khi tải giỏ, lấy giá hiện tại từ Supabase và kiểm tra sản phẩm còn hoạt động.
- Cho tăng/giảm số lượng, xóa mặt hàng, xóa toàn bộ.
- Tổng tiền trên trình duyệt chỉ là bản xem trước; database phải tính lại lúc tạo đơn.
- Nếu giá hoặc tồn kho thay đổi, thông báo và yêu cầu khách xác nhận lại.

## 4. Checkout và tạo đơn
Trường bắt buộc:
- Họ tên người nhận.
- Số điện thoại.
- Địa chỉ giao hàng.
- Email (tùy chọn nếu không dùng cho thông báo).
- Ghi chú (tùy chọn).
- Đồng ý chính sách giao hàng và quyền riêng tư.

Yêu cầu:
- Validate phía client để UX tốt, nhưng kiểm tra phía database/RPC vẫn bắt buộc.
- Disable nút gửi trong lúc xử lý để tránh gửi lặp.
- Sinh mã idempotency hoặc cơ chế chống tạo đơn trùng.
- Sau khi tạo thành công, hiển thị mã đơn và trang hướng dẫn thanh toán.
- Không log dữ liệu cá nhân đầy đủ vào console.

## 5. Thanh toán bằng QR
### MVP không backend
- Cấu hình thông tin nhận chuyển khoản của shop từ cấu hình công khai không nhạy cảm: tên ngân hàng, số tài khoản nhận tiền, tên người thụ hưởng, mẫu QR hoặc URL QR được shop xác minh.
- Tạo nội dung chuyển khoản có `order_code`.
- Hiển thị tổng tiền và hướng dẫn khách chuyển khoản.
- Trạng thái ban đầu là `unpaid` / `pending_payment`.
- Nút “Tôi đã chuyển khoản” chỉ gửi thông báo/trạng thái chờ xác minh; tuyệt đối không tự đặt `paid`.
- Admin kiểm tra giao dịch trong tài khoản ngân hàng rồi xác nhận.

### Thanh toán tự động
Cần cổng thanh toán hoặc nhà cung cấp có webhook. Bí mật xác thực webhook phải nằm ở server-side (ví dụ Edge Function), xác minh chữ ký và chống replay. Frontend-only không đủ để xác minh giao dịch tự động an toàn.

## 6. Tra cứu đơn
- Khách nhập mã đơn và token tra cứu ngẫu nhiên được cấp sau khi tạo đơn; có thể kết hợp số điện thoại như một lớp xác minh bổ sung.
- Không cho tra cứu bằng mã đơn tăng dần.
- API/RPC chỉ trả thông tin tối thiểu: mã đơn, ngày tạo, trạng thái, tổng tiền, các dòng sản phẩm và thông tin giao hàng đã che bớt nếu phù hợp.
- Rate-limit/chống dò mã nên thực hiện ở tầng có khả năng kiểm soát request; không để lộ toàn bộ đơn qua query công khai.
- Nếu không muốn triển khai token an toàn, cung cấp kênh liên hệ shop để tra cứu thủ công.

## 7. Quản trị đơn
- Đăng nhập qua Supabase Auth.
- Dashboard: tổng đơn theo trạng thái, đơn mới, doanh thu chỉ tính đơn đã xác nhận thanh toán.
- Danh sách có tìm kiếm theo mã đơn, lọc trạng thái, phân trang.
- Chi tiết: người nhận, địa chỉ, sản phẩm snapshot, tổng tiền, lịch sử trạng thái nếu có.
- Cập nhật trạng thái theo luồng; không cho chuyển `cancelled` sang `shipping` nếu không có thao tác khôi phục rõ ràng.
- Hủy đơn nên lưu `cancelled`, không xóa vĩnh viễn. Xóa cứng chỉ dành cho dữ liệu thử nghiệm hoặc quy trình có kiểm soát.

## 8. Google Maps và YouTube
- YouTube embed dùng URL `https://www.youtube.com/embed/lr75kOuiZ-o?si=-7BKYyana0CKE7Fb`.
- Iframe có `title`, `loading="lazy"`, responsive 16:9.
- Google Maps: dùng địa chỉ cửa hàng thật đã được xác nhận; không bịa tọa độ. Có thể dùng link chỉ đường hoặc embed từ Google Maps.
- Kiểm tra chính sách quyền riêng tư nếu nhúng dịch vụ bên thứ ba.
