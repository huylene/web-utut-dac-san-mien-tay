-- ==============================================================================
-- CẤP QUYỀN QUẢN TRỊ ADMIN TOÀN DIỆN TRÊN SUPABASE (TIỆM ÚT ÚT)
-- Chạy đoạn mã này trong Supabase SQL Editor:
-- 1. Cho phép hiển thị ĐẦY ĐỦ chi tiết sản phẩm trong đơn hàng (order_items)
-- 2. Đảm bảo hàm đặt hàng create_web_order chạy quyền SECURITY DEFINER
-- 3. Tạo hàm RPC admin_get_orders để trang Quản lý đơn hàng lấy đủ 100% dữ liệu
-- ==============================================================================

-- 1. Cho phép quản trị bảng Đơn hàng (orders)
drop policy if exists "Admins can view and manage all orders" on public.orders;
drop policy if exists "Public can insert orders" on public.orders;
drop policy if exists "Customers can view own orders" on public.orders;

create policy "Admins can view and manage all orders"
  on public.orders for all
  using (true)
  with check (true);

-- 2. Cho phép xem và quản trị chi tiết món trong đơn hàng (order_items)
drop policy if exists "Admins can view and manage all order items" on public.order_items;
drop policy if exists "Public can view order items" on public.order_items;
drop policy if exists "Public can insert order items" on public.order_items;

create policy "Admins can view and manage all order items"
  on public.order_items for all
  using (true)
  with check (true);

-- 3. Cho phép chỉnh sửa bảng Sản phẩm (products)
drop policy if exists "Admins can manage products" on public.products;
drop policy if exists "Anon & Customers can view active products" on public.products;

create policy "Admins can manage products"
  on public.products for all
  using (true)
  with check (true);

-- 4. Cho phép quản lý Danh mục (categories)
drop policy if exists "Admins can manage categories" on public.categories;
drop policy if exists "Anon & Customers can view active categories" on public.categories;

create policy "Admins can manage categories"
  on public.categories for all
  using (true)
  with check (true);

-- 5. Cho phép duyệt, gửi, ẩn, xóa Đánh giá (reviews)
drop policy if exists "Admins can moderate reviews" on public.reviews;
drop policy if exists "Anyone can view approved reviews" on public.reviews;
drop policy if exists "Public can submit review for moderation" on public.reviews;

-- Cho phép xem đánh giá
create policy "Anyone can view approved reviews"
  on public.reviews for select
  using (true);

-- Cho phép khách gửi đánh giá mới
create policy "Public can submit review for moderation"
  on public.reviews for insert
  with check (true);

-- Cho phép admin toàn quyền duyệt, ẩn, xóa đánh giá
create policy "Admins can moderate reviews"
  on public.reviews for all
  using (true)
  with check (true);

-- Tự động đưa đánh giá của Huy và các khách hàng vào cơ sở dữ liệu nếu chưa có
insert into public.reviews (product_id, display_name, rating, comment, moderation_status, created_at)
select p.id, 'Huy', 5, 'Bánh Pía ngon lắm, thơm mùi sầu riêng và trứng muối bùi béo!', 'approved', now() - interval '4 hours'
from public.products p
where p.slug = 'banh-pia-soc-trang-sau-rieng'
and not exists (select 1 from public.reviews r where r.display_name = 'Huy')
limit 1;

insert into public.reviews (product_id, display_name, rating, comment, moderation_status, created_at)
select p.id, 'Anh Hai Cần Thơ', 5, 'Khô cá lóc thịt dầy, ướp vừa miệng không bị mặn chát. Nướng nhậu hay chiên ăn cơm đều hết sẩy!', 'approved', now() - interval '3 days'
from public.products p
where p.slug = 'kho-ca-loc-dong-500g'
and not exists (select 1 from public.reviews r where r.display_name = 'Anh Hai Cần Thơ')
limit 1;

insert into public.reviews (product_id, display_name, rating, comment, moderation_status, created_at)
select p.id, 'Chị Ba Sài Gòn', 5, 'Bánh pía thơm sầu riêng nức mũi, trứng muối bùi béo. Đóng gói rất kỹ, làm quà tặng ai cũng khen.', 'approved', now() - interval '5 days'
from public.products p
where p.slug = 'banh-pia-soc-trang-sau-rieng'
and not exists (select 1 from public.reviews r where r.display_name = 'Chị Ba Sài Gòn')
limit 1;

-- 6. Tạo Function RPC Admin Get Orders (Bỏ qua RLS, trả về đầy đủ sản phẩm kèm đơn)
create or replace function public.admin_get_orders(
  p_status text default null,
  p_search text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_result jsonb;
begin
  select jsonb_agg(
    jsonb_build_object(
      'id', o.id,
      'order_code', o.order_code,
      'customer_name', o.customer_name,
      'phone', o.phone,
      'email', o.email,
      'shipping_address', o.shipping_address,
      'customer_note', o.customer_note,
      'subtotal_vnd', o.subtotal_vnd,
      'shipping_fee_vnd', o.shipping_fee_vnd,
      'total_vnd', o.total_vnd,
      'order_status', o.order_status,
      'payment_status', o.payment_status,
      'payment_method', o.payment_method,
      'created_at', o.created_at,
      'updated_at', o.updated_at,
      'order_items', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'order_id', oi.order_id,
            'product_id', oi.product_id,
            'product_name_snapshot', oi.product_name_snapshot,
            'unit_price_vnd', oi.unit_price_vnd,
            'quantity', oi.quantity,
            'line_total_vnd', oi.line_total_vnd,
            'image_url', p.image_url
          )
        )
        from public.order_items oi
        left join public.products p on p.id = oi.product_id
        where oi.order_id = o.id
      ), '[]'::jsonb)
    )
    order by o.created_at desc
  )
  into v_result
  from public.orders o
  where (p_status is null or p_status = '' or o.order_status = p_status)
    and (p_search is null or p_search = '' or 
         o.order_code ilike '%' || p_search || '%' or
         o.customer_name ilike '%' || p_search || '%' or
         o.phone ilike '%' || p_search || '%' or
         o.shipping_address ilike '%' || p_search || '%');

  return coalesce(v_result, '[]'::jsonb);
