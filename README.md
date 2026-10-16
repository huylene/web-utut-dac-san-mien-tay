# Út Út — Bộ tài liệu Vibe Coding

Bộ tài liệu định hướng xây dựng website giới thiệu và đặt mua đặc sản miền Tây cho **Út Út (utut.vn)** bằng HTML, CSS và JavaScript thuần, dùng Supabase cho dữ liệu, nhúng video YouTube và có giao diện quản trị.

## Đọc theo thứ tự
1. `01-PRODUCT-REQUIREMENTS.md` — yêu cầu sản phẩm và phạm vi.
2. `02-ARCHITECTURE.md` — kiến trúc, giới hạn frontend-only và các quyết định kỹ thuật.
3. `03-UI-UX-DESIGN-SYSTEM.md` — giao diện, màu sắc, responsive và accessibility.
4. `04-DATABASE-SUPABASE.md` — mô hình dữ liệu, SQL khởi tạo, RLS và CSV.
5. `05-FEATURE-SPECS.md` — đặc tả giỏ hàng, đặt hàng, QR, tra cứu, đánh giá.
6. `06-ADMIN-AND-SECURITY.md` — xác thực admin, quyền truy cập và bảo mật.
7. `07-IMPLEMENTATION-PLAN.md` — chia task để làm với Antigravity/Vibe Coding.
8. `08-ACCEPTANCE-TESTS.md` — checklist nghiệm thu.
9. `09-ENVIRONMENT-AND-DEPLOYMENT.md` — cấu hình và triển khai.
10. `10-ANTIGRAVITY-PROMPTS.md` — prompt mẫu để giao việc cho AI.
11. `data/products.example.csv` — dữ liệu sản phẩm mẫu để nhập thử.
12. `data/reviews.example.csv` — dữ liệu đánh giá mẫu.

## Quyết định quan trọng — cần đọc trước khi code

- **Supabase Database là PostgreSQL, không phải SQLite.** Không thể chạy SQLite “trên Supabase Database” theo cách thông thường. Bộ tài liệu dùng PostgreSQL của Supabase làm database chính.
- **CSV là định dạng nhập/xuất dữ liệu**, không nên là database trực tiếp cho website nhiều người dùng. Trình duyệt không thể ghi an toàn vào một file CSV trên hosting tĩnh và đồng bộ cho mọi khách hàng. CSV mẫu được dùng để nhập sản phẩm, sao lưu hoặc xuất báo cáo.
- **Frontend-only không thể tự xác minh thanh toán ngân hàng/QR một cách đáng tin cậy.** Bản đầu có thể tạo đơn ở trạng thái `pending_payment`, hiển thị QR chuyển khoản và chỉ chuyển sang `paid` khi admin xác nhận trong trang quản trị. Muốn tự động xác nhận thanh toán cần cổng thanh toán có webhook và một thành phần server-side tin cậy (ví dụ Supabase Edge Function hoặc backend riêng).
- **Không đặt `service_role` key, mật khẩu quản trị hoặc bí mật thanh toán trong JavaScript phía trình duyệt.** Chỉ dùng Supabase publishable/anon key cùng Row Level Security (RLS).
- Giao diện admin có thể là đường dẫn ít hiển thị, nhưng **URL ẩn không phải biện pháp bảo mật**. Cần Supabase Auth và chính sách RLS.

## Phạm vi MVP đề xuất
Website tĩnh HTML/CSS/JS, Supabase Auth + PostgreSQL, danh sách sản phẩm, chi tiết sản phẩm, giỏ hàng, tạo đơn, QR chuyển khoản, tra cứu đơn bằng mã đơn + thông tin xác minh, đánh giá có kiểm duyệt, trang admin quản lý đơn/sản phẩm/đánh giá, YouTube embed và liên kết Google Maps.

## Trước khi đưa vào sử dụng thật
Thay dữ liệu ví dụ bằng thông tin thật đã được thương hiệu duyệt; cấu hình RLS; thử toàn bộ luồng đặt hàng; xác nhận phương thức thanh toán và chính sách giao hàng/đổi trả; không tuyên bố thanh toán thành công chỉ dựa vào việc khách bấm nút.
