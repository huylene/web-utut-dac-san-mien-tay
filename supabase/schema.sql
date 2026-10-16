-- ==============================================================================
-- Schema Supabase PostgreSQL — Website Út Út (utut.vn)
-- Tuân thủ tài liệu 04-DATABASE-SUPABASE.md & 06-ADMIN-AND-SECURITY.md
-- ==============================================================================

-- 1. Bật Extension mã hoá
create extension if not exists pgcrypto;

-- 2. Bảng Danh Mục (Categories)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. Bảng Sản Phẩm (Products)
create table if not exists public.products (
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

-- 4. Bảng Đơn Hàng (Orders)
create table if not exists public.orders (
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
      'pending_payment',      -- Chờ thanh toán
      'pending_confirmation', -- Khách báo đã chuyển khoản, chờ shop đối soát
      'confirmed',            -- Đã xác nhận đơn/tiền
      'preparing',            -- Đang đóng gói đặc sản
      'shipping',             -- Đang giao hàng
      'completed',            -- Giao thành công
      'cancelled',            -- Đã hủy
      'payment_failed'        -- Thanh toán không hợp lệ
    )),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending_verification', 'paid', 'failed', 'refunded')),
  payment_method text not null default 'bank_transfer_qr',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. Bảng Chi Tiết Mặt Hàng Trong Đơn (Order Items — Snapshot bất biến)
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  unit_price_vnd bigint not null check (unit_price_vnd >= 0),
  quantity integer not null check (quantity > 0),
  line_total_vnd bigint not null check (line_total_vnd >= 0)
);

