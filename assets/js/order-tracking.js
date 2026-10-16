/**
 * Order Tracking Module — Út Út (utut.vn)
 * Tra cứu tiến độ đơn hàng theo Mã Đơn + Số điện thoại hoặc Token tra cứu
 * Tuân thủ 05-FEATURE-SPECS.md & 06-ADMIN-AND-SECURITY.md
 */

import { DataService } from './supabase-client.js';
import { formatVND, escapeHtml, formatDate, showToast } from './ui-utils.js';

const STATUS_LABELS = {
  pending_payment: { label: 'Chờ thanh toán', class: 'badge-pending', step: 1 },
  pending_confirmation: { label: 'Chờ shop đối soát tiền', class: 'badge-info', step: 2 },
  confirmed: { label: 'Đã xác nhận đơn', class: 'badge-success', step: 3 },
  preparing: { label: 'Đang chuẩn bị đặc sản', class: 'badge-info', step: 4 },
  shipping: { label: 'Đang giao hàng', class: 'badge-info', step: 5 },
  completed: { label: 'Giao hàng thành công', class: 'badge-success', step: 6 },
  cancelled: { label: 'Đơn hàng đã hủy', class: 'badge-error', step: 0 },
  payment_failed: { label: 'Thanh toán thất bại', class: 'badge-error', step: 0 }
};

