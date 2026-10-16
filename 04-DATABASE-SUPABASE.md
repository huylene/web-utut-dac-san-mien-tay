# 04 — Database, Supabase và CSV

## 1. Nguồn dữ liệu
Nguồn dữ liệu chính là **Supabase PostgreSQL**. CSV là định dạng import/export. Không gọi PostgreSQL là SQLite và không coi CSV là database đồng thời cho website.

## 2. Bảng đề xuất
- `categories`: danh mục.
- `products`: sản phẩm.
- `orders`: đơn hàng.
- `order_items`: snapshot từng mặt hàng của đơn.
- `reviews`: đánh giá.
- `profiles`: thông tin vai trò quản trị gắn với Supabase Auth, nếu cần.

## 3. SQL khởi tạo tham khảo
Chạy trong Supabase SQL Editor ở môi trường thử nghiệm trước. Rà soát chính sách RLS trước khi đưa lên production.

```sql
create extension if not exists pgcrypto;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text unique not null,
  short_description text,
  description text,
  image_url text,
  price_vnd bigint not null check (price_vnd >= 0),
  compare_at_price_vnd bigint check (compare_at_price_vnd is null or compare_at_price_vnd >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  is_featured boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  lookup_token_hash text,
  customer_name text not null,
  phone text not null,
  email text,
  shipping_address text not null,
  customer_note text,
  subtotal_vnd bigint not null check (subtotal_vnd >= 0),
  shipping_fee_vnd bigint not null default 0 check (shipping_fee_vnd >= 0),
  total_vnd bigint not null check (total_vnd >= 0),
  order_status text not null default 'pending_payment'
    check (order_status in (
      'pending_payment','pending_confirmation','confirmed',
      'preparing','shipping','completed','cancelled','payment_failed'
    )),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid','pending_verification','paid','failed','refunded')),
  payment_method text not null default 'bank_transfer_qr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  unit_price_vnd bigint not null check (unit_price_vnd >= 0),
  quantity integer not null check (quantity > 0),
  line_total_vnd bigint not null check (line_total_vnd >= 0)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  display_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create index products_active_idx on public.products(is_active, is_featured);
create index orders_created_at_idx on public.orders(created_at desc);
create index orders_status_idx on public.orders(order_status, payment_status);
create index order_items_order_id_idx on public.order_items(order_id);
create index reviews_product_status_idx on public.reviews(product_id, moderation_status);
```

## 4. Các lưu ý về SQL
- `order_code` cần được tạo bằng hàm/database procedure an toàn; không dùng ID tăng dần dễ đoán làm mã tra cứu.
- Tạo đơn nên qua RPC/database function có kiểm tra sản phẩm, giá hiện tại, số lượng, tổng tiền và giới hạn đầu vào. Không tin `total_vnd` do trình duyệt gửi.
- Nếu dùng `lookup_token_hash`, token ngẫu nhiên phải được tạo an toàn và chỉ trả token thô cho khách đúng lúc tạo đơn; lưu hash trong database. Đừng dùng số điện thoại đơn thuần làm bí mật.
- Nên có trigger cập nhật `updated_at`.
- Cân nhắc soft-delete sản phẩm để giữ lịch sử đơn hàng.
- Không bật quyền `insert/update/delete` rộng cho `anon` trên các bảng quản trị.

## 5. RLS — định hướng chính sách
Bật RLS cho mọi bảng chứa dữ liệu riêng tư:

```sql
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.profiles enable row level security;
```

Chính sách cần thiết (viết và kiểm thử riêng trước khi production):
- `categories`, `products`: anon chỉ `SELECT` bản ghi đang hoạt động.
- `reviews`: anon chỉ đọc đánh giá `approved`; tạo review phải giới hạn trường và chống spam.
- `orders`, `order_items`: anon không được đọc toàn bộ bảng.
- Admin: chỉ user đăng nhập có role admin mới được thao tác quản trị; tránh policy tự tham chiếu đệ quy bảng `profiles`. Có thể dùng function `SECURITY DEFINER` được rà soát kỹ để kiểm tra role.
- Tạo đơn công khai: ưu tiên RPC có `EXECUTE` được cấp đúng đối tượng, validate mọi trường và không cho khách tự đặt trạng thái/giá. Kiểm thử chống lạm dụng và spam.
- Không copy nguyên policy từ một ví dụ chưa được hiểu rõ; chạy thử với anon, customer và admin.

## 6. CSV
Các file mẫu nằm trong `data/`.
- Import sản phẩm: Supabase Dashboard → Table Editor → chọn bảng phù hợp → Import data from CSV.
- CSV cần khớp tên cột và kiểu dữ liệu. Không import cột `id` nếu muốn database tự tạo UUID.
- Không đưa thông tin khách hàng, số điện thoại, địa chỉ, token tra cứu hoặc dữ liệu thanh toán vào CSV mẫu công khai.
- Xuất CSV đơn hàng chỉ cho admin, lưu trữ ở nơi có kiểm soát quyền và xóa khi hết thời hạn lưu trữ theo chính sách.

## 7. SQLite nếu là yêu cầu bắt buộc
Supabase Database không phải SQLite. Nếu thật sự cần SQLite, chọn một trong các hướng:
1. SQLite cục bộ cho ứng dụng một người dùng — không phù hợp cho web shop nhiều khách.
2. Một backend/service riêng có thể đọc/ghi SQLite.
3. Đổi yêu cầu sang PostgreSQL trên Supabase — lựa chọn khuyến nghị cho dự án này.
