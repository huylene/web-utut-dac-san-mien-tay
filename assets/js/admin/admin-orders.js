/**
 * Admin Orders Module — Út Út (utut.vn)
 * Quản lý đơn hàng, tra cứu đa tiêu chí, xem snapshot, đối soát ngân hàng & in phiếu gửi hàng
 * Tuân thủ 05-FEATURE-SPECS.md & 06-ADMIN-AND-SECURITY.md
 */

import { DataService } from '../supabase-client.js';
import { formatVND, escapeHtml, formatDate, showToast } from '../ui-utils.js';

const STATUS_MAP = {
  pending_payment: { label: 'Chờ thanh toán', class: 'badge-pending', icon: '⏳' },
  pending_confirmation: { label: 'Cần đối soát CK', class: 'badge-warning', icon: '⚡' },
  confirmed: { label: 'Đã xác nhận', class: 'badge-info', icon: '✓' },
  preparing: { label: 'Đang chuẩn bị', class: 'badge-info', icon: '📦' },
  shipping: { label: 'Đang giao hàng', class: 'badge-info', icon: '🚚' },
  completed: { label: 'Đã hoàn tất', class: 'badge-success', icon: '🎉' },
  cancelled: { label: 'Đã hủy', class: 'badge-error', icon: '✕' },
  payment_failed: { label: 'Thanh toán lỗi', class: 'badge-error', icon: '⚠️' }
};

const PAYMENT_STATUS_MAP = {
  paid: { label: 'Đã nhận tiền', class: 'badge-success', text: 'Đã thu tiền' },
  unpaid: { label: 'Chưa thu tiền', class: 'badge-pending', text: 'Chưa thu' },
  pending_verification: { label: 'Chờ đối soát NH', class: 'badge-warning', text: 'Chờ kiểm tra' },
  refunded: { label: 'Đã hoàn tiền', class: 'badge-error', text: 'Đã hoàn' }
};

function maskPhone(phone) {
  if (!phone) return '';
  const p = String(phone).trim();
  if (p.includes('0814286439') || p.includes('814286439')) {
    return '081428xxxx';
  }
  return p;
}

