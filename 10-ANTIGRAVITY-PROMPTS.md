# 10 — Prompt mẫu cho Antigravity / Vibe Coding

## Prompt 1 — Đọc tài liệu và lập kế hoạch
Bạn là senior frontend engineer kiêm reviewer bảo mật. Hãy đọc toàn bộ file Markdown trong thư mục dự án, tóm tắt yêu cầu, xác định mâu thuẫn và đề xuất kế hoạch theo `07-IMPLEMENTATION-PLAN.md`. Chưa viết code cho đến khi chỉ ra các rủi ro. Ràng buộc: HTML, CSS, JavaScript thuần; Supabase PostgreSQL; CSV chỉ import/export; không có backend tùy biến trong MVP. Không được tuyên bố SQLite chạy trên Supabase Database.

## Prompt 2 — Tạo bộ khung giao diện
Hãy tạo cấu trúc thư mục và các trang HTML theo `02-ARCHITECTURE.md`. Dùng HTML semantic, CSS responsive và JavaScript ES modules. Áp dụng màu `#D35400`, `#27AE60`, nền `#FAF8F5`, font Inter/system-ui. Không dùng framework frontend. Chỉ dùng nội dung placeholder được ghi rõ; không bịa thông tin liên hệ hoặc chứng nhận sản phẩm. Tạo loading, empty và error states. Sau khi hoàn thành, liệt kê file đã tạo và cách kiểm thử.

## Prompt 3 — Trang chủ và sản phẩm
Triển khai trang chủ, danh sách sản phẩm và chi tiết sản phẩm. Đọc sản phẩm từ Supabase qua client public, chỉ hiển thị sản phẩm active. Dùng ảnh thật được cung cấp; nếu chưa có ảnh thì dùng placeholder được gắn nhãn, không giả làm ảnh thật. Bảo đảm responsive và accessibility. Không dùng `innerHTML` với dữ liệu từ database. Không thêm quyền ghi dữ liệu quản trị vào client.

## Prompt 4 — Giỏ hàng và checkout
Triển khai giỏ hàng bằng localStorage và form checkout. localStorage chỉ lưu product IDs và quantity. Giá hiển thị chỉ là ước tính; tạo đơn phải gọi RPC an toàn tính lại giá và tồn kho từ database. Không cho client gửi `payment_status`, `order_status` hoặc tổng tiền có thẩm quyền. Chống bấm gửi nhiều lần và xử lý lỗi thân thiện. Nếu RPC/schema chưa có, hãy dừng và mô tả yêu cầu database thay vì tạo giải pháp không an toàn.

## Prompt 5 — QR chuyển khoản
Triển khai trang hướng dẫn chuyển khoản QR cho đơn hàng ở trạng thái chưa thanh toán. Hiển thị mã đơn, số tiền và nội dung chuyển khoản. Nút “Tôi đã chuyển khoản” chỉ gửi yêu cầu xác minh. Không tự đánh dấu thanh toán thành công dựa vào query string, ảnh QR, localStorage hoặc thao tác người dùng. MVP xác nhận thủ công bởi admin.

## Prompt 6 — Admin
Triển khai login/logout bằng Supabase Auth và các trang quản trị đơn, sản phẩm, đánh giá. Mọi quyền phải được bảo vệ bằng RLS ở database; ẩn nút ở frontend không phải bảo mật. Customer/anon không được đọc đơn hàng hoặc cập nhật trạng thái. Mặc định hủy đơn thay vì xóa cứng. Nếu policy chưa tồn tại hoặc không thể xác minh, không giả định rằng quyền truy cập đã an toàn.

## Prompt 7 — Kiểm thử bảo mật
Rà soát toàn bộ dự án: tìm secret trong frontend, XSS qua dữ liệu người dùng, RLS thiếu, quyền ghi của anon, khả năng đọc đơn của người khác, sửa tổng tiền, tự đánh dấu paid, tạo đơn trùng và dữ liệu cá nhân trong log. Không chỉ sửa code; ghi lại từng phát hiện, mức độ, file/vị trí và cách kiểm thử. Không tuyên bố bảo mật hoàn toàn nếu chưa kiểm thử.

## Prompt 8 — Review trước khi hoàn tất
So sánh code với `08-ACCEPTANCE-TESTS.md`. Chạy các kiểm tra có sẵn trong môi trường, ghi rõ test nào đã chạy, test nào chưa chạy và lý do. Không tự bịa kết quả test. Đề xuất các bước còn lại trước khi đưa website lên `utut.vn`.

## Quy tắc cho mọi prompt
- Thực hiện một giai đoạn mỗi lần.
- Không xóa file hoặc đổi kiến trúc ngoài phạm vi khi chưa giải thích.
- Ưu tiên sửa tối thiểu và giữ code dễ hiểu cho người mới học.
- Sau mỗi thay đổi, giải thích ngắn gọn: mục đích, file sửa, cách test, rủi ro còn lại.
