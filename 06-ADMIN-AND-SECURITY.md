# 06 — Admin và bảo mật

## 1. Quy tắc bắt buộc
- Trang `/admin/` không được xem là an toàn chỉ vì URL khó đoán.
- Dùng Supabase Auth; không tự viết hệ thống mật khẩu bằng localStorage.
- Không lưu password, service-role key, secret API hoặc webhook secret trong frontend.
- Bật RLS cho tất cả bảng.
- Chỉ tài khoản được cấp role `admin` mới có quyền quản trị.
- Thực hiện least privilege: chỉ cấp quyền tối thiểu cần dùng.

## 2. Quản lý admin
- Tạo user quản trị qua Supabase Auth Dashboard hoặc quy trình bảo mật.
- Cấp role admin bằng quy trình chỉ chủ dự án được phép thực hiện.
- Frontend chỉ hiển thị giao diện admin sau khi xác thực và kiểm tra quyền; đây chỉ là UX, database policy mới là lớp bảo vệ.
- Nếu role lưu trong `profiles`, tránh cho user tự sửa role của mình.
- Khi đăng xuất, xóa session theo API Supabase và đưa về trang login.

## 3. Bảo vệ đơn hàng
- Không cho anon `SELECT` bảng `orders` hoặc `order_items`.
- Không cho khách tự sửa `payment_status`, `order_status`, `total_vnd`, `shipping_fee_vnd`.
- Tạo đơn qua RPC đã kiểm tra dữ liệu, giá, số lượng và tồn kho.
- Dùng mã đơn ngẫu nhiên, token tra cứu ngẫu nhiên; chỉ lưu hash token.
- Không để endpoint tra cứu trả toàn bộ thông tin cá nhân.
- Cân nhắc CAPTCHA/chống spam và giới hạn tần suất qua dịch vụ phù hợp.

## 4. XSS và đầu vào
- Render text người dùng bằng `textContent`, không nối chuỗi vào `innerHTML`.
- Validate server/database-side mọi đầu vào.
- Kiểm tra URL ảnh chỉ cho phép giao thức phù hợp như HTTPS.
- Không dùng `eval` hoặc thực thi nội dung từ CSV.
- Dùng Content Security Policy (CSP) phù hợp với nguồn CDN/Supabase/YouTube thực tế; thử nghiệm trước khi bật chặt.
- Không ghi số điện thoại, địa chỉ, token hoặc session vào log công khai.

## 5. Dữ liệu cá nhân
- Chỉ thu thập dữ liệu cần để giao hàng.
- Công bố mục đích sử dụng, thời hạn lưu trữ và kênh yêu cầu chỉnh sửa/xóa dữ liệu.
- Không xuất dữ liệu đơn hàng ra file công khai.
- Dùng HTTPS; hạn chế quyền truy cập dashboard Supabase.
- Sao lưu và kiểm tra khả năng khôi phục.

## 6. Xóa và sửa đơn
- Ưu tiên trạng thái `cancelled` để giữ lịch sử và đối soát.
- Nếu cần xóa dữ liệu cá nhân, thiết kế quy trình riêng để giữ phần dữ liệu kế toán cần thiết theo quy định áp dụng.
- Ghi lại người thực hiện, thời gian và lý do thay đổi trạng thái trong bảng lịch sử nếu cần audit.

## 7. Thanh toán
- QR chỉ là phương tiện hướng dẫn chuyển khoản; việc hiển thị QR không xác nhận tiền đã vào tài khoản.
- Admin xác nhận thủ công trong MVP.
- Tự động hóa chỉ sau khi tích hợp webhook server-side được xác minh.
- Không cho phép tham số URL như `?success=true` tự thay đổi trạng thái thanh toán.
