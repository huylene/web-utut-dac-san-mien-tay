# 03 — UI/UX Design System

## 1. Tinh thần thương hiệu
Ấm áp, gần gũi, dân dã miền Tây nhưng sạch sẽ và hiện đại. Nội dung nhấn mạnh nguồn gốc, hương vị, cách dùng và giá trị làm quà. Không dùng ảnh giả như thể là ảnh thật của sản phẩm.

## 2. Màu sắc
- Primary — cam đất: `#D35400`
- Secondary — xanh lá: `#27AE60`
- Background — trắng ngà: `#FAF8F5`
- Text chính: `#2D2A26`
- Text phụ: `#6B625B`
- Border: `#E8E0D8`
- Surface: `#FFFFFF`
- Error: `#B42318`
- Success: `#18794E`

Đảm bảo tương phản văn bản đủ đọc; không dùng màu sắc làm tín hiệu duy nhất.

## 3. Typography
- Font ưu tiên: Inter; fallback `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Tiêu đề rõ ràng, hạn chế dùng quá nhiều kiểu chữ.
- Nội dung thân bài tối thiểu khoảng 16px trên mobile.

## 4. Layout và thành phần
- Header cố định hoặc sticky: logo, Trang chủ, Về Út Út, Đặc sản, Tra cứu đơn, biểu tượng giỏ hàng.
- Hero: thông điệp chính, CTA “Khám phá đặc sản” và ảnh sản phẩm thật.
- Lưới sản phẩm: 2 cột mobile, 3 cột tablet, 4 cột desktop tùy độ rộng.
- Product card: ảnh, tên, giá, nhãn nổi bật nếu có, nút thêm giỏ.
- Cart badge hiển thị số lượng sản phẩm.
- Footer: liên hệ, chính sách giao hàng/đổi trả/bảo mật, liên kết mạng xã hội và dòng “Dữ liệu được lưu tại Supabase” chỉ khi đúng với triển khai.
- Admin: giao diện ưu tiên bảng dễ đọc, bộ lọc, trạng thái đơn bằng nhãn có cả chữ.

## 5. Responsive
- Mobile-first.
- Không để bảng admin tràn màn hình; dùng scroll ngang hoặc chuyển thành card.
- Nút chạm đủ lớn, khoảng cách hợp lý.
- Ảnh dùng `width: 100%; height: auto; object-fit: cover;` và kích thước ảnh tối ưu.
- Giỏ hàng/checkout không yêu cầu khách phải tạo tài khoản.

## 6. Hình ảnh và nội dung
- Logo: lấy file chính thức từ chủ sở hữu thương hiệu hoặc nguồn được cho phép.
- Ảnh sản phẩm: dùng ảnh thật, được phép sử dụng; không lấy ảnh trên mạng mà không kiểm tra quyền.
- Mỗi ảnh có alt text mô tả sản phẩm.
- Không bịa nguồn gốc, chứng nhận, thành phần, hạn sử dụng hoặc tuyên bố sức khỏe.
- Video YouTube cần tiêu đề/giới thiệu ngắn và responsive iframe.

## 7. Video YouTube
URL embed đã cung cấp:

```html
<iframe
  src="https://www.youtube.com/embed/lr75kOuiZ-o?si=-7BKYyana0CKE7Fb"
  title="Video giới thiệu ẩm thực miền Tây"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
  allowfullscreen>
</iframe>
```

CSS responsive:

```css
.video-frame {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  border-radius: 1rem;
}
.video-frame iframe {
  width: 100%;
  height: 100%;
  border: 0;
}
```

## 8. Accessibility và SEO
- Dùng HTML semantic (`header`, `nav`, `main`, `section`, `footer`).
- Form có label, lỗi hiển thị bằng text, focus keyboard rõ.
- Heading theo thứ bậc; mỗi trang có title và meta description riêng.
- Open Graph cơ bản, canonical URL khi triển khai domain thật.
- Tối ưu ảnh, lazy-load nội dung dưới màn hình đầu.
