# 01 — Product Requirements Document (PRD)

## 1. Tổng quan
**Tên dự án:** Website Út Út — Đặc sản miền Tây  
**Tên miền dự kiến:** `utut.vn`  
**Mục tiêu:** Giới thiệu thương hiệu, trưng bày sản phẩm và nhận đơn đặt mua trực tuyến với trải nghiệm thân thiện, ưu tiên thiết bị di động.

## 2. Người dùng mục tiêu
- Người yêu thích ẩm thực miền Tây.
- Nhân viên văn phòng mua đồ ăn vặt.
- Người cần mua đặc sản làm quà.
- Nhân viên quản trị xử lý đơn, sản phẩm và đánh giá.

## 3. Mục tiêu kinh doanh
- Giúp khách hiểu sản phẩm, nguồn gốc và cách sử dụng.
- Tăng số đơn đặt hàng trực tuyến.
- Giảm thao tác thủ công khi tiếp nhận và theo dõi đơn.
- Xây dựng nền tảng có thể mở rộng sau MVP.

## 4. Sitemap
- `/` — Trang chủ: hero/banner, sản phẩm nổi bật, danh mục, câu chuyện thương hiệu, video, CTA.
- `/about.html` — Về Út Út: câu chuyện, giá trị, video YouTube, bản đồ cửa hàng.
- `/products.html` — Danh sách sản phẩm, tìm kiếm/lọc/sắp xếp.
- `/product.html?id=...` — Chi tiết sản phẩm, ảnh, giá, mô tả, số lượng, thêm giỏ, đánh giá.
- `/cart.html` — Giỏ hàng.
- `/checkout.html` — Thông tin nhận hàng và xác nhận đơn.
- `/payment.html?order=...` — Thông tin chuyển khoản/QR và hướng dẫn thanh toán.
- `/track-order.html` — Tra cứu đơn.
- `/admin/` — Giao diện quản trị, chỉ cho người dùng đã xác thực và được phân quyền.

## 5. Chức năng
### Khách hàng
- Xem danh sách và chi tiết sản phẩm từ Supabase.
- Tìm kiếm, lọc theo danh mục, xem sản phẩm nổi bật.
- Thêm/xóa/cập nhật số lượng sản phẩm trong giỏ.
- Tạo đơn với tên, số điện thoại, địa chỉ, ghi chú.
- Xem QR chuyển khoản được cấu hình bởi chủ shop.
- Tra cứu đơn bằng mã đơn và thông tin xác minh phù hợp.
- Gửi đánh giá; đánh giá mới ở trạng thái chờ duyệt.
- Xem video YouTube và bản đồ cửa hàng.

### Quản trị viên
- Đăng nhập bằng Supabase Auth.
- Xem danh sách đơn, tìm kiếm/lọc theo trạng thái và ngày.
- Xem chi tiết đơn và các mặt hàng.
- Cập nhật trạng thái đơn theo luồng hợp lệ.
- Hủy đơn hoặc lưu trạng thái hủy; hạn chế xóa vĩnh viễn để giữ lịch sử.
- CRUD sản phẩm và danh mục.
- Duyệt/ẩn/xóa đánh giá rác.
- Xuất dữ liệu CSV nếu cần.

## 6. Trạng thái đơn hàng
- `pending_payment` — Chờ thanh toán.
- `pending_confirmation` — Đã báo thanh toán, chờ shop xác minh (nếu dùng bước này).
- `confirmed` — Đã xác nhận đơn.
- `preparing` — Đang chuẩn bị hàng.
- `shipping` — Đang giao.
- `completed` — Đã hoàn tất.
- `cancelled` — Đã hủy.
- `payment_failed` — Thanh toán không hợp lệ/không nhận được tiền.

Chỉ admin hoặc luồng xác minh thanh toán đáng tin cậy mới được đánh dấu `paid`. Không suy ra thanh toán thành công từ giao diện QR hoặc thao tác của người dùng.

## 7. Ngoài phạm vi MVP
- Tích hợp tự động với đơn vị vận chuyển.
- Tính phí vận chuyển theo thời gian thực.
- Đồng bộ tồn kho đa kho.
- Tích hợp cổng thanh toán tự động nếu chưa có server-side webhook.
- Hệ thống khuyến mãi phức tạp, điểm thành viên và hóa đơn điện tử.

## 8. Chỉ số thành công
- Trang sản phẩm tải ổn định trên mobile.
- Khách có thể hoàn tất tạo đơn mà không cần tài khoản.
- Mỗi đơn có mã đơn duy nhất và thông tin tra cứu được bảo vệ.
- Admin chỉ xem/sửa dữ liệu theo quyền.
- Không có bí mật quản trị trong bundle frontend.
