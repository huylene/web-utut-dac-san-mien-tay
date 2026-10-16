# 07 — Kế hoạch triển khai theo giai đoạn

## Giai đoạn 0 — Chuẩn bị
- [ ] Xác nhận logo, ảnh sản phẩm thật, giá, danh mục và thông tin liên hệ.
- [ ] Xác nhận chính sách giao hàng, đổi trả, bảo mật.
- [ ] Chốt dùng Supabase PostgreSQL; CSV là import/export.
- [ ] Chốt MVP QR chuyển khoản xác nhận thủ công.
- [ ] Tạo project Supabase riêng cho development.

## Giai đoạn 1 — Nền tảng
- [ ] Tạo cấu trúc thư mục và các trang HTML.
- [ ] Tạo design tokens, reset CSS, layout responsive.
- [ ] Tạo Supabase client từ cấu hình public.
- [ ] Tạo schema và indexes.
- [ ] Bật RLS, viết và kiểm thử policies.
- [ ] Import CSV sản phẩm mẫu.

**Hoàn thành khi:** trang chủ tải được danh mục/sản phẩm; dữ liệu chưa có vẫn hiển thị empty state đẹp; không lộ dữ liệu đơn.

## Giai đoạn 2 — Trang giới thiệu và sản phẩm
- [ ] Header/footer và điều hướng.
- [ ] Trang chủ và sản phẩm nổi bật.
- [ ] Danh sách sản phẩm, tìm kiếm/lọc.
- [ ] Chi tiết sản phẩm.
- [ ] YouTube embed responsive.
- [ ] Google Maps bằng địa chỉ đã xác minh.
- [ ] SEO metadata cơ bản.

**Hoàn thành khi:** dùng được trên mobile, keyboard, và các trạng thái loading/error/empty.

## Giai đoạn 3 — Giỏ hàng và checkout
- [ ] Cart bằng localStorage.
- [ ] Đồng bộ sản phẩm/giá hiện tại khi mở giỏ.
- [ ] Form checkout và validate.
- [ ] RPC tạo đơn tính giá từ database.
- [ ] Snapshot mặt hàng vào `order_items`.
- [ ] Mã đơn và token tra cứu an toàn.
- [ ] Chống tạo đơn trùng khi người dùng bấm nhiều lần.

**Hoàn thành khi:** tổng tiền trong đơn do database tính, không tin tổng từ client.

## Giai đoạn 4 — QR và tra cứu đơn
- [ ] Trang QR chuyển khoản.
- [ ] Nội dung chuyển khoản chứa mã đơn.
- [ ] Trạng thái chờ thanh toán hiển thị rõ.
- [ ] Nút báo đã chuyển khoản chỉ tạo yêu cầu xác minh.
- [ ] Trang tra cứu chỉ trả dữ liệu của đơn tương ứng.
- [ ] Kiểm thử token sai, mã sai, nhiều lần thử.

**Hoàn thành khi:** không có cách nào đánh dấu thanh toán thành công bằng cách sửa URL hoặc localStorage.

## Giai đoạn 5 — Admin
- [ ] Supabase Auth login/logout.
- [ ] Quyền admin được xác thực ở database.
- [ ] Danh sách và chi tiết đơn.
- [ ] Cập nhật trạng thái hợp lệ.
- [ ] Hủy đơn thay vì xóa cứng theo mặc định.
- [ ] CRUD sản phẩm.
- [ ] Duyệt/ẩn đánh giá.
- [ ] Phân trang và thông báo lỗi.

**Hoàn thành khi:** tài khoản anon/customer không thể truy cập thao tác admin qua API trực tiếp.

## Giai đoạn 6 — QA và triển khai
- [ ] Chạy toàn bộ checklist trong `08-ACCEPTANCE-TESTS.md`.
- [ ] Kiểm tra RLS bằng nhiều vai trò.
- [ ] Tối ưu ảnh, tốc độ và SEO.
- [ ] Kiểm tra Safari/Chrome và mobile.
- [ ] Cấu hình domain/HTTPS.
- [ ] Kiểm tra backup, chính sách quyền riêng tư và thông tin liên hệ.
- [ ] Xóa dữ liệu demo và thay toàn bộ cấu hình giả.

## Quy tắc làm việc với Antigravity
- Chia nhỏ task; không yêu cầu tạo cả website trong một prompt duy nhất.
- Mỗi task phải nêu file được phép sửa, tiêu chí nghiệm thu và các ràng buộc bảo mật.
- Yêu cầu AI giải thích thay đổi và nêu cách test.
- Sau mỗi giai đoạn, chạy test và review diff trước khi tiếp tục.
