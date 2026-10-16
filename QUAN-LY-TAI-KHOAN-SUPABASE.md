# HƯỚNG DẪN QUẢN LÝ TÀI KHOẢN & DATABASE SUPABASE — ÚT ÚT (utut.vn)

Tài liệu này cung cấp toàn bộ thông số kết nối, hướng dẫn quản lý tài khoản quản trị viên và quy trình đồng bộ cơ sở dữ liệu Supabase PostgreSQL cho dự án **Út Út — Đặc sản miền Tây**.

---

## 1. THÔNG TIN DỰ ÁN SUPABASE ĐÃ KẾT NỐI

| Thông Số | Giá Trị Cấu Hình | Ghi Chú |
| :--- | :--- | :--- |
| **Tên dự án** | `ututvn_dacsanmientay` | Đã kết nối |
| **Project Ref** | `jgdigejbpadlbqocueiz` | Mã định danh dự án trên Supabase |
| **Project URL** | `https://jgdigejbpadlbqocueiz.supabase.co` | Endpoint REST & Auth API |
| **Publishable / Anon Key** | `sb_publishable_Il8CbcnRuYDbxbzrfj-CCg_SZd8yCTh` | Dùng an toàn phía Client & Admin |
| **Database Password** | `ihvEmCXR!4+3s$U` | Mật khẩu tài khoản `postgres` |
| **Database Host** | `db.jgdigejbpadlbqocueiz.supabase.co` | Cổng `5432` |
| **Database User / Name**| `postgres` / `postgres` | PostgreSQL 15 |
| **Direct Connection URI** | `postgresql://postgres:ihvEmCXR!4+3s$U@db.jgdigejbpadlbqocueiz.supabase.co:5432/postgres` | Dùng cho DBeaver, TablePlus, pgAdmin |

---

## 2. QUẢN LÝ TRỰC TIẾP TỪ GIAO DIỆN ADMIN WEBSITE

Hệ thống đã tích hợp sẵn trang quản trị Supabase trực quan tại:
👉 **`http://localhost:3001/admin/supabase.html`**

Tại trang này, quản trị viên có thể:
1. **Kiểm tra trạng thái kết nối (Ping Test):** Kiểm tra trực tiếp tốc độ phản hồi của Supabase REST API & Auth API.
2. **Tạo tài khoản Quản trị viên mới:** Nhập Email & Mật khẩu để tự động đăng ký trên Supabase Auth và cấp quyền `role: 'admin'` trong bảng `public.profiles`.
3. **Xem danh sách Quản trị viên:** Xem toàn bộ các tài khoản đang có quyền quản trị hệ thống.
4. **Đồng bộ 12 đặc sản mẫu:** Bấm 1 nút để tự động nạp 4 danh mục và 12 sản phẩm đặc sản sông nước miền Tây vào cơ sở dữ liệu Supabase.
5. **Sao chép mã SQL Schema:** Copy toàn bộ file `schema.sql` để dán vào Supabase SQL Editor khi cần thiết lập mới.

---

## 3. HƯỚNG DẪN KHỞI TẠO DATABASE (SUPABASE SQL EDITOR)

Nếu đây là dự án Supabase mới tạo và chưa chạy bảng, bạn thực hiện 3 bước đơn giản:

1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard/project/jgdigejbpadlbqocueiz).
2. Vào mục **SQL Editor** ở thanh menu bên trái → Bấm **New query**.
3. Mở file [supabase/schema.sql](file:///Users/macbookprom1/Documents/web-utut-mien-tay/supabase/schema.sql) trong project, sao chép toàn bộ nội dung và dán vào ô SQL Editor, sau đó bấm nút **Run** (Ctrl + Enter).

> **Kết quả:** Hệ thống sẽ tự động tạo đầy đủ các bảng:
> - `categories`: Danh mục đặc sản.
> - `products`: Sản phẩm, giá bán, tồn kho, ảnh đại diện.
> - `orders`: Đơn hàng, địa chỉ, phương thức thanh toán.
> - `order_items`: Chi tiết từng món ăn trong đơn hàng.
> - `reviews`: Đánh giá của khách hàng.
> - `profiles`: Phân quyền quản trị viên (`role = 'admin'`).
> - Các hàm RPC tính giá an toàn: `create_web_order`, `lookup_web_order`, `request_payment_verification`.

---

## 4. HƯỚNG DẪN TẠO VÀ PHÂN QUYỀN TÀI KHOẢN ADMIN

### Cách 1: Tạo từ trang Admin Website (Khuyên dùng)
1. Đăng nhập vào Admin: `http://localhost:3001/admin/login.html` (Nếu chưa có tài khoản, đăng nhập bằng Demo: `admin@utut.vn` / `admin123`).
2. Vào mục **⚡ Quản lý Supabase & Tài khoản** (`admin/supabase.html`).
3. Điền email (ví dụ: `admin@utut.vn` hoặc email của bạn) và mật khẩu muốn đặt, bấm **"Tạo Tài Khoản Admin"**.
4. Hệ thống sẽ tạo tài khoản trên Supabase Auth và tự động gán quyền `admin`.

### Cách 2: Tạo từ Supabase Dashboard
1. Vào **Authentication** → **Users** → Bấm **Add user** → Chọn **Create user**.
2. Nhập email và mật khẩu cho quản trị viên, chọn **Auto Confirm User** (để không cần chờ xác nhận email) → Bấm **Create user**.
3. Sao chép `User UID` vừa tạo (dạng UUID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
4. Vào **SQL Editor**, chạy lệnh sau để cấp quyền Admin:
   ```sql
   insert into public.profiles (user_id, role)
   values ('<USER_UID_CUA_BAN>', 'admin')
   on conflict (user_id) do update set role = 'admin';
   ```

---

## 5. QUẢN LÝ BẰNG SCRIPT TERMINAL (NODE.JS)

Dự án cung cấp script quản trị tự động trong thư mục `scripts/`:

```bash
# 1. Kiểm tra kết nối Supabase và trạng thái các bảng
node scripts/manage-supabase.js status

# 2. Tạo tài khoản Admin mới trên Supabase
node scripts/manage-supabase.js create-admin admin@utut.vn "MatKhauBaoMat123!"

# 3. Nạp 12 sản phẩm đặc sản mẫu vào Supabase
node scripts/manage-supabase.js seed
```

---

## 6. QUY TẮC BẢO MẬT BẮT BUỘC (SECURITY BEST PRACTICES)
- **Publishable Key (`sb_publishable_...`)**: Được phép sử dụng trong mã JavaScript chạy trên trình duyệt người dùng. Quyền truy cập được kiểm soát tuyệt đối bởi **RLS (Row Level Security)** trong PostgreSQL.
- **Database Password (`ihvEmCXR!4+3s$U`)**: Tuyệt đối không đưa vào file JavaScript phía client (`assets/js/`). Chỉ lưu trong file `.env` cục bộ cho các tác vụ quản trị database hoặc backend.
- Khi bàn giao môi trường sản xuất, bạn có thể tắt tài khoản Demo cục bộ trong `supabase-client.js` để yêu cầu 100% đăng nhập qua Supabase Auth.