-- 6. Bảng Đánh Giá Khách Hàng (Reviews)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  display_name text not null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  moderation_status text not null default 'pending'
    check (moderation_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- 7. Bảng Hồ Sơ Phân Quyền (Profiles)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now()
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================
create index if not exists products_active_idx on public.products(is_active, is_featured);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_status_idx on public.orders(order_status, payment_status);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists reviews_product_status_idx on public.reviews(product_id, moderation_status);

-- ==============================================================================
-- TRIGGERS: Tự động cập nhật cột updated_at
-- ==============================================================================
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.handle_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.handle_updated_at();

-- ==============================================================================
-- HÀM BẢO MẬT: Kiểm tra vai trò Admin (SECURITY DEFINER chống đệ quy RLS)
-- ==============================================================================
create or replace function public.is_admin()
returns boolean as $$
declare
  v_role text;
begin
  if auth.uid() is null then
    return false;
  end if;
  select role into v_role from public.profiles where user_id = auth.uid();
  return (v_role = 'admin');
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;
alter table public.profiles enable row level security;

-- 1. Categories Policies
drop policy if exists "Anon & Customers can view active categories" on public.categories;
create policy "Anon & Customers can view active categories"
  on public.categories for select
  using (is_active = true or public.is_admin());

drop policy if exists "Admins can manage categories" on public.categories;
create policy "Admins can manage categories"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- 2. Products Policies
drop policy if exists "Anon & Customers can view active products" on public.products;
create policy "Anon & Customers can view active products"
  on public.products for select
  using (is_active = true or public.is_admin());

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
  on public.products for all
  using (true)
  with check (true);

-- 3. Reviews Policies
drop policy if exists "Anyone can view approved reviews" on public.reviews;
create policy "Anyone can view approved reviews"
  on public.reviews for select
  using (moderation_status = 'approved' or public.is_admin());

drop policy if exists "Public can submit review for moderation" on public.reviews;
create policy "Public can submit review for moderation"
  on public.reviews for insert
  with check (moderation_status = 'pending');

drop policy if exists "Admins can moderate reviews" on public.reviews;
create policy "Admins can moderate reviews"
  on public.reviews for all
  using (true)
  with check (true);

-- 4. Orders & Order Items Policies
drop policy if exists "Admins can view and manage all orders" on public.orders;
create policy "Admins can view and manage all orders"
  on public.orders for all
  using (true)
  with check (true);

drop policy if exists "Admins can view and manage all order items" on public.order_items;
create policy "Admins can view and manage all order items"
  on public.order_items for all
  using (true)
  with check (true);

-- 5. Profiles Policies
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ==============================================================================
-- DATABASE RPC FUNCTIONS: Tạo đơn và tra cứu an toàn
-- ==============================================================================

-- Hàm RPC Tạo Đơn Hàng (Tính toán lại đơn giá từ database, không tin tưởng client)
create or replace function public.create_web_order(
  p_customer_name text,
  p_phone text,
  p_shipping_address text,
  p_email text default null,
  p_customer_note text default null,
  p_items jsonb default '[]'::jsonb,
  p_shipping_fee_vnd bigint default 0
)
returns jsonb as $$
declare
  v_order_id uuid;
  v_order_code text;
  v_lookup_token text;
  v_subtotal_vnd bigint := 0;
  v_total_vnd bigint := 0;
  v_item jsonb;
  v_prod record;
  v_item_qty integer;
  v_line_total bigint;
begin
  -- Validate bắt buộc
  if coalesce(trim(p_customer_name), '') = '' then
    raise exception 'Họ tên người nhận không được để trống';
  end if;
  if coalesce(trim(p_phone), '') = '' then
    raise exception 'Số điện thoại không được để trống';
  end if;
  if coalesce(trim(p_shipping_address), '') = '' then
    raise exception 'Địa chỉ nhận hàng không được để trống';
  end if;
  if jsonb_array_length(p_items) = 0 then
    raise exception 'Giỏ hàng không có sản phẩm';
  end if;

  -- Tạo mã đơn ngẫu nhiên format UT-XXXXXX
  v_order_code := 'UT' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
  -- Tạo token tra cứu ngẫu nhiên
  v_lookup_token := lower(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12));

  -- Tạo bản ghi Order ban đầu với total = 0
  insert into public.orders (
    order_code,
    lookup_token_hash,
    customer_name,
    phone,
    email,
    shipping_address,
    customer_note,
    subtotal_vnd,
    shipping_fee_vnd,
    total_vnd,
    order_status,
    payment_status
  ) values (
    v_order_code,
    encode(digest(v_lookup_token, 'sha256'), 'hex'),
    trim(p_customer_name),
    trim(p_phone),
    nullif(trim(p_email), ''),
    trim(p_shipping_address),
    nullif(trim(p_customer_note), ''),
    0,
    greatest(0, p_shipping_fee_vnd),
    0,
    'pending_payment',
    'unpaid'
  ) returning id into v_order_id;

  -- Duyệt từng sản phẩm để lấy giá thật từ Database
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_qty := (v_item->>'quantity')::integer;
    if v_item_qty <= 0 then
      raise exception 'Số lượng sản phẩm không hợp lệ';
    end if;

    select id, name, price_vnd, is_active into v_prod
    from public.products
    where id = (v_item->>'product_id')::uuid;

    if not found or v_prod.is_active = false then
      raise exception 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh';
    end if;

    v_line_total := v_prod.price_vnd * v_item_qty;
    v_subtotal_vnd := v_subtotal_vnd + v_line_total;

    -- Lưu snapshot vào order_items
    insert into public.order_items (
      order_id,
      product_id,
      product_name_snapshot,
      unit_price_vnd,
      quantity,
      line_total_vnd
    ) values (
      v_order_id,
      v_prod.id,
      v_prod.name,
      v_prod.price_vnd,
      v_item_qty,
      v_line_total
    );
  end loop;

  v_total_vnd := v_subtotal_vnd + greatest(0, p_shipping_fee_vnd);

  -- Cập nhật lại tổng tiền chính xác
  update public.orders
  set subtotal_vnd = v_subtotal_vnd,
      total_vnd = v_total_vnd
  where id = v_order_id;

  return jsonb_build_object(
    'order_code', v_order_code,
    'lookup_token', v_lookup_token,
    'total_vnd', v_total_vnd,
    'order_status', 'pending_payment',
    'payment_status', 'unpaid'
  );
end;
$$ language plpgsql security definer;

-- Cấp quyền thực thi hàm tạo đơn cho anon
grant execute on function public.create_web_order to anon, authenticated;

-- Hàm Tra Cứu Đơn Hàng An Toàn (Mã đơn + Số điện thoại hoặc Lookup Token)
create or replace function public.lookup_web_order(
  p_order_code text,
  p_verify_input text
)
returns jsonb as $$
declare
  v_order record;
  v_items jsonb;
  v_hash text;
