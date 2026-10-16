# 08 — Checklist nghiệm thu

## Giao diện
- [ ] Header sticky không che nội dung khi điều hướng bằng anchor.
- [ ] Trang chủ, danh sách, chi tiết, giỏ, checkout, tra cứu và admin hoạt động.
- [ ] Responsive ở chiều rộng 360px, 768px, 1024px và desktop.
- [ ] Có trạng thái loading, empty, success và error.
- [ ] Không có nút giả hoặc liên kết `#` không hoạt động.
- [ ] Ảnh sản phẩm là ảnh thật đã được duyệt.
- [ ] Video YouTube hiển thị tỷ lệ 16:9 và không tràn màn hình.

## Sản phẩm và giỏ hàng
- [ ] Chỉ sản phẩm đang hoạt động được hiển thị.
- [ ] Thêm, xóa, tăng/giảm số lượng hoạt động.
- [ ] Giỏ được giữ sau refresh nhưng không chứa dữ liệu nhạy cảm.
- [ ] Sản phẩm bị ngừng bán hoặc hết hàng được xử lý rõ.
- [ ] Giá trong database được dùng để tính đơn cuối cùng.

## Checkout và đơn hàng
- [ ] Thiếu tên/số điện thoại/địa chỉ thì không tạo đơn.
- [ ] Dữ liệu đầu vào được kiểm tra cả client và database/RPC.
- [ ] Bấm nút nhiều lần không tạo nhiều đơn ngoài ý muốn.
- [ ] Mỗi đơn có mã đơn duy nhất.
- [ ] `order_items` lưu snapshot tên, đơn giá và số lượng.
- [ ] Khách không thể tự thay tổng tiền hoặc trạng thái đơn.
- [ ] Khách A không thể xem đơn của khách B.
- [ ] Token tra cứu không xuất hiện trong log hoặc URL công khai nếu thiết kế có thể tránh.

## QR và thanh toán
- [ ] QR hiển thị đúng tài khoản nhận tiền đã xác minh.
- [ ] Nội dung chuyển khoản có mã đơn.
- [ ] Tạo đơn mới mặc định chưa thanh toán.
- [ ] Bấm “Tôi đã chuyển khoản” không tự đánh dấu `paid`.
- [ ] Chỉ admin được xác minh thủ công trong MVP.
- [ ] Sửa query string/localStorage không làm đơn thành đã thanh toán.
- [ ] Nếu tích hợp webhook, chữ ký được xác minh server-side.

## Admin và RLS
- [ ] Chưa đăng nhập không vào được màn hình quản trị.
- [ ] Customer không thể tự cấp role admin.
- [ ] Anon không thể đọc danh sách đơn.
- [ ] Anon không thể sửa/xóa sản phẩm.
- [ ] Customer không thể đổi trạng thái đơn.
- [ ] Admin có thể tìm/lọc đơn và cập nhật trạng thái hợp lệ.
- [ ] Hủy đơn giữ lịch sử theo mặc định.
- [ ] Review mới chờ duyệt; review bị từ chối không xuất hiện công khai.

## Chất lượng
- [ ] Không có service-role key hoặc secret trong mã frontend.
- [ ] Không có lỗi nghiêm trọng trong console.
- [ ] Form có label và lỗi có thể đọc bằng screen reader.
- [ ] Có title, meta description, alt ảnh và HTTPS.
- [ ] Thông tin liên hệ, giá, chính sách và nội dung pháp lý đã được chủ shop duyệt.
