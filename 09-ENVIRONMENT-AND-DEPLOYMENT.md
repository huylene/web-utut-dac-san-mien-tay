# 09 — Cấu hình môi trường và triển khai

## 1. Cấu hình frontend
Tạo `assets/js/config.js` từ mẫu, nhưng chỉ chứa giá trị public:

```js
export const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";
```

- Có thể commit `config.example.js` với placeholder.
- `config.js` chỉ chứa URL project và publishable/anon key.
- Không đưa service-role key, database password, access token riêng tư hoặc webhook secret vào frontend.
- Nếu dùng Git, thêm file chứa cấu hình local vào `.gitignore` khi cần; nhớ rằng giá trị public vẫn có thể được nhìn thấy trong trình duyệt.

## 2. Chạy local
Website tĩnh nên chạy qua local web server thay vì mở file trực tiếp, vì ES modules và một số API không hoạt động đúng với `file://`.
Ví dụ có thể dùng tiện ích static server sẵn có trong môi trường phát triển. Không cần server ứng dụng riêng cho frontend.

## 3. Supabase
- Tạo project development và production riêng nếu có thể.
- Chạy schema SQL và policies theo thứ tự.
- Kiểm tra RLS với anon, customer và admin.
- Import CSV sản phẩm.
- Tạo tài khoản admin theo quy trình an toàn.
- Lưu thông tin ngân hàng nhận tiền đúng và kiểm thử QR với số tiền nhỏ trước khi công bố.

## 4. Static hosting
Có thể triển khai lên static hosting hỗ trợ domain và HTTPS. Cấu hình:
- HTTPS bắt buộc.
- Trang lỗi 404 phù hợp.
- Cache asset tĩnh; tránh cache HTML chứa dữ liệu nhạy cảm.
- Thiết lập CSP sau khi xác định các nguồn cần thiết.
- Cấu hình domain `utut.vn` theo hướng dẫn nhà cung cấp DNS/hosting.

## 5. Kiểm tra trước production
- Xóa dữ liệu demo.
- Thay logo, ảnh, giá, mô tả và địa chỉ cửa hàng bằng dữ liệu đã xác minh.
- Thử luồng đặt hàng trên mobile.
- Thử tạo đơn trùng, dữ liệu không hợp lệ và truy cập trái phép.
- Kiểm tra thông tin QR/chuyển khoản.
- Sao lưu database và kiểm tra khôi phục.
- Đọc lại chính sách quyền riêng tư, giao hàng, đổi trả.

## 6. Giới hạn không thể giải quyết chỉ bằng hosting tĩnh
- Webhook thanh toán tự động.
- Giữ bí mật API key.
- Gửi email/SMS bí mật hoặc tác vụ nền.
- Chống spam/rate limit mạnh ở tầng server.
Nếu cần các chức năng này, bổ sung Supabase Edge Functions hoặc một dịch vụ server-side; vẫn có thể giữ frontend HTML/CSS/JS thuần.