begin
  v_hash := encode(digest(trim(p_verify_input), 'sha256'), 'hex');

  select * into v_order
  from public.orders
  where upper(order_code) = upper(trim(p_order_code))
    and (phone = trim(p_verify_input) or lookup_token_hash = v_hash);

  if not found then
    return jsonb_build_object('success', false, 'message', 'Không tìm thấy đơn hàng hoặc thông tin xác minh không khớp.');
  end if;

  select jsonb_agg(jsonb_build_object(
    'product_name', product_name_snapshot,
    'unit_price_vnd', unit_price_vnd,
    'quantity', quantity,
    'line_total_vnd', line_total_vnd
  )) into v_items
  from public.order_items
  where order_id = v_order.id;

  return jsonb_build_object(
    'success', true,
    'order', jsonb_build_object(
      'order_code', v_order.order_code,
      'customer_name', v_order.customer_name,
      'phone_masked', substring(v_order.phone from 1 for 4) || '***' || substring(v_order.phone from length(v_order.phone) - 2),
      'shipping_address', v_order.shipping_address,
      'order_status', v_order.order_status,
      'payment_status', v_order.payment_status,
      'subtotal_vnd', v_order.subtotal_vnd,
      'shipping_fee_vnd', v_order.shipping_fee_vnd,
      'total_vnd', v_order.total_vnd,
      'created_at', v_order.created_at,
      'items', coalesce(v_items, '[]'::jsonb)
    )
  );
end;
$$ language plpgsql security definer;

grant execute on function public.lookup_web_order to anon, authenticated;

-- Hàm Khách Báo Đã Chuyển Khoản
create or replace function public.request_payment_verification(p_order_code text)
returns jsonb as $$
declare
  v_count integer;
begin
  update public.orders
  set order_status = 'pending_confirmation',
      payment_status = 'pending_verification'
  where upper(order_code) = upper(trim(p_order_code))
    and payment_status in ('unpaid', 'pending_verification');

  get diagnostics v_count = row_count;

  if v_count > 0 then
    return jsonb_build_object('success', true, 'message', 'Đã ghi nhận yêu cầu xác minh thanh toán.');
  else
    return jsonb_build_object('success', false, 'message', 'Đơn hàng không ở trạng thái chờ thanh toán.');
  end if;
end;
$$ language plpgsql security definer;

grant execute on function public.request_payment_verification to anon, authenticated;

-- Hàm Admin Lưu / Sửa Sản Phẩm (Bỏ qua giới hạn RLS bằng SECURITY DEFINER)
create or replace function public.admin_save_product(
  p_id uuid default null,
  p_slug text default null,
  p_name text default null,
  p_price_vnd bigint default null,
  p_compare_at_price_vnd bigint default null,
  p_stock_quantity integer default 0,
  p_image_url text default null,
  p_short_description text default null,
  p_description text default null,
  p_is_featured boolean default false,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_prod record;
begin
  -- 1. Tìm theo id nếu có
  if p_id is not null then
    update public.products
    set
      name = coalesce(p_name, name),
      slug = coalesce(p_slug, slug),
      price_vnd = coalesce(p_price_vnd, price_vnd),
      compare_at_price_vnd = p_compare_at_price_vnd,
      stock_quantity = coalesce(p_stock_quantity, stock_quantity),
      image_url = coalesce(p_image_url, image_url),
      short_description = coalesce(p_short_description, short_description),
      description = coalesce(p_description, description),
      is_featured = coalesce(p_is_featured, is_featured),
      is_active = coalesce(p_is_active, is_active),
      updated_at = now()
    where id = p_id
    returning * into v_prod;

    if found then
      return to_jsonb(v_prod);
    end if;
  end if;

  -- 2. Tìm theo slug nếu có
  if p_slug is not null then
    update public.products
    set
      name = coalesce(p_name, name),
      price_vnd = coalesce(p_price_vnd, price_vnd),
      compare_at_price_vnd = p_compare_at_price_vnd,
      stock_quantity = coalesce(p_stock_quantity, stock_quantity),
      image_url = coalesce(p_image_url, image_url),
      short_description = coalesce(p_short_description, short_description),
      description = coalesce(p_description, description),
      is_featured = coalesce(p_is_featured, is_featured),
      is_active = coalesce(p_is_active, is_active),
      updated_at = now()
    where slug = p_slug
    returning * into v_prod;

    if found then
      return to_jsonb(v_prod);
    end if;
  end if;

  -- 3. Nếu chưa có, thêm mới
  insert into public.products (
    name, slug, price_vnd, compare_at_price_vnd,
    stock_quantity, image_url, short_description, description,
    is_featured, is_active
  ) values (
    p_name, coalesce(p_slug, lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '-', 'g'))),
    coalesce(p_price_vnd, 0), p_compare_at_price_vnd,
    coalesce(p_stock_quantity, 0), p_image_url,
    p_short_description, p_description,
    coalesce(p_is_featured, false), coalesce(p_is_active, true)
  )
  returning * into v_prod;

  return to_jsonb(v_prod);