export async function initAdminOrdersPage() {
  const tbody = document.getElementById('orders-tbody');
  const searchInput = document.getElementById('order-search');
  const clearSearchBtn = document.getElementById('order-clear-search-btn');
  const dateFilter = document.getElementById('order-date-filter');
  const paymentFilter = document.getElementById('order-payment-filter');
  const clearFiltersBtn = document.getElementById('order-clear-filters-btn');
  const refreshBtn = document.getElementById('order-refresh-btn');
  const exportBtn = document.getElementById('export-orders-csv-btn');
  const orderCountText = document.getElementById('order-count-text');
  const tabsContainer = document.getElementById('order-filter-tabs');
  const modalEl = document.getElementById('order-detail-modal');

  // KPI elements
  const kpiTotalEl = document.getElementById('kpi-total-orders');
  const kpiPendingConfEl = document.getElementById('kpi-pending-confirmation');
  const kpiShippingEl = document.getElementById('kpi-shipping-orders');
  const kpiCompletedEl = document.getElementById('kpi-completed-orders');
  const kpiCompletedSubEl = document.getElementById('kpi-completed-sub');
  const cardPendingConf = document.getElementById('card-filter-pending-conf');

  let allOrders = [];
  let currentTab = 'all';
  let searchDebounceTimeout = null;

  // Lấy query search từ URL nếu có
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get('search') || '';
  if (searchInput && searchParam) {
    searchInput.value = searchParam;
    if (clearSearchBtn) clearSearchBtn.style.display = 'block';
  }

  // Khởi tạo và tải dữ liệu đơn hàng
  async function fetchOrders() {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 32px;"><div class="spinner"></div><div style="margin-top: 8px; color: var(--color-text-muted); font-size: 0.85rem;">Đang tải dữ liệu đơn hàng...</div></td></tr>`;
    try {
      allOrders = await DataService.adminGetOrders({});
      updateKpiAndBadges();
      renderFilteredOrders();
    } catch (err) {
      console.error('Lỗi tải danh sách đơn:', err);
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--color-error); padding: 24px;">
              <div>⚠️ Không thể tải danh sách đơn hàng.</div>
              <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-top: 4px;">${escapeHtml(err.message)}</div>
              <button type="button" class="btn btn-outline btn-sm" id="btn-retry-orders" style="margin-top: 10px;">Thử lại</button>
            </td>
          </tr>
        `;
        document.getElementById('btn-retry-orders')?.addEventListener('click', fetchOrders);
      }
    }
  }

  // Cập nhật số liệu KPI & badge trên các tab
  function updateKpiAndBadges() {
    const totalCount = allOrders.length;
    const pendingConfCount = allOrders.filter(o => o.order_status === 'pending_confirmation').length;
    const pendingPayCount = allOrders.filter(o => o.order_status === 'pending_payment').length;
    const processingCount = allOrders.filter(o => ['confirmed', 'preparing'].includes(o.order_status)).length;
    const shippingCount = allOrders.filter(o => o.order_status === 'shipping').length;
    const completedOrders = allOrders.filter(o => o.order_status === 'completed');
    const cancelledCount = allOrders.filter(o => o.order_status === 'cancelled').length;

    // Tổng doanh số các đơn hoàn tất
    const totalCompletedRevenue = completedOrders.reduce((sum, o) => sum + (Number(o.total_vnd) || 0), 0);

    if (kpiTotalEl) kpiTotalEl.textContent = totalCount;
    if (kpiPendingConfEl) {
      kpiPendingConfEl.textContent = pendingConfCount;
      if (pendingConfCount > 0) {
        kpiPendingConfEl.style.color = '#D97706';
      } else {
        kpiPendingConfEl.style.color = 'var(--color-text-muted)';
      }
    }
    if (kpiShippingEl) kpiShippingEl.textContent = (shippingCount + processingCount);
    if (kpiCompletedEl) kpiCompletedEl.textContent = formatVND(totalCompletedRevenue);
    if (kpiCompletedSubEl) kpiCompletedSubEl.textContent = `${completedOrders.length} đơn hoàn thành`;

    // Cập nhật badges trên các Tab
    const setBadge = (id, count) => {
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    };
    setBadge('tab-badge-all', totalCount);
    setBadge('tab-badge-pending-conf', pendingConfCount);
    setBadge('tab-badge-pending-pay', pendingPayCount);
    setBadge('tab-badge-processing', processingCount);
    setBadge('tab-badge-shipping', shippingCount);
    setBadge('tab-badge-completed', completedOrders.length);
    setBadge('tab-badge-cancelled', cancelledCount);
  }

  // Lọc danh sách đơn dựa trên Tab, Search, Date, Payment
  function getFilteredOrders() {
    const search = (searchInput?.value || '').trim().toLowerCase();
    const dateVal = dateFilter?.value || 'all';
    const payVal = paymentFilter?.value || 'all';

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    return allOrders.filter(order => {
      // 1. Lọc theo Tab
      if (currentTab === 'pending_confirmation' && order.order_status !== 'pending_confirmation') return false;
      if (currentTab === 'pending_payment' && order.order_status !== 'pending_payment') return false;
      if (currentTab === 'processing' && !['confirmed', 'preparing'].includes(order.order_status)) return false;
      if (currentTab === 'shipping' && order.order_status !== 'shipping') return false;
      if (currentTab === 'completed' && order.order_status !== 'completed') return false;
      if (currentTab === 'cancelled' && order.order_status !== 'cancelled') return false;

      // 2. Lọc theo Thời gian
      if (dateVal !== 'all' && order.created_at) {
        const orderDate = new Date(order.created_at);
        if (dateVal === 'today' && !order.created_at.startsWith(todayStr)) return false;
        if (dateVal === '7days' && orderDate < sevenDaysAgo) return false;
        if (dateVal === 'month' && orderDate < firstDayOfMonth) return false;
      }

      // 3. Lọc theo Trạng thái thanh toán
      if (payVal !== 'all') {
        if (payVal === 'paid' && order.payment_status !== 'paid') return false;
        if (payVal === 'unpaid' && order.payment_status !== 'unpaid') return false;
        if (payVal === 'pending_verification' && order.payment_status !== 'pending_verification') return false;
      }

      // 4. Lọc theo Từ khóa tìm kiếm (Mã đơn, Tên khách, SĐT, Địa chỉ, Món hàng)
      if (search) {
        const code = (order.order_code || '').toLowerCase();
        const name = (order.customer_name || '').toLowerCase();
        const phone = (order.phone || '').toLowerCase();
        const address = (order.shipping_address || '').toLowerCase();
        const note = (order.customer_note || '').toLowerCase();

        const items = order.items || order.order_items || [];
        const itemNames = items.map(it => (it.product_name_snapshot || it.product_name || '').toLowerCase()).join(' ');

        const match = code.includes(search) ||
          name.includes(search) ||
          phone.includes(search) ||
          address.includes(search) ||
          note.includes(search) ||
          itemNames.includes(search);

        if (!match) return false;
      }

      return true;
    });
  }

  // Render bảng danh sách đơn
  function renderFilteredOrders() {
    if (!tbody) return;

    const filtered = getFilteredOrders();

    // Cập nhật text số lượng
    if (orderCountText) {
      orderCountText.textContent = `Hiển thị ${filtered.length}/${allOrders.length} đơn hàng`;
    }

    // Hiển thị nút xóa bộ lọc nếu đang áp dụng
    const hasFilter = (searchInput && searchInput.value.trim() !== '') ||
      (dateFilter && dateFilter.value !== 'all') ||
      (paymentFilter && paymentFilter.value !== 'all') ||
      currentTab !== 'all';

    if (clearFiltersBtn) {
      clearFiltersBtn.style.display = hasFilter ? 'inline-block' : 'none';
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 48px; color: var(--color-text-muted);">
            <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
            <div style="font-weight: 500;">Không tìm thấy đơn hàng nào phù hợp với bộ lọc.</div>
            <div style="font-size: 0.85rem; margin-top: 4px;">Thử đổi từ khóa tìm kiếm hoặc chọn "Tất cả" trạng thái.</div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(order => {
      const statusMeta = STATUS_MAP[order.order_status] || { label: order.order_status, class: 'badge-info', icon: '📦' };
      const payMeta = PAYMENT_STATUS_MAP[order.payment_status] || { label: order.payment_status, class: 'badge-pending', text: 'Chưa thu' };
      const isPaid = order.payment_status === 'paid';
      const isPendingConf = order.order_status === 'pending_confirmation';
      const items = order.items || order.order_items || [];

      const safePhone = maskPhone(order.phone);

      return `
        <tr style="${isPendingConf ? 'background-color: #FFFDF7;' : ''}">
          <!-- Cột 1: Mã đơn & Ngày đặt -->
          <td>
            <div style="display: flex; align-items: center; gap: 4px;">
              <strong style="color: var(--color-primary); font-family: monospace; font-size: 0.95rem;">#${escapeHtml(order.order_code)}</strong>
              <button type="button" class="copy-btn-inline copy-action" data-copy="${escapeHtml(order.order_code)}" title="Sao chép mã đơn">📋</button>
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">
              ${formatDate(order.created_at)}
            </div>
          </td>

          <!-- Cột 2: Khách hàng & SĐT -->
          <td>
            <div style="font-weight: 600; color: var(--color-text-main);">${escapeHtml(order.customer_name)}</div>
            <div style="display: flex; align-items: center; gap: 4px; font-size: var(--font-size-xs); margin-top: 2px;">
              <a href="tel:${escapeHtml(safePhone)}" style="color: var(--color-primary); font-weight: 500; text-decoration: none;" title="Gọi điện">
                📞 ${escapeHtml(safePhone)}
              </a>
              <button type="button" class="copy-btn-inline copy-action" data-copy="${escapeHtml(safePhone)}" title="Sao chép số điện thoại">📋</button>
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;" title="${escapeHtml(order.shipping_address)}">
              📍 ${escapeHtml(order.shipping_address)}
            </div>
          </td>

          <!-- Cột 3: Sản phẩm đã đặt (Snapshot chips) -->
          <td>
            <div style="display: flex; flex-direction: column; gap: 3px; max-width: 260px;">
              ${items.slice(0, 2).map(item => `
                <span class="order-item-chip" title="${escapeHtml(item.product_name_snapshot || item.product_name || 'Đặc sản')} (${item.quantity}x ${formatVND(item.unit_price_vnd)})">
                  <strong>${item.quantity}x</strong> ${escapeHtml(item.product_name_snapshot || item.product_name || 'Đặc sản')}
                </span>
              `).join('')}
              ${items.length > 2 ? `<small style="color: var(--color-text-muted); font-size: 0.75rem;">+${items.length - 2} sản phẩm khác...</small>` : ''}
              ${items.length === 0 ? `<small style="color: var(--color-text-muted); font-style: italic;">Chưa có snapshot</small>` : ''}
            </div>
          </td>

          <!-- Cột 4: Tổng thanh toán & Phương thức -->
          <td>
            <div style="font-weight: 700; color: var(--color-primary); font-size: 0.95rem;">
              ${formatVND(order.total_vnd)}
            </div>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); margin-top: 2px;">
              ${order.payment_method === 'cod' ? '💵 COD' : '🏦 Chuyển khoản QR'}
            </div>
          </td>

          <!-- Cột 5: Tiến độ đơn & Thanh toán -->
          <td>
            <div style="margin-bottom: 4px;">
              <span class="badge ${statusMeta.class}">
                ${statusMeta.icon} ${statusMeta.label}
              </span>
            </div>
            <div>
              <span class="badge ${isPaid ? 'badge-success' : (isPendingConf ? 'badge-warning' : payMeta.class)}">
                ${isPaid ? 'Đã thu tiền' : (isPendingConf ? '⚡ Chờ đối soát' : payMeta.text)}
              </span>
            </div>
          </td>

          <!-- Cột 6: Thao tác -->
          <td style="text-align: center;">
            <div style="display: flex; flex-direction: column; gap: 4px; align-items: stretch;">
              <button type="button" class="btn btn-outline btn-sm view-order-btn" data-id="${order.id || order.order_code}">
                Chi tiết / Sửa
              </button>
              ${isPendingConf ? `
                <button type="button" class="btn btn-sm quick-confirm-btn" data-id="${order.id || order.order_code}" style="background-color: #059669; color: white; border: none; font-size: 0.75rem; padding: 3px 6px; border-radius: var(--radius-sm);" title="Xác nhận ngay khách đã chuyển tiền đủ">
                  ✓ Đã nhận tiền
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Gắn sự kiện nút xem chi tiết
    tbody.querySelectorAll('.view-order-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const order = allOrders.find(o => o.id === id || o.order_code === id);
        if (order) openOrderDetailModal(order);
      });
    });

    // Gắn sự kiện xác nhận nhanh đối soát tiền
    tbody.querySelectorAll('.quick-confirm-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const order = allOrders.find(o => o.id === id || o.order_code === id);
        if (!order) return;

        if (!confirm(`Xác nhận khách hàng #${order.order_code} (${order.customer_name}) đã chuyển tiền thành công ${formatVND(order.total_vnd)}?`)) {
          return;
        }

        try {
          btn.disabled = true;
          btn.textContent = 'Đang lưu...';
          await DataService.adminUpdateOrderStatus(order.id || order.order_code, {
            orderStatus: 'confirmed',
            paymentStatus: 'paid'
          });
          showToast(`Đã duyệt thanh toán thành công cho đơn #${order.order_code}`, 'success');
          await fetchOrders();
        } catch (err) {
          showToast('Lỗi: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = '✓ Đã nhận tiền';
        }
      });
    });

    // Gắn sự kiện sao chép nhanh
    tbody.querySelectorAll('.copy-action').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const text = btn.getAttribute('data-copy');
        copyToClipboard(text);
      });
    });
  }

  // Hàm copy vào clipboard kèm thông báo
  function copyToClipboard(text) {
    if (!text) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(`Đã sao chép: "${text}"`, 'success');
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast(`Đã sao chép: "${text}"`, 'success');
    } catch {
      showToast('Không thể sao chép tự động', 'warning');
    }
    document.body.removeChild(ta);
  }

  // Mở Modal chi tiết đơn hàng đầy đủ
  function openOrderDetailModal(order) {
    if (!modalEl) return;

    const modalBody = modalEl.querySelector('.modal-body');
    const modalTitle = modalEl.querySelector('.modal-title');
    if (modalTitle) {
      modalTitle.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>Chi tiết đơn hàng <strong style="color: var(--color-primary); font-family: monospace;">#${escapeHtml(order.order_code)}</strong></span>
          <button type="button" class="copy-btn-inline modal-copy-code" data-copy="${escapeHtml(order.order_code)}" title="Sao chép mã đơn">📋</button>
        </div>
      `;
      modalTitle.querySelector('.modal-copy-code')?.addEventListener('click', () => copyToClipboard(order.order_code));
    }

    const items = order.items || order.order_items || [];
    const isPendingConf = order.order_status === 'pending_confirmation';
    const subtotal = items.reduce((sum, it) => sum + (Number(it.line_total_vnd) || 0), 0);
    const shippingFee = (Number(order.total_vnd) || 0) - subtotal > 0 ? (Number(order.total_vnd) || 0) - subtotal : 0;

    modalBody.innerHTML = `
      <!-- Banner cảnh báo đối soát nhanh nếu khách đã báo CK -->
      ${isPendingConf ? `
        <div class="order-quick-banner">
          <div class="banner-text">
            ⚡ <strong>Khách đã bấm "Tôi đã chuyển khoản"!</strong> Vui lòng kiểm tra tài khoản ngân hàng nhận tiền ${formatVND(order.total_vnd)}.
          </div>
          <button type="button" class="btn btn-sm btn-primary modal-action-confirm-paid" style="background-color: #059669; border-color: #059669; color: #fff; font-weight: 600;">
            ✓ Xác nhận đã nhận tiền ngay
          </button>
        </div>
      ` : ''}

      <!-- Thẻ thông tin khách hàng & Địa chỉ giao hàng (2 cột rõ ràng) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4); background-color: var(--color-bg); padding: var(--space-4); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
        <div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">👤 Người Nhận & Liên Hệ</div>
          <div style="font-size: 1.05rem; font-weight: 700; color: var(--color-text-main);">${escapeHtml(order.customer_name)}</div>
          <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
            <a href="tel:${escapeHtml(maskPhone(order.phone))}" style="color: var(--color-primary); font-weight: 600; text-decoration: none;">
              📞 ${escapeHtml(maskPhone(order.phone))}
            </a>
            <button type="button" class="copy-btn-inline modal-copy-phone" data-copy="${escapeHtml(maskPhone(order.phone))}" title="Sao chép SĐT">📋</button>
          </div>
          <div style="font-size: var(--font-size-sm); color: var(--color-text-muted); margin-top: 4px;">
            ✉️ Email: ${escapeHtml(order.email || 'Không có')}
          </div>
        </div>

        <div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-weight: 600; text-transform: uppercase; margin-bottom: 6px;">📍 Địa Chỉ Giao Hàng & Ghi Chú</div>
          <div style="font-size: var(--font-size-sm); line-height: 1.4; color: var(--color-text-main);">
            ${escapeHtml(order.shipping_address)}
            <button type="button" class="copy-btn-inline modal-copy-address" data-copy="${escapeHtml(order.shipping_address)}" title="Sao chép địa chỉ">📋</button>
          </div>
          <div style="margin-top: 6px; font-size: var(--font-size-xs); color: #B45309; background: #FFFBEB; padding: 4px 8px; border-radius: 4px; border: 1px dashed #FDE68A;">
            📝 Ghi chú khách: <strong>${escapeHtml(order.customer_note || 'Không có ghi chú')}</strong>
          </div>
          <div style="margin-top: 4px; font-size: var(--font-size-xs); color: var(--color-text-muted);">
            💳 Hình thức: <strong>${order.payment_method === 'cod' ? 'Thanh toán tiền mặt khi nhận hàng (COD)' : 'Chuyển khoản VietQR ngân hàng'}</strong>
          </div>
        </div>
      </div>

      <!-- Danh Sách Sản Phẩm Snapshot Đã Đặt -->
      <div style="margin-bottom: var(--space-4);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
          <h4 style="margin: 0; font-size: var(--font-size-sm); text-transform: uppercase; color: var(--color-text-muted);">
            📦 Danh Sách Đặc Sản Trong Đơn (${items.length} món)
          </h4>
          <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">
            Đặt lúc: ${formatDate(order.created_at)}
          </span>
        </div>

        <div class="data-table-wrap" style="max-height: 260px; overflow-y: auto;">
          <table class="data-table" style="font-size: var(--font-size-sm);">
            <thead>
              <tr>
                <th style="width: 50px;">Ảnh</th>
                <th>Tên đặc sản (Snapshot)</th>
                <th style="text-align: center; width: 80px;">Số lượng</th>
                <th style="text-align: right; width: 110px;">Đơn giá</th>
                <th style="text-align: right; width: 130px;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${items.length === 0 ? `
                <tr>
                  <td colspan="5" style="text-align: center; color: var(--color-text-muted); padding: 16px;">
                    Chưa có chi tiết sản phẩm.
                  </td>
                </tr>
              ` : items.map(item => {
                const img = item.image_url_snapshot || item.image_url || '../assets/images/logo-utut.png';
                const name = item.product_name_snapshot || item.product_name || 'Đặc sản miền Tây';
                const qty = item.quantity || 1;
                const unitPrice = item.unit_price_vnd || 0;
                const lineTotal = item.line_total_vnd || (qty * unitPrice);

                return `
                  <tr>
                    <td>
                      <img src="${escapeHtml(img)}" alt="${escapeHtml(name)}" class="order-item-thumb" onerror="this.src='../assets/images/logo-utut.png';" />
                    </td>
                    <td>
                      <div style="font-weight: 600; color: var(--color-text-main);">${escapeHtml(name)}</div>
                      ${item.weight_snapshot ? `<small style="color: var(--color-text-muted);">Quy cách: ${escapeHtml(item.weight_snapshot)}</small>` : ''}
                    </td>
                    <td style="text-align: center; font-weight: bold; font-size: 1rem;">
                      ${qty}
                    </td>
                    <td style="text-align: right; color: var(--color-text-muted);">
                      ${formatVND(unitPrice)}
                    </td>
                    <td style="text-align: right; font-weight: bold; color: var(--color-primary);">
                      ${formatVND(lineTotal)}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="4" style="text-align: right; font-size: var(--font-size-xs); color: var(--color-text-muted);">Tiền hàng:</td>
                <td style="text-align: right; font-weight: 600;">${formatVND(subtotal > 0 ? subtotal : order.total_vnd)}</td>
              </tr>
              ${shippingFee > 0 ? `
                <tr>
                  <td colspan="4" style="text-align: right; font-size: var(--font-size-xs); color: var(--color-text-muted);">Phí vận chuyển dự kiến:</td>
                  <td style="text-align: right; font-weight: 600;">${formatVND(shippingFee)}</td>
                </tr>
              ` : ''}
              <tr style="background-color: #F8F6F2;">
                <td colspan="4" style="text-align: right; font-weight: bold; font-size: 1rem; color: var(--color-text-main);">TỔNG CỘNG THANH TOÁN:</td>
                <td style="text-align: right; font-weight: bold; font-size: 1.15rem; color: var(--color-primary);">${formatVND(order.total_vnd)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Điều Chỉnh Tiến Độ Đơn & Trạng Thái Thanh Toán -->
      <div style="border-top: 1px solid var(--color-border); padding-top: var(--space-4);">
        <h4 style="margin-bottom: var(--space-3); font-size: var(--font-size-sm); text-transform: uppercase; color: var(--color-text-muted);">
          ⚙️ Cập Nhật Tiến Độ & Đối Soát Thanh Toán
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4);">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 600;">Trạng thái tiến độ đơn</label>
            <select id="modal-order-status" class="form-control">
              <option value="pending_payment" ${order.order_status === 'pending_payment' ? 'selected' : ''}>⏳ Chờ thanh toán</option>
              <option value="pending_confirmation" ${order.order_status === 'pending_confirmation' ? 'selected' : ''}>⚡ Khách đã báo CK (Cần đối soát)</option>
              <option value="confirmed" ${order.order_status === 'confirmed' ? 'selected' : ''}>✓ Đã xác nhận đơn hàng</option>
              <option value="preparing" ${order.order_status === 'preparing' ? 'selected' : ''}>📦 Đang chuẩn bị đặc sản</option>
              <option value="shipping" ${order.order_status === 'shipping' ? 'selected' : ''}>🚚 Đang giao hàng cho shipper</option>
              <option value="completed" ${order.order_status === 'completed' ? 'selected' : ''}>🎉 Hoàn tất (Đã giao thành công)</option>
              <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>✕ Hủy đơn hàng</option>
            </select>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-weight: 600;">Trạng thái nhận tiền (Tài khoản NH)</label>
            <select id="modal-payment-status" class="form-control">
              <option value="unpaid" ${order.payment_status === 'unpaid' ? 'selected' : ''}>Chưa thu tiền (Unpaid)</option>
              <option value="pending_verification" ${order.payment_status === 'pending_verification' ? 'selected' : ''}>Chờ kiểm tra tài khoản ngân hàng</option>
              <option value="paid" ${order.payment_status === 'paid' ? 'selected' : ''}>✓ Đã nhận đủ tiền (Paid)</option>
              <option value="refunded" ${order.payment_status === 'refunded' ? 'selected' : ''}>✕ Đã hoàn tiền (Refunded)</option>
            </select>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--space-2);">
          <button type="button" class="btn btn-outline" id="modal-print-slip-btn" title="In phiếu đóng gói và giao hàng">
            🖨️ In phiếu gửi hàng
          </button>
          <div style="display: flex; gap: var(--space-2);">
            <button type="button" class="btn btn-outline" id="modal-close-btn">Đóng</button>
            <button type="button" class="btn btn-primary" id="modal-save-btn">💾 Lưu thay đổi</button>
          </div>
        </div>
      </div>
    `;

    modalEl.classList.add('open');

    // Nút sao chép trong modal
    modalBody.querySelector('.modal-copy-phone')?.addEventListener('click', () => copyToClipboard(maskPhone(order.phone)));
    modalBody.querySelector('.modal-copy-address')?.addEventListener('click', () => copyToClipboard(order.shipping_address));

    // Nút đóng
    modalEl.querySelector('.modal-close')?.addEventListener('click', () => modalEl.classList.remove('open'));
    document.getElementById('modal-close-btn')?.addEventListener('click', () => modalEl.classList.remove('open'));

    // Nút in phiếu gửi hàng
    document.getElementById('modal-print-slip-btn')?.addEventListener('click', () => {
      printOrderSlip(order);
    });

    // Nút xác nhận nhanh trong banner
    modalBody.querySelector('.modal-action-confirm-paid')?.addEventListener('click', async () => {
      try {
        await DataService.adminUpdateOrderStatus(order.id || order.order_code, {
          orderStatus: 'confirmed',
          paymentStatus: 'paid'
        });
        showToast(`Đã xác nhận tiền thành công cho đơn #${order.order_code}`, 'success');
        modalEl.classList.remove('open');
        await fetchOrders();
      } catch (err) {
        showToast('Lỗi: ' + err.message, 'error');
      }
    });

    // Nút lưu thay đổi trạng thái
    document.getElementById('modal-save-btn')?.addEventListener('click', async () => {
      const newOrderStatus = document.getElementById('modal-order-status').value;
      const newPaymentStatus = document.getElementById('modal-payment-status').value;

      try {
        await DataService.adminUpdateOrderStatus(order.id || order.order_code, {
          orderStatus: newOrderStatus,
          paymentStatus: newPaymentStatus
        });
        showToast('Cập nhật trạng thái đơn thành công!', 'success');
        modalEl.classList.remove('open');
        await fetchOrders();
      } catch (err) {
        showToast('Lỗi khi lưu trạng thái: ' + err.message, 'error');
      }
    });
  }

  // Tạo và in phiếu gửi hàng
  function printOrderSlip(order) {
    const printArea = document.getElementById('order-print-slip');
    if (!printArea) return;

    const items = order.items || order.order_items || [];
    printArea.innerHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px dashed #333;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h2 style="margin: 0; font-size: 20px; text-transform: uppercase;">ÚT ÚT — ĐẶC SẢN MIỀN TÂY</h2>
            <div style="font-size: 12px; margin-top: 4px;">Website: utut.vn — Hotline: 0814 286 4xx</div>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; font-size: 16px; font-family: monospace;">#${escapeHtml(order.order_code)}</div>
            <div style="font-size: 12px;">Ngày: ${formatDate(order.created_at)}</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 16px; font-size: 13px;">
          <div style="flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 4px;">
            <strong style="text-transform: uppercase; font-size: 11px; color: #666;">BÊN GỬI:</strong>
            <div style="font-weight: bold; margin-top: 4px;">ÚT ÚT ĐẶC SẢN MIỀN TÂY</div>
            <div>Địa chỉ: Cồn Sơn, Bình Thủy, Cần Thơ</div>
            <div>Hotline: 0814 286 4xx</div>
          </div>
          <div style="flex: 1; border: 1px solid #333; padding: 10px; border-radius: 4px; background: #fafafa;">
            <strong style="text-transform: uppercase; font-size: 11px; color: #666;">BÊN NHẬN (KHÁCH HÀNG):</strong>
            <div style="font-weight: bold; font-size: 15px; margin-top: 4px;">${escapeHtml(order.customer_name)}</div>
            <div style="font-weight: bold; font-size: 14px; margin-top: 2px;">SĐT: ${escapeHtml(maskPhone(order.phone))}</div>
            <div style="margin-top: 4px;">Đ/c: ${escapeHtml(order.shipping_address)}</div>
            ${order.customer_note ? `<div style="margin-top: 4px; font-style: italic;">Ghi chú: ${escapeHtml(order.customer_note)}</div>` : ''}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
          <thead>
            <tr style="background: #eee;">
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center; width: 40px;">STT</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: left;">Tên đặc sản</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center; width: 50px;">SL</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: right; width: 100px;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((it, idx) => `
              <tr>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #ddd; padding: 6px;">${escapeHtml(it.product_name_snapshot || it.product_name || 'Đặc sản')}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${it.quantity}</td>
                <td style="border: 1px solid #ddd; padding: 6px; text-align: right;">${formatVND(it.line_total_vnd || (it.quantity * it.unit_price_vnd))}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">TỔNG TIỀN THU:</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold; font-size: 15px;">
                ${order.payment_status === 'paid' ? '0đ (ĐÃ THANH TOÁN)' : formatVND(order.total_vnd)}
              </td>
            </tr>
          </tfoot>
        </table>

        <div style="display: flex; justify-content: space-between; text-align: center; font-size: 12px; margin-top: 30px;">
          <div>
            <div>Người gửi hàng</div>
            <div style="margin-top: 40px; font-style: italic;">(Ký và ghi rõ họ tên)</div>
          </div>
          <div>
            <div>Người nhận hàng</div>
            <div style="margin-top: 40px; font-style: italic;">(Đã kiểm tra đủ hàng)</div>
          </div>
        </div>
      </div>
    `;

    window.print();
  }

  // Xử lý chuyển tab
  tabsContainer?.querySelectorAll('.order-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tabsContainer.querySelectorAll('.order-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.getAttribute('data-tab') || 'all';
      renderFilteredOrders();
    });
  });

  // Xử lý click vào KPI card "Cần đối soát"
  cardPendingConf?.addEventListener('click', () => {
    tabsContainer?.querySelectorAll('.order-tab-btn').forEach(b => {
      if (b.getAttribute('data-tab') === 'pending_confirmation') {
        b.click();
      }
    });
  });

  // Tìm kiếm tức thì với debounce 200ms
  searchInput?.addEventListener('input', () => {
    const val = searchInput.value.trim();
    if (clearSearchBtn) {
      clearSearchBtn.style.display = val ? 'block' : 'none';
    }
    clearTimeout(searchDebounceTimeout);
    searchDebounceTimeout = setTimeout(() => {
      renderFilteredOrders();
    }, 200);
  });

  // Nút xóa tìm kiếm
  clearSearchBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    renderFilteredOrders();
  });

  // Bộ lọc ngày & thanh toán
  dateFilter?.addEventListener('change', () => renderFilteredOrders());
  paymentFilter?.addEventListener('change', () => renderFilteredOrders());

  // Nút xóa tất cả bộ lọc
  clearFiltersBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    if (dateFilter) dateFilter.value = 'all';
    if (paymentFilter) paymentFilter.value = 'all';
    tabsContainer?.querySelector('.order-tab-btn[data-tab="all"]')?.click();
  });

  // Nút refresh
  refreshBtn?.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '🔄 Đang tải...';
    await fetchOrders();
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '🔄 Tải lại';
    showToast('Đã làm mới danh sách đơn hàng', 'success');
  });

  // Xuất CSV đơn hàng
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const ordersToExport = getFilteredOrders();
      if (ordersToExport.length === 0) {
        showToast('Không có dữ liệu đơn hàng để xuất CSV', 'warning');
        return;
      }

      let csv = 'Mã đơn,Khách hàng,Số điện thoại,Địa chỉ,Món hàng,Tổng tiền VND,Trạng thái đơn,Trạng thái thanh toán,Ngày đặt\n';
      ordersToExport.forEach(o => {
        const cleanName = `"${(o.customer_name || '').replace(/"/g, '""')}"`;
        const cleanAddr = `"${(o.shipping_address || '').replace(/"/g, '""')}"`;
        const items = o.items || o.order_items || [];
        const cleanItems = `"${items.map(it => `${it.quantity}x ${it.product_name_snapshot || it.product_name || ''}`).join('; ').replace(/"/g, '""')}"`;

        const safePhone = maskPhone(o.phone);
        csv += `${o.order_code},${cleanName},'${safePhone},${cleanAddr},${cleanItems},${o.total_vnd},${o.order_status},${o.payment_status},${o.created_at}\n`;
      });

      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `don-hang-ut-ut-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Đã xuất ${ordersToExport.length} đơn hàng ra CSV thành công!`, 'success');
    });
  }

  // Khởi động tải dữ liệu
  await fetchOrders();
}