export async function initOrderTrackingPage() {
  const form = document.getElementById('tracking-form');
  const resultContainer = document.getElementById('tracking-result');
  const codeInput = document.getElementById('track-order-code');
  const verifyInput = document.getElementById('track-verify-input');

  if (!form || !resultContainer) return;

  // Lấy mã đơn từ URL hoặc sessionStorage nếu có
  const urlParams = new URLSearchParams(window.location.search);
  const codeFromUrl = urlParams.get('order') || sessionStorage.getItem('last_order_code') || '';
  const tokenFromSession = sessionStorage.getItem('last_lookup_token') || '';

  if (codeFromUrl && codeInput) {
    codeInput.value = codeFromUrl;
  }
  if (tokenFromSession && verifyInput && !verifyInput.value) {
    verifyInput.value = tokenFromSession;
  }

  // Tự động tìm kiếm nếu đã có mã đơn và verify input
  if (codeFromUrl && (tokenFromSession || verifyInput?.value)) {
    executeTracking(codeFromUrl, verifyInput.value);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderCode = codeInput.value.trim().toUpperCase();
    const verify = verifyInput.value.trim();

    if (!orderCode) {
      showToast('Vui lòng nhập mã đơn hàng (VD: UT123456)', 'warning');
      codeInput.focus();
      return;
    }
    if (!verify) {
      showToast('Vui lòng nhập số điện thoại đặt hàng hoặc mã tra cứu bảo mật', 'warning');
      verifyInput.focus();
      return;
    }

    await executeTracking(orderCode, verify);
  });

  async function executeTracking(orderCode, verify) {
    resultContainer.innerHTML = `
      <div style="text-align: center; padding: var(--space-8);">
        <div class="spinner"></div>
        <p style="margin-top: 12px; color: var(--color-text-muted);">Đang tra cứu dữ liệu đơn hàng...</p>
      </div>
    `;

    try {
      const res = await DataService.trackOrder(orderCode, verify);
      if (!res.success || !res.order) {
        resultContainer.innerHTML = `
          <div class="state-box">
            <div class="state-icon">⚠️</div>
            <h3 class="state-title">Không tìm thấy đơn hàng</h3>
            <p class="state-desc">${escapeHtml(res.message || 'Mã đơn hoặc thông tin xác minh không khớp.')}</p>
          </div>
        `;
        return;
      }

      renderOrderResult(res.order);
    } catch (err) {
      console.error(err);
      resultContainer.innerHTML = `
        <div class="state-box">
          <p class="form-error">Lỗi khi tra cứu. Vui lòng thử lại sau.</p>
        </div>
      `;
    }
  }

  function renderOrderResult(order) {
    const statusMeta = STATUS_LABELS[order.order_status] || {
      label: order.order_status,
      class: 'badge-info',
      step: 1
    };

    const isCancelled = order.order_status === 'cancelled' || order.order_status === 'payment_failed';
    const currentStep = statusMeta.step;

    // Timeline HTML
    const stepsData = [
      { step: 1, label: 'Chờ thanh toán' },
      { step: 2, label: 'Chờ đối soát' },
      { step: 3, label: 'Đã xác nhận' },
      { step: 4, label: 'Đang chuẩn bị' },
      { step: 5, label: 'Đang giao' },
      { step: 6, label: 'Hoàn tất' }
    ];

    const timelineHtml = isCancelled ? `
      <div style="background-color: var(--color-error-bg); color: var(--color-error); padding: var(--space-4); border-radius: var(--radius-md); text-align: center; margin: var(--space-6) 0; font-weight: 600;">
        ❌ Đơn hàng này đã kết thúc với trạng thái: ${statusMeta.label}
      </div>
    ` : `
      <div class="timeline">
        ${stepsData.map(s => {
          let stateClass = '';
          if (s.step < currentStep) stateClass = 'completed';
          else if (s.step === currentStep) stateClass = 'active';
          return `
            <div class="timeline-step ${stateClass}">
              <div class="step-node">${s.step < currentStep ? '✓' : s.step}</div>
              <div class="step-label">${s.label}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    resultContainer.innerHTML = `
      <div style="background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-xl); padding: var(--space-6); box-shadow: var(--shadow-md); margin-top: var(--space-6);">
        <!-- Tiêu đề & Trạng thái -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: var(--space-3); border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-4);">
          <div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); text-transform: uppercase;">MÃ ĐƠN HÀNG</div>
            <h2 style="color: var(--color-primary); margin-bottom: 4px;">${escapeHtml(order.order_code)}</h2>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">Ngày đặt: ${formatDate(order.created_at)}</div>
          </div>
          <div style="text-align: right;">
            <span class="badge ${statusMeta.class}" style="font-size: var(--font-size-sm); padding: 6px 14px;">
              ${statusMeta.label}
            </span>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 4px;">
              Thanh toán: <strong>${order.payment_status === 'paid' ? 'Đã nhận tiền' : 'Chưa nhận tiền'}</strong>
            </div>
          </div>
        </div>

        <!-- Tiến độ Timeline -->
        ${timelineHtml}

        <!-- Thông tin giao hàng -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin: var(--space-6) 0; background-color: var(--color-bg); padding: var(--space-4); border-radius: var(--radius-lg);">
          <div>
            <h4 style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: 6px;">NGƯỜI NHẬN</h4>
            <div style="font-weight: 600; color: var(--color-text-main);">${escapeHtml(order.customer_name)}</div>
            <div style="color: var(--color-text-muted); font-size: var(--font-size-sm);">Số điện thoại: ${escapeHtml(order.phone_masked || order.phone)}</div>
          </div>
          <div>
            <h4 style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-bottom: 6px;">ĐỊA CHỈ GIAO HÀNG</h4>
            <div style="color: var(--color-text-main); font-size: var(--font-size-sm); line-height: 1.5;">${escapeHtml(order.shipping_address)}</div>
          </div>
        </div>

        <!-- Danh sách mặt hàng Snapshot -->
        <h4 style="margin-bottom: var(--space-3);">Chi tiết món đã đặt</h4>
        <div class="data-table-wrap" style="margin-bottom: var(--space-6);">
          <table class="data-table">
            <thead>
              <tr>
                <th>Tên sản phẩm</th>
                <th style="text-align: center;">Số lượng</th>
                <th style="text-align: right;">Đơn giá</th>
                <th style="text-align: right;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(item => `
                <tr>
                  <td style="font-weight: 500;">${escapeHtml(item.product_name)}</td>
                  <td style="text-align: center;">${item.quantity}</td>
                  <td style="text-align: right;">${formatVND(item.unit_price_vnd)}</td>
                  <td style="text-align: right; font-weight: 600; color: var(--color-primary);">${formatVND(item.line_total_vnd)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="text-align: right; font-weight: bold; border-top: 2px solid var(--color-border);">TỔNG CỘNG:</td>
                <td style="text-align: right; font-weight: bold; font-size: var(--font-size-lg); color: var(--color-primary); border-top: 2px solid var(--color-border);">${formatVND(order.total_vnd)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        ${order.payment_status !== 'paid' && !isCancelled ? `
          <div style="text-align: center; border-top: 1px solid var(--color-border); padding-top: var(--space-4);">
            <a href="payment.html?order=${encodeURIComponent(order.order_code)}" class="btn btn-primary">
              Quét mã QR để thanh toán đơn này
            </a>
          </div>
        ` : ''}
      </div>
    `;
  }
}
