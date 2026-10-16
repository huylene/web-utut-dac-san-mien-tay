/**
 * Checkout Module — Út Út (utut.vn)
 * Xác thực thông tin giao hàng, chống tạo đơn trùng và tạo đơn an toàn
 * Tuân thủ 05-FEATURE-SPECS.md & 06-ADMIN-AND-SECURITY.md
 */

import { CartManager } from './cart.js';
import { DataService } from './supabase-client.js';
import { formatVND, escapeHtml, showToast } from './ui-utils.js';

export async function initCheckoutPage() {
  const summaryItemsEl = document.getElementById('checkout-items-summary');
  const subtotalEl = document.getElementById('checkout-subtotal');
  const totalEl = document.getElementById('checkout-total');
  const checkoutForm = document.getElementById('checkout-form');
  const submitBtn = document.getElementById('place-order-btn');

  if (!checkoutForm) return;

  // 1. Kiểm tra giỏ hàng
  const cartData = await CartManager.getDetailedCart();
  if (cartData.items.length === 0) {
    showToast('Giỏ hàng của bạn đang trống! Đang chuyển hướng...', 'warning');
    setTimeout(() => {
      window.location.href = 'products.html';
    }, 1500);
    return;
  }

  // 2. Render tóm tắt đơn hàng
  if (summaryItemsEl) {
    summaryItemsEl.innerHTML = cartData.items.map(item => `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3); font-size: var(--font-size-sm);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <img src="${escapeHtml(item.product.image_url || 'assets/images/logo-utut.png')}" alt="${escapeHtml(item.product.name)}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid var(--color-border);" onerror="this.src='assets/images/logo-utut.png'" />
          <div>
            <div style="font-weight: 600; color: var(--color-text-main);">${escapeHtml(item.product.name)}</div>
            <div style="color: var(--color-text-muted);">SL: ${item.quantity} x ${formatVND(item.product.price_vnd)}</div>
          </div>
        </div>
        <div style="font-weight: 600; color: var(--color-primary);">${formatVND(item.lineTotalVND)}</div>
      </div>
    `).join('');
  }

  if (subtotalEl) subtotalEl.textContent = formatVND(cartData.subtotalVND);
  if (totalEl) totalEl.textContent = formatVND(cartData.subtotalVND);

  // 3. Xử lý đặt hàng chống gửi lặp (Debounce & Disable button)
  let isSubmitting = false;

  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (isSubmitting) return;

    const nameInput = document.getElementById('checkout-name');
    const phoneInput = document.getElementById('checkout-phone');
    const addressInput = document.getElementById('checkout-address');
    const emailInput = document.getElementById('checkout-email');
    const noteInput = document.getElementById('checkout-note');
    const termsInput = document.getElementById('checkout-terms');

    const customerName = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const shippingAddress = addressInput.value.trim();
    const email = emailInput ? emailInput.value.trim() : '';
    const customerNote = noteInput ? noteInput.value.trim() : '';

    // Validate phía client
    if (!customerName) {
      showToast('Vui lòng nhập họ và tên người nhận hàng', 'error');
      nameInput.focus();
      return;
    }

    // Kiểm tra định dạng số điện thoại Việt Nam
    const phoneRegex = /(0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!phoneRegex.test(phone)) {
      showToast('Số điện thoại không hợp lệ (cần 10 chữ số, bắt đầu bằng 03, 05, 07, 08, 09)', 'error');
      phoneInput.focus();
      return;
    }

    if (!shippingAddress || shippingAddress.length < 8) {
      showToast('Vui lòng nhập địa chỉ nhận hàng chi tiết (số nhà, tên đường, phường/xã, tỉnh/thành)', 'error');
      addressInput.focus();
      return;
    }

    if (termsInput && !termsInput.checked) {
      showToast('Vui lòng đồng ý với chính sách giao hàng và bảo mật của Út Út', 'warning');
      return;
    }

    // Khóa nút tránh gửi nhiều lần
    isSubmitting = true;
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerHTML;
    submitBtn.innerHTML = `⏳ Đang tạo đơn hàng...`;

    try {
      // Chuẩn bị danh sách mặt hàng gửi database
      const itemsPayload = cartData.items.map(i => ({
        product_id: i.product.id,
        quantity: i.quantity
      }));

      // Gọi RPC tạo đơn (Database tự tính lại giá từ bảng products)
      const result = await DataService.createOrder({
        customerName,
        phone,
        shippingAddress,
        email,
        customerNote,
        items: itemsPayload
      });

      if (!result || !result.order_code) {
        throw new Error('Không nhận được mã đơn từ máy chủ');
      }

      // Lưu tạm mã đơn và token vào storage để trang payment tự động nhận diện
      sessionStorage.setItem('last_order_code', result.order_code);
      localStorage.setItem('last_order_code', result.order_code);
      sessionStorage.setItem('last_order_total', result.total_vnd);
      localStorage.setItem('last_order_total', result.total_vnd);
      if (result.lookup_token) {
        sessionStorage.setItem('last_lookup_token', result.lookup_token);
        localStorage.setItem('last_lookup_token', result.lookup_token);
      }

      // Xóa sạch giỏ hàng
      CartManager.clear();

      showToast(`Tạo đơn hàng ${result.order_code} thành công!`, 'success');

      // Chuyển sang trang thanh toán QR
      setTimeout(() => {
        window.location.href = `payment.html?order=${encodeURIComponent(result.order_code)}`;
      }, 500);

    } catch (err) {
      console.error('Lỗi tạo đơn:', err);
      showToast(err.message || 'Lỗi khi đặt hàng, vui lòng thử lại', 'error');
      isSubmitting = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  });
}