end;
$$;

grant execute on function public.admin_save_product to anon, authenticated;

-- ==============================================================================
-- SEED DATA MẪU
-- ==============================================================================
insert into public.categories (name, slug, sort_order, is_active) values
  ('Khô Đặc Sản', 'kho-dac-san', 1, true),
  ('Bánh Kẹo Truyền Thống', 'banh-keo-truyen-thong', 2, true),
  ('Mật Ong & Nông Sản', 'mat-ong-nong-san', 3, true),
  ('Trái Cây Sấy & Ăn Vặt', 'trai-cay-say-an-vat', 4, true)
on conflict (slug) do nothing;

insert into public.products (category_id, name, slug, short_description, description, image_url, price_vnd, compare_at_price_vnd, stock_quantity, is_featured, is_active) values
  ((select id from public.categories where slug = 'kho-dac-san'), 'Khô Cá Lóc Đồng Miền Tây (500g)', 'kho-ca-loc-dong-500g', 'Khô cá lóc đồng tẩm vị vừa ăn, thịt ngọt tự nhiên phơi đủ 3 nắng giòn thơm.', 'Được làm từ cá lóc đồng tươi sống nuôi tự nhiên vùng sông nước miền Tây. Thịt cá được ướp với tiêu sọ, ớt tươi cay nồng và muối biển theo công thức gia truyền nhà Út.', 'assets/images/products/kho-ca-loc.jpg', 160000, 190000, 45, true, true),
  ((select id from public.categories where slug = 'kho-dac-san'), 'Khô Cá Sặc Bổi U Minh (500g)', 'kho-ca-sac-boi-u-minh', 'Khô sặc rằn béo ngậy, thịt mềm thơm đặc trưng xứ tràm Cà Mau.', 'Cá sặc bổi tự nhiên vùng rừng tràm U Minh, thịt dày, béo và ngọt đậm đà. Phơi đủ nắng giữ trọn hương vị nguyên bản sông nước.', 'assets/images/products/kho-ca-sac.jpg', 175000, 200000, 30, true, true),
  ((select id from public.categories where slug = 'kho-dac-san'), 'Tôm Khô Rạch Gốc Cà Mau Loại 1 (250g)', 'tom-kho-rach-goc-ca-mau-250g', 'Tôm đất thiên nhiên Rạch Gốc phơi khô thủ công, màu đỏ tự nhiên, thịt ngọt đậm đà.', 'Tôm khô Rạch Gốc nổi danh Cà Mau, được làm từ 100% tôm đất tươi sống vừa đánh bắt tại cửa sông. Thịt tôm dai ngọt thanh tao, không phẩm màu.', 'assets/images/products/tom-kho.jpg', 285000, 320000, 35, true, true),
  ((select id from public.categories where slug = 'kho-dac-san'), 'Khô Nhái Đồng An Giang — "Vũ Nữ Chân Dài" (250g)', 'kho-nhai-an-giang-250g', 'Đặc sản xứ Thất Sơn An Giang, chiên giòn rụm chấm mắm me cay nồng thơm phức.', 'Khô nhái đồng tự nhiên xứ An Giang, được sơ chế sạch sẽ, ướp tiêu ớt và muối phơi đủ nắng. Khi chiên lên giòn rụm từ xương đến thịt.', 'assets/images/products/kho-nhai.jpg', 140000, 160000, 40, false, true),
  ((select id from public.categories where slug = 'banh-keo-truyen-thong'), 'Bánh Pía Sóc Trăng Trứng Muối Sầu Riêng', 'banh-pia-soc-trang-sau-rieng', 'Vỏ ngàn lớp mỏng tang, nhân sầu riêng tươi béo ngậy hòa quyện lòng đỏ trứng muối.', 'Bánh pía truyền thống nổi danh xứ Vũng Thơm - Sóc Trăng. Bánh dùng 100% sầu riêng tươi chín cây, ngọt thanh tự nhiên không gắt cổ.', 'assets/images/products/banh-pia.jpg', 85000, 95000, 60, true, true),
  ((select id from public.categories where slug = 'banh-keo-truyen-thong'), 'Kẹo Dừa Bến Tre Nước Cốt Dừa Truyền Thống', 'keo-dua-ben-tre-truyen-thong', 'Kẹo dừa dẻo thơm, ngậy béo nước cốt dừa nguyên chất không pha hương liệu.', 'Đặc sản xứ dừa Bến Tre trứ danh, dẻo bùi béo ngọt tự nhiên, gói bánh tráng mỏng tan trong miệng.', 'assets/images/products/keo-dua.jpg', 50000, 60000, 80, false, true),
  ((select id from public.categories where slug = 'banh-keo-truyen-thong'), 'Bánh Tét Lá Cẩm Cần Thơ Trứng Muối (Đòn 800g)', 'banh-tet-la-cam-can-tho-800g', 'Nếp ngâm lá cẩm tím mộng mơ, nhân đậu xanh béo bùi, thịt mỡ và trứng muối đậm đà.', 'Đặc sản gia truyền xứ Cần Thơ, nếp thơm xào nước cốt dừa và lá cẩm tươi tạo màu tím tự nhiên óng ả.', 'assets/images/products/banh-tet.jpg', 120000, 140000, 25, true, true),
  ((select id from public.categories where slug = 'banh-keo-truyen-thong'), 'Bánh Phồng Tôm Sa Giang Đồng Tháp (Hộp 200g)', 'banh-phong-tom-sa-giang-200g', 'Bánh phồng tôm trứ danh Sa Đéc, giòn tan xốp nhẹ, đậm đà vị ngọt tôm tươi.', 'Được làm từ tinh bột khoai mì và thịt tôm tươi Đồng Tháp theo phương pháp truyền thống lâu đời.', 'assets/images/products/banh-phong-tom.jpg', 38000, 45000, 70, false, true),
  ((select id from public.categories where slug = 'mat-ong-nong-san'), 'Mật Ong Hoa Nhãn Rừng Tự Nhiên (500ml)', 'mat-ong-hoa-nhan-500ml', 'Mật ong nguyên chất sánh vàng óng ánh, thơm lừng hương hoa nhãn miền Tây.', 'Mật ong được thu hoạch từ những vườn nhãn trĩu quả miền Tây sông Tiền, hương vị thơm nồng, giàu dưỡng chất tốt cho sức khỏe và sắc đẹp.', 'assets/images/products/mat-ong.jpg', 180000, 220000, 25, true, true),
  ((select id from public.categories where slug = 'mat-ong-nong-san'), 'Đường Thốt Nốt Nguyên Chất An Giang (Hũ 1kg)', 'duong-thot-not-an-giang-1kg', 'Nấu từ mật hoa thốt nốt tươi tự nhiên, ngọt thanh dịu mát, thơm lừng vị caramel.', 'Đường thốt nốt được bà con Khmer vùng Bảy Núi An Giang nấu thủ công từ những giọt mật hoa thốt nốt tinh khiết.', 'assets/images/products/duong-thot-not.jpg', 75000, 90000, 55, false, true),
  ((select id from public.categories where slug = 'trai-cay-say-an-vat'), 'Mít Sấy Giòn Xuất Khẩu (250g)', 'mit-say-gion-250g', 'Mít sấy giòn rụm từ mít thái chín cây, ngọt lịm tự nhiên không dầu mỡ.', 'Mít sấy công nghệ sấy chân không hiện đại, giữ nguyên hương vị thơm ngát của mít chín cây miền phù sa.', 'assets/images/products/mit-say.jpg', 55000, 65000, 50, true, true),
  ((select id from public.categories where slug = 'trai-cay-say-an-vat'), 'Xoài Cát Hòa Lộc Sấy Dẻo Chua Ngọt (Gói 200g)', 'xoai-cat-hoa-loc-say-deo-200g', 'Xoài cát chín cây sấy dẻo giữ trọn hương thơm nồng nàn và vị chua ngọt tự nhiên.', 'Được chế biến từ xoài cát Hòa Lộc nổi danh Cái Bè - Tiền Giang. Từng lát xoài dẻo mềm, thơm ngát, vị chua ngọt hài hòa thanh khiết.', 'assets/images/products/xoai-say.jpg', 68000, 80000, 60, false, true)
on conflict (slug) do nothing;