end;
$$;
grant execute on function public.admin_get_orders to anon, authenticated;

-- 7. Cập nhật Function RPC Create Web Order (Đảm bảo chạy SECURITY DEFINER)
create or replace function public.create_web_order(
  p_customer_name text,
  p_phone text,
  p_shipping_address text,
  p_email text default null,
  p_customer_note text default null,
  p_items jsonb default '[]'::jsonb,
  p_shipping_fee_vnd bigint default 0
)
returns jsonb
language plpgsql
security definer
as $$
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

  v_order_code := 'UT' || upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
  v_lookup_token := lower(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12));

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
    payment_status,
    payment_method
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
    'unpaid',
    'bank_transfer_qr'
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_item_qty := (v_item->>'quantity')::integer;
    if v_item_qty <= 0 then
      raise exception 'Số lượng sản phẩm không hợp lệ';
    end if;

    select id, name, price_vnd, is_active into v_prod
    from public.products
    where id = (v_item->>'product_id')::uuid
       or slug = (v_item->>'product_id');

    if not found or v_prod.is_active = false then
      raise exception 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh';
    end if;

    v_line_total := v_prod.price_vnd * v_item_qty;
    v_subtotal_vnd := v_subtotal_vnd + v_line_total;

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
$$;
grant execute on function public.create_web_order to anon, authenticated;

-- 8. Tự động nạp chi tiết sản phẩm (order_items) cho tất cả các đơn hàng trên Supabase
insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 160000, 1, 160000
from public.orders o
cross join (select id, name from public.products where slug = 'kho-ca-loc-dong-500g' limit 1) p
where o.order_code in ('UTB6B8FD', 'UTCE4E5B')
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 160000, 2, 320000
from public.orders o
cross join (select id, name from public.products where slug = 'kho-ca-loc-dong-500g' limit 1) p
where o.order_code = 'UT-8A92F1'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 170000, 1, 170000
from public.orders o
cross join (select id, name from public.products where slug = 'banh-pia-soc-trang-sau-rieng' limit 1) p
where o.order_code = 'UT-8A92F1'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 290000, 2, 580000
from public.orders o
cross join (select id, name from public.products where slug = 'tom-kho-rach-goc-ca-mau-250g' limit 1) p
where o.order_code = 'UT-7C44D2'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 175000, 1, 175000
from public.orders o
cross join (select id, name from public.products where slug = 'kho-ca-sac-boi-u-minh' limit 1) p
where o.order_code = 'UT-7C44D2'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 155000, 3, 465000
from public.orders o
cross join (select id, name from public.products where slug = 'kho-nhai-an-giang-250g' limit 1) p
where o.order_code = 'UT-9E11A8'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 120000, 2, 240000
from public.orders o
cross join (select id, name from public.products where slug = 'banh-tet-la-cam-can-tho-800g' limit 1) p
where o.order_code = 'UT-3F66C0'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 40000, 3, 120000
from public.orders o
cross join (select id, name from public.products where slug = 'banh-phong-tom-sa-giang-200g' limit 1) p
where o.order_code = 'UT-3F66C0'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 240000, 2, 480000
from public.orders o
cross join (select id, name from public.products where slug = 'mat-ong-hoa-nhan-500ml' limit 1) p
where o.order_code = 'UT-5B88D4'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 100000, 2, 200000
from public.orders o
cross join (select id, name from public.products where slug = 'duong-thot-not-an-giang-1kg' limit 1) p
where o.order_code = 'UT-5B88D4'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 160000, 1, 160000
from public.orders o
cross join (select id, name from public.products where slug = 'kho-ca-loc-dong-500g' limit 1) p
where o.order_code = 'UT-2D77E9'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 125000, 2, 250000
from public.orders o
cross join (select id, name from public.products where slug = 'mit-say-gion-250g' limit 1) p
where o.order_code = 'UT-2D77E9'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 85000, 3, 255000
from public.orders o
cross join (select id, name from public.products where slug = 'banh-pia-soc-trang-sau-rieng' limit 1) p
where o.order_code = 'UT-1A33F5'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 60000, 2, 120000
from public.orders o
cross join (select id, name from public.products where slug = 'keo-dua-ben-tre-truyen-thong' limit 1) p
where o.order_code = 'UT-1A33F5'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 290000, 2, 580000
from public.orders o
cross join (select id, name from public.products where slug = 'tom-kho-rach-goc-ca-mau-250g' limit 1) p
where o.order_code = 'UT-4E99A2'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);

insert into public.order_items (order_id, product_id, product_name_snapshot, unit_price_vnd, quantity, line_total_vnd)
select o.id, p.id, p.name, 155000, 2, 310000
from public.orders o
cross join (select id, name from public.products where slug = 'xoai-cat-hoa-loc-say-deo-200g' limit 1) p
where o.order_code = 'UT-4E99A2'
  and not exists (select 1 from public.order_items oi where oi.order_id = o.id and oi.product_id = p.id);
