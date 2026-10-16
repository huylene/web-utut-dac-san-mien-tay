# 02 — Kiến trúc hệ thống

## 1. Nguyên tắc
- Frontend: HTML5, CSS3, JavaScript thuần (ES modules).
- Dữ liệu: Supabase PostgreSQL.
- Auth: Supabase Auth cho admin.
- File CSV: dữ liệu seed/import/export; không phải kho dữ liệu trực tiếp dùng chung.
- Hosting: dịch vụ static hosting có HTTPS.
- Không có custom backend server trong MVP.

## 2. Sơ đồ logic

```text
Khách hàng / Admin
        |
        v
HTML + CSS + JavaScript (trình duyệt)
        |
        | Supabase publishable/anon key + phiên đăng nhập
        v
Supabase API
        |
        v
PostgreSQL + Row Level Security (RLS)

CSV --(import/export thủ công)--> PostgreSQL
YouTube iframe -----------------> Trang giới thiệu
Google Maps link/embed ---------> Trang giới thiệu
```

## 3. Mâu thuẫn kỹ thuật cần thống nhất
Yêu cầu “CSV”, “SQLite quản lý dữ liệu trên Supabase” và “không backend” là ba ý không thể đồng thời triển khai đúng như mô tả:
- Supabase Database dùng PostgreSQL, không phải SQLite.
- CSV là định dạng tệp; không cung cấp transaction, truy cập đồng thời và phân quyền phù hợp cho website đặt hàng.
- SQLite thường là file database cục bộ hoặc cần dịch vụ/ứng dụng quản lý file; không phải database native của Supabase.
- Website tĩnh vẫn có thể gọi Supabase trực tiếp qua API, nhưng quyền truy cập phải được kiểm soát bằng RLS.

**Quyết định cho dự án:** Supabase PostgreSQL là nguồn dữ liệu chính; CSV dùng import/export. Nếu bắt buộc SQLite, cần đổi nền tảng hoặc thêm một dịch vụ server-side có thể truy cập SQLite. Không giả định có SQLite bên trong Supabase.

## 4. Luồng tạo đơn
1. Frontend tải sản phẩm đang hoạt động từ Supabase.
2. Giỏ hàng lưu tạm trong `localStorage`; không lưu thông tin thanh toán nhạy cảm.
3. Checkout kiểm tra dữ liệu đầu vào.
4. Frontend gửi yêu cầu tạo đơn qua RPC/REST có RLS phù hợp; tổng tiền phải được tính lại từ giá trong database, không tin tổng tiền do trình duyệt gửi.
5. Database tạo mã đơn và snapshot tên/giá/số lượng từng mặt hàng.
6. Website hiển thị QR chuyển khoản cùng nội dung chuyển khoản có mã đơn.
7. MVP: admin đối soát tiền nhận được rồi cập nhật trạng thái thanh toán.
8. Nếu dùng webhook tự động: webhook phải được xác minh server-side; không thể bảo vệ bí mật webhook trong frontend.

## 5. Các ranh giới tin cậy
- Frontend không đáng tin cậy: mọi dữ liệu có thể bị sửa bởi người dùng.
- Không cho khách tự cập nhật giá, trạng thái thanh toán, trạng thái giao hàng hoặc quyền admin.
- Không cho khách đọc toàn bộ bảng đơn hàng.
- Tra cứu đơn cần mã đơn ngẫu nhiên đủ khó đoán kết hợp thông tin xác minh; không chỉ dựa vào ID tăng dần hoặc số điện thoại.
- RLS là bắt buộc; kiểm thử chính sách bằng tài khoản anon và admin.

## 6. Cấu trúc thư mục gợi ý

```text
utut-website/
├── index.html
├── about.html
├── products.html
├── product.html
├── cart.html
├── checkout.html
├── payment.html
├── track-order.html
├── admin/
│   ├── index.html
│   ├── login.html
│   ├── orders.html
│   ├── products.html
│   └── reviews.html
├── assets/
│   ├── css/
│   │   ├── tokens.css
│   │   ├── global.css
│   │   ├── components.css
│   │   └── pages.css
│   ├── js/
│   │   ├── config.example.js
│   │   ├── supabase-client.js
│   │   ├── products.js
│   │   ├── cart.js
│   │   ├── checkout.js
│   │   ├── order-tracking.js
│   │   └── admin/
│   └── images/
├── data/
│   └── *.csv
└── README.md
```

## 7. JavaScript client
Dùng Supabase JS v2 qua CDN hoặc bundler nếu dự án cần. Với website tĩnh đơn giản, có thể dùng CDN module; pin phiên bản ổn định và kiểm tra tài liệu hiện hành trước khi triển khai. Chỉ dùng publishable/anon key ở frontend.
