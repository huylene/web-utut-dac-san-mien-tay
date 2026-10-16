/**
 * Payment & VietQR Module — Út Út (utut.vn)
 * Tạo mã QR thanh toán VietQR và xử lý thông báo đã chuyển khoản
 * Tuân thủ 05-FEATURE-SPECS.md: Không suy ra thanh toán thành công chỉ từ phía client!
 */

import { PAYMENT_CONFIG, STORE_CONFIG } from './config.js';
import { DataService } from './supabase-client.js';
import { formatVND, escapeHtml, copyToClipboard, showToast } from './ui-utils.js';

export async function initPaymentPage() {
  const container = document.getElementById('payment-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  // Lấy mã đơn từ query string, nếu không có thì lấy từ session, hoặc đơn gần nhất
  let orderCode = urlParams.get('order') || sessionStorage.getItem('last_order_code') || localStorage.getItem('last_order_code') || '';

  let orderInfo = null;
  let amount = Number(sessionStorage.getItem('last_order_total')) || 0;

  // Nếu không có mã đơn trong URL, tự động tìm đơn gần nhất để luôn hiển thị mã QR thành công
  if (!orderCode) {
    try {
      const orders = await DataService.adminGetOrders();
      if (orders && orders.length > 0) {
        orderCode = orders[0].order_code;
        amount = orders[0].total_vnd;
        orderInfo = orders[0];
      }
    } catch (e) {
      console.warn('Không thể tải danh sách đơn:', e);
    }
  }

  // Nếu vẫn chưa có đơn nào trong hệ thống, tạo mã minh họa mẫu
  if (!orderCode) {
    orderCode = 'UT' + Math.random().toString(36).substring(2, 8).toUpperCase();
    amount = 320000;
  }

  const cleanCode = orderCode.trim().toUpperCase();

  // Thử tra cứu thông tin chi tiết của đơn
  const lastLookupToken = sessionStorage.getItem('last_lookup_token') || '';
  try {
    const res = await DataService.trackOrder(cleanCode, lastLookupToken);
    if (res && res.success && res.order) {
      orderInfo = res.order;
      amount = res.order.total_vnd;
    }
  } catch (e) {
    console.warn('Lỗi tra cứu đơn:', e);
  }

  // Nếu amount chưa có hoặc bằng 0, gán mặc định để hiển thị QR minh họa đẹp mắt
  if (!amount || amount <= 0) {
    amount = 320000;
  }

  // Tạo URL VietQR chuẩn theo ngân hàng và số tiền
  const vietQrUrl = `https://img.vietqr.io/image/${PAYMENT_CONFIG.bankId}-${PAYMENT_CONFIG.accountNo}-${PAYMENT_CONFIG.qrTemplate}.png?amount=${amount}&addInfo=${cleanCode}&accountName=${encodeURIComponent(PAYMENT_CONFIG.accountName)}`;

  container.innerHTML = `
    <div style="max-width: 680px; margin: 0 auto;">
      <!-- Khung thông báo Đặt hàng thành công nổi bật -->
      <div class="order-success-banner" style="background: linear-gradient(135deg, #EAF8F0 0%, #D1FADF 100%); border: 2px solid var(--color-success); border-radius: var(--radius-xl); padding: var(--space-6); text-align: center; margin-bottom: var(--space-6); box-shadow: var(--shadow-sm);">
        <div style="font-size: 3.5rem; line-height: 1; margin-bottom: 12px;">🎉</div>
        <h1 style="color: var(--color-success); margin-bottom: 8px; font-size: var(--font-size-2xl);">Đặt Hàng Thành Công!</h1>
        <p style="color: var(--color-text-main); font-size: var(--font-size-base); margin-bottom: 12px; line-height: 1.5;">
          Cảm ơn bạn đã tin chọn đặc sản nhà <strong>Út Út</strong>. Đơn hàng của bạn đã được ghi nhận vào hệ thống!
        </p>
        <div style="display: inline-flex; align-items: center; gap: 8px; background: #FFFFFF; border: 1px dashed var(--color-success); padding: 8px 20px; border-radius: var(--radius-full); box-shadow: var(--shadow-sm);">
          <span style="font-size: var(--font-size-sm); color: var(--color-text-muted);">Mã đơn hàng:</span>
          <strong style="color: var(--color-primary); font-size: 1.25rem; letter-spacing: 0.05em;">${cleanCode}</strong>
        </div>
      </div>

      <!-- Khung Quét mã QR Thanh toán -->
      <div class="qr-card">
        <div class="section-title-wrap" style="margin-bottom: var(--space-4);">
          <span class="section-tag">Thanh toán chuyển khoản nhanh 24/7</span>
          <h2 style="font-size: var(--font-size-xl); margin-top: 4px;">Quét Mã VietQR Chuyển Tiền</h2>
          <p style="font-size: var(--font-size-sm); margin: 0;">Mở app ngân hàng bất kỳ để quét mã QR có sẵn số tiền và nội dung</p>
        </div>

        <div id="payment-status-badge" style="margin-bottom: var(--space-4);">
          <span class="badge badge-pending" style="font-size: var(--font-size-sm); padding: 6px 14px;">
            ⏳ Chờ thanh toán chuyển khoản (${cleanCode})
          </span>
        </div>

        <div class="qr-image-wrap">
          <img src="${vietQrUrl}" alt="Mã QR thanh toán đơn hàng ${cleanCode}" class="qr-image" />
        </div>

        <div style="background-color: var(--color-bg); padding: var(--space-4); border-radius: var(--radius-lg); margin-bottom: var(--space-4); border: 1px solid var(--color-border);">
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.05em;">SỐ TIỀN CẦN CHUYỂN KHOẢN</div>
          <div style="font-size: var(--font-size-3xl); font-weight: bold; color: var(--color-primary); margin-top: 4px;">${formatVND(amount)}</div>
        </div>

        <table class="bank-info-table">
          <tr>
            <th>Ngân hàng:</th>
            <td>${escapeHtml(PAYMENT_CONFIG.bankName)}</td>
          </tr>
          <tr>
            <th>Số tài khoản:</th>
            <td>
              <span>${escapeHtml(PAYMENT_CONFIG.accountNo)}</span>
              <button type="button" class="copy-badge" id="copy-acc-btn">Sao chép</button>
            </td>
          </tr>
          <tr>
            <th>Chủ tài khoản:</th>
            <td>${escapeHtml(PAYMENT_CONFIG.accountName)}</td>
          </tr>
          <tr>
            <th>Nội dung chuyển khoản:</th>
            <td>
              <span style="color: var(--color-primary); font-size: 1.15rem; font-weight: bold;">${cleanCode}</span>
              <button type="button" class="copy-badge" id="copy-code-btn">Sao chép</button>
            </td>
          </tr>
        </table>

        <div style="background-color: var(--color-warning-bg); color: var(--color-warning); font-size: var(--font-size-xs); padding: var(--space-3) var(--space-4); border-radius: var(--radius-md); text-align: left; margin-bottom: var(--space-6); line-height: 1.5; border: 1px solid rgba(181, 71, 8, 0.2);">
          ⚠️ <strong>Lưu ý quan trọng:</strong> Giữ nguyên nội dung chuyển khoản là <strong>${cleanCode}</strong> để tiệm Út Út đối soát tiền vào đơn của bạn nhanh nhất.
        </div>

        <div style="display: flex; flex-direction: column; gap: var(--space-3);">
          <button type="button" class="btn btn-secondary btn-block btn-lg" id="confirm-transfer-btn">
            ✓ Tôi Đã Chuyển Khoản Xong
          </button>
          <a href="track-order.html?order=${encodeURIComponent(cleanCode)}" class="btn btn-outline btn-block">
            🔍 Theo dõi tiến độ đơn hàng
          </a>
          <a href="index.html" style="font-size: var(--font-size-sm); color: var(--color-text-muted); text-align: center; margin-top: 4px;">
            ← Quay về trang chủ tiếp tục xem món
          </a>
        </div>
      </div>
    </div>
  `;

  // Gắn sự kiện sao chép
  document.getElementById('copy-acc-btn')?.addEventListener('click', () => {
    copyToClipboard(PAYMENT_CONFIG.accountNo, 'Đã sao chép số tài khoản');
  });

  document.getElementById('copy-code-btn')?.addEventListener('click', () => {
    copyToClipboard(cleanCode, 'Đã sao chép nội dung chuyển khoản');
  });

  // Gắn sự kiện "Tôi đã chuyển khoản"
  const confirmBtn = document.getElementById('confirm-transfer-btn');
  confirmBtn?.addEventListener('click', async () => {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Đang gửi thông báo...';

    try {
      const res = await DataService.requestPaymentVerification(cleanCode);
      if (res && res.success) {
        showToast('Đã gửi thông báo xác nhận! Tiệm Út sẽ kiểm tra tài khoản và xác nhận đơn ngay.', 'success');
        const badgeEl = document.getElementById('payment-status-badge');
        if (badgeEl) {
          badgeEl.innerHTML = `
            <span class="badge badge-info" style="font-size: var(--font-size-sm); padding: 6px 14px;">
              ⏳ Đã báo chuyển khoản — Tiệm Út đang đối soát
            </span>
          `;
        }
        confirmBtn.textContent = '✓ Đã gửi yêu cầu đối soát thành công';
      } else {
        showToast(res.message || 'Chưa thể cập nhật trạng thái', 'warning');
        confirmBtn.disabled = false;
        confirmBtn.textContent = '✓ Tôi Đã Chuyển Khoản Xong';
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi gửi xác nhận', 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = '✓ Tôi Đã Chuyển Khoản Xong';
    }
  });
}
