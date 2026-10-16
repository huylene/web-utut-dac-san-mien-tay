/**
 * Admin Dashboard — Út Út (utut.vn)
 * Thống kê doanh thu, đơn hàng, phân tích theo ngày, tháng, khu vực và sản phẩm
 * Tuân thủ 05-FEATURE-SPECS.md & 06-ADMIN-AND-SECURITY.md
 */

import { DataService } from '../supabase-client.js';
import { formatVND, escapeHtml, formatDate } from '../ui-utils.js';

// Rút gọn định dạng tiền tệ cho biểu đồ cột (ví dụ: 1.2M, 450K)
function formatCompactVND(amount) {
  const num = Number(amount) || 0;
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace('.0', '') + 'M';
  }
  if (num >= 1000) {
    return Math.round(num / 1000) + 'K';
  }
  return num + 'đ';
}

// Phân tích tỉnh/thành từ địa chỉ giao hàng
function extractCityOrProvince(address) {
  if (!address) return 'Chưa xác định';
  const addr = address.toLowerCase();

  if (addr.includes('hồ chí minh') || addr.includes('tp.hcm') || addr.includes('tphcm') || addr.includes('sài gòn') || addr.includes('thủ đức')) {
    return 'TP. Hồ Chí Minh';
  }
  if (addr.includes('hà nội') || addr.includes('hanoi')) {
    return 'Hà Nội';
  }
  if (addr.includes('cần thơ')) {
    return 'Cần Thơ';
  }
  if (addr.includes('long an')) {
    return 'Long An';
  }
  if (addr.includes('vũng tàu') || addr.includes('bà rịa')) {
    return 'Bà Rịa - Vũng Tàu';
  }
  if (addr.includes('bình dương')) {
    return 'Bình Dương';
  }
  if (addr.includes('đà nẵng')) {
    return 'Đà Nẵng';
  }
  if (addr.includes('đồng tháp')) {
    return 'Đồng Tháp';
  }
  if (addr.includes('sóc trăng')) {
    return 'Sóc Trăng';
  }
  if (addr.includes('cà mau')) {
    return 'Cà Mau';
  }
  if (addr.includes('tiền giang')) {
    return 'Tiền Giang';
  }
  if (addr.includes('bến tre')) {
    return 'Bến Tre';
  }
  if (addr.includes('an giang')) {
    return 'An Giang';
  }

  // Lấy cụm từ cuối cùng sau dấu phẩy nếu không khớp danh sách trên
  const parts = address.split(',');
  if (parts.length > 1) {
    return parts[parts.length - 1].trim();
  }
  return 'Tỉnh thành khác';
}

// Phân loại khu vực địa lý lớn
export function detectMacroRegion(address) {
  if (!address) return { key: 'other', name: 'Khu vực khác', icon: '📍', color: '#9CA3AF' };
  const addr = address.toLowerCase();

  if (addr.includes('hồ chí minh') || addr.includes('tp.hcm') || addr.includes('tphcm') || addr.includes('sài gòn') || addr.includes('thủ đức')) {
    return { key: 'hcm', name: 'TP. Hồ Chí Minh', icon: '🏙️', color: 'var(--color-primary, #D35400)' };
  }
  if (addr.includes('hà nội') || addr.includes('hải phòng') || addr.includes('bắc') || addr.includes('quảng ninh')) {
    return { key: 'north', name: 'Hà Nội & Miền Bắc', icon: '🏛️', color: 'var(--color-secondary, #27AE60)' };
  }
  if (
    addr.includes('cần thơ') || addr.includes('long an') || addr.includes('tiền giang') || 
    addr.includes('bến tre') || addr.includes('đồng tháp') || addr.includes('an giang') || 
    addr.includes('kiên giang') || addr.includes('cà mau') || addr.includes('sóc trăng') || 
    addr.includes('vĩnh long') || addr.includes('trà vinh') || addr.includes('hậu giang') || addr.includes('bạc liêu')
  ) {
    return { key: 'mekong', name: 'Cần Thơ & Miền Tây (ĐBSCL)', icon: '🌾', color: 'var(--color-accent, #D97706)' };
  }
  if (addr.includes('bình dương') || addr.includes('đồng nai') || addr.includes('vũng tàu') || addr.includes('tây ninh') || addr.includes('bình phước')) {
    return { key: 'southeast', name: 'Đông Nam Bộ (Bình Dương, Vũng Tàu...)', icon: '🏭', color: '#2563EB' };
  }
  if (addr.includes('đà nẵng') || addr.includes('huế') || addr.includes('quảng') || addr.includes('nha trang') || addr.includes('khánh hòa') || addr.includes('bình định')) {
    return { key: 'central', name: 'Đà Nẵng & Miền Trung', icon: '🏖️', color: '#059669' };
  }

  return { key: 'other', name: 'Các tỉnh thành khác', icon: '📍', color: '#6B7280' };
}

export async function initAdminDashboard() {
  // Elements
  const periodLabel = document.getElementById('dashboard-period-label');
  const timeFilterGroup = document.getElementById('time-filter-group');

  const statRevenue = document.getElementById('stat-revenue');
  const statRevenueSub = document.getElementById('stat-revenue-sub');
  const statOrdersCount = document.getElementById('stat-orders-count');
  const statOrdersSub = document.getElementById('stat-orders-sub');
  const statPendingCount = document.getElementById('stat-pending-count');
  const statAov = document.getElementById('stat-aov');

  const dailySalesChart = document.getElementById('daily-sales-chart');
  const dailySalesSummary = document.getElementById('daily-sales-summary');
  const regionBreakdownList = document.getElementById('region-breakdown-list');
  const topProductsTbody = document.getElementById('top-products-tbody');
  const monthlyComparisonBox = document.getElementById('monthly-comparison-box');
  const recentOrdersTbody = document.getElementById('recent-orders-tbody');

  let allOrders = [];
  let allProducts = [];
  let currentPeriod = 'all';

  try {
    const [orders, products] = await Promise.all([
      DataService.adminGetOrders(),
      DataService.adminGetProducts()
    ]);
    allOrders = orders || [];
    allProducts = products || [];

    // Gắn sự kiện chuyển filter
    if (timeFilterGroup) {
      const buttons = timeFilterGroup.querySelectorAll('.time-filter-btn');
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          buttons.forEach(b => {
            b.classList.remove('btn-primary');
            b.classList.add('btn-outline');
          });
          btn.classList.remove('btn-outline');
          btn.classList.add('btn-primary');
          currentPeriod = btn.getAttribute('data-period') || 'all';
          renderDashboard();
        });
      });
    }

    renderDashboard();

  } catch (err) {
    console.error('Lỗi khởi tạo Dashboard:', err);
    if (recentOrdersTbody) {
      recentOrdersTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-error); padding: 20px;">Lỗi tải dữ liệu: ${escapeHtml(err.message)}</td></tr>`;
    }
  }

  // Hàm render toàn bộ Dashboard theo kỳ lọc
  function renderDashboard() {
    // 1. Lọc đơn hàng theo thời gian
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const todayDateStr = now.toISOString().slice(0, 10);

    let filteredOrders = allOrders;

    if (currentPeriod === 'today') {
      filteredOrders = allOrders.filter(o => {
        if (!o.created_at) return false;
        return o.created_at.slice(0, 10) === todayDateStr;
      });
      if (periodLabel) periodLabel.textContent = `Dữ liệu bán hàng hôm nay (${now.toLocaleDateString('vi-VN')})`;
    } else if (currentPeriod === 'this_month') {
      filteredOrders = allOrders.filter(o => {
        if (!o.created_at) return false;
        const d = new Date(o.created_at);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
      if (periodLabel) periodLabel.textContent = `Dữ liệu bán hàng Tháng ${currentMonth + 1}/${currentYear}`;
    } else if (currentPeriod === 'last_month') {
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      filteredOrders = allOrders.filter(o => {
        if (!o.created_at) return false;
        const d = new Date(o.created_at);
        return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
      });
      if (periodLabel) periodLabel.textContent = `Dữ liệu bán hàng Tháng ${lastMonth + 1}/${lastMonthYear}`;
    } else {
      if (periodLabel) periodLabel.textContent = 'Dữ liệu phân tích tích luỹ toàn thời gian';
    }

    // 2. Tính toán các chỉ số KPI
    const paidOrders = filteredOrders.filter(o => o.payment_status === 'paid');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (Number(o.total_vnd) || 0), 0);
    const totalOrdersCount = filteredOrders.length;
    const paidCount = paidOrders.length;
    const pendingOrdersCount = filteredOrders.filter(o => o.order_status === 'pending_payment' || o.order_status === 'pending_confirmation').length;
    const aov = paidCount > 0 ? Math.round(totalRevenue / paidCount) : 0;
    const successRate = totalOrdersCount > 0 ? Math.round((paidCount / totalOrdersCount) * 100) : 0;

    if (statRevenue) statRevenue.textContent = formatVND(totalRevenue);
    if (statRevenueSub) statRevenueSub.textContent = `Từ ${paidCount} đơn đã thanh toán thành công`;
    if (statOrdersCount) statOrdersCount.textContent = totalOrdersCount;
    if (statOrdersSub) statOrdersSub.textContent = `Thành công: ${paidCount} (${successRate}% tỷ lệ)`;
    if (statPendingCount) statPendingCount.textContent = pendingOrdersCount;
    if (statAov) statAov.textContent = formatVND(aov);

    // 3. Biểu đồ doanh số theo ngày
    renderDailyChart(filteredOrders);

    // 4. Doanh số theo khu vực & Tỉnh thành
    renderRegionBreakdown(filteredOrders);

    // 5. Top sản phẩm bán chạy nhất
    renderTopProducts(filteredOrders);

    // 6. So sánh theo tháng
    renderMonthlyComparison(allOrders);

    // 7. Bảng đơn hàng gần nhất
    renderRecentOrders(allOrders.slice(0, 6));
  }

  // 3. Render biểu đồ ngày
  function renderDailyChart(orders) {
    if (!dailySalesChart) return;

    // Gom doanh số theo ngày (chỉ tính đơn paid)
    const dayMap = {};
    const dayOrdersCountMap = {};

    orders.forEach(o => {
      if (!o.created_at) return;
      const dateKey = o.created_at.slice(0, 10); // YYYY-MM-DD
      const isPaid = o.payment_status === 'paid';
      const amount = isPaid ? (Number(o.total_vnd) || 0) : 0;

      dayMap[dateKey] = (dayMap[dateKey] || 0) + amount;
      dayOrdersCountMap[dateKey] = (dayOrdersCountMap[dateKey] || 0) + 1;
    });

    // Sắp xếp ngày tăng dần
    let sortedDays = Object.keys(dayMap).sort();

    // Nếu không có đơn nào
    if (sortedDays.length === 0) {
      dailySalesChart.innerHTML = `
        <div style="width: 100%; display: flex; align-items: center; justify-content: center; color: var(--color-text-muted); font-size: var(--font-size-sm); height: 100%;">
          Không có dữ liệu doanh số trong khoảng thời gian đã chọn
        </div>
      `;
      if (dailySalesSummary) dailySalesSummary.innerHTML = '';
      return;
    }

    // Giới hạn hiển thị tối đa 10 ngày gần nhất để biểu đồ thoáng đẹp
    if (sortedDays.length > 10) {
      sortedDays = sortedDays.slice(sortedDays.length - 10);
    }

    const maxRev = Math.max(...sortedDays.map(d => dayMap[d]), 1);
    let peakDay = sortedDays[0];
    let peakAmount = 0;
    let totalRevDays = 0;

    sortedDays.forEach(d => {
      const rev = dayMap[d];
      totalRevDays += rev;
      if (rev > peakAmount) {
        peakAmount = rev;
        peakDay = d;
      }
    });

    dailySalesChart.innerHTML = sortedDays.map(dayStr => {
      const rev = dayMap[dayStr];
      const count = dayOrdersCountMap[dayStr] || 0;
      const heightPercent = Math.max(8, Math.round((rev / maxRev) * 100));
      const parts = dayStr.split('-');
      const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : dayStr;

      return `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; min-width: 44px; height: 100%; justify-content: flex-end;" title="Ngày ${label}: ${formatVND(rev)} (${count} đơn)">
          <div style="font-size: 11px; font-weight: 700; color: ${rev > 0 ? 'var(--color-primary)' : 'var(--color-text-muted)'}; margin-bottom: 6px; white-space: nowrap;">
            ${formatCompactVND(rev)}
          </div>
          <div style="width: 100%; max-width: 34px; height: ${heightPercent}%; background: ${rev > 0 ? 'linear-gradient(180deg, var(--color-primary) 0%, rgba(200, 82, 30, 0.7) 100%)' : '#E5E7EB'}; border-radius: 6px 6px 0 0; transition: height 0.4s ease; box-shadow: ${rev > 0 ? '0 2px 4px rgba(200, 82, 30, 0.2)' : 'none'};"></div>
          <div style="font-size: 11px; font-weight: 600; color: var(--color-text-muted); margin-top: 8px; white-space: nowrap;">
            ${label}
          </div>
        </div>
      `;
    }).join('');

    if (dailySalesSummary) {
      const avgRev = sortedDays.length > 0 ? Math.round(totalRevDays / sortedDays.length) : 0;
      const peakParts = peakDay.split('-');
      const peakLabel = peakParts.length === 3 ? `${peakParts[2]}/${peakParts[1]}` : peakDay;

      dailySalesSummary.innerHTML = `
        <div>🏆 Ngày cao điểm: <strong>${peakLabel}</strong> (${formatVND(peakAmount)})</div>
        <div>📊 Bình quân: <strong>${formatVND(avgRev)}</strong>/ngày</div>
      `;
    }
  }

  // 4. Render phân tích khu vực
  function renderRegionBreakdown(orders) {
    if (!regionBreakdownList) return;

    const regionMap = {};

    orders.forEach(o => {
      const macro = detectMacroRegion(o.shipping_address);
      const isPaid = o.payment_status === 'paid';
      const amount = isPaid ? (Number(o.total_vnd) || 0) : 0;

      if (!regionMap[macro.key]) {
        regionMap[macro.key] = {
          name: macro.name,
          icon: macro.icon,
          color: macro.color,
          orderCount: 0,
          revenue: 0
        };
      }
      regionMap[macro.key].orderCount += 1;
      regionMap[macro.key].revenue += amount;
    });

    const regions = Object.values(regionMap).sort((a, b) => b.revenue - a.revenue);
    const totalAllRevenue = regions.reduce((sum, r) => sum + r.revenue, 0);

    if (regions.length === 0) {
      regionBreakdownList.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); padding: 20px;">Chưa có đơn hàng trong khu vực này.</div>`;
      return;
    }

    regionBreakdownList.innerHTML = regions.map(reg => {
      const pct = totalAllRevenue > 0 ? Math.round((reg.revenue / totalAllRevenue) * 100) : 0;
      return `
        <div style="padding: 10px 14px; background: var(--color-bg); border-radius: var(--radius-md); border: 1px solid var(--color-border);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="font-size: var(--font-size-sm); font-weight: 600; color: var(--color-text-main); display: flex; align-items: center; gap: 6px;">
              <span>${reg.icon}</span>
              <span>${escapeHtml(reg.name)}</span>
              <span class="badge badge-info" style="font-size: 10px; padding: 1px 6px;">${reg.orderCount} đơn</span>
            </div>
            <div style="font-size: var(--font-size-sm); font-weight: 700; color: var(--color-primary);">
              ${formatVND(reg.revenue)}
              <span style="font-size: 11px; font-weight: normal; color: var(--color-text-muted); margin-left: 4px;">(${pct}%)</span>
            </div>
          </div>
          <div style="width: 100%; height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden;">
            <div style="width: ${pct}%; height: 100%; background: ${reg.color || '#D97706'}; background-color: ${reg.color || '#D97706'}; border-radius: 3px; transition: width 0.4s ease;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 5. Render top sản phẩm bán chạy nhất
  function renderTopProducts(orders) {
    if (!topProductsTbody) return;

    const prodSalesMap = {};

    orders.forEach(o => {
      const items = o.order_items || o.items || [];
      const isPaid = o.payment_status === 'paid';

      items.forEach(item => {
        const name = item.product_name_snapshot || item.product_name || 'Đặc sản miền Tây';
        const qty = Number(item.quantity) || 1;
        const lineTotal = Number(item.line_total_vnd) || (Number(item.unit_price_vnd) || 0) * qty;

        if (!prodSalesMap[name]) {
          prodSalesMap[name] = {
            name: name,
            quantity: 0,
            revenue: 0,
            image_url: ''
          };
          // Tìm hình ảnh tương ứng nếu có
          const matchedProd = allProducts.find(p => p.name === name || name.includes(p.name));
          if (matchedProd && matchedProd.image_url) {
            prodSalesMap[name].image_url = matchedProd.image_url;
          }
        }

        prodSalesMap[name].quantity += qty;
        if (isPaid) {
          prodSalesMap[name].revenue += lineTotal;
        }
      });
    });

    const topList = Object.values(prodSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const totalProdRevenue = topList.reduce((sum, p) => sum + p.revenue, 0);

    if (topList.length === 0) {
      topProductsTbody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px; color: var(--color-text-muted);">Chưa có dữ liệu sản phẩm</td></tr>`;
      return;
    }

    topProductsTbody.innerHTML = topList.map(item => {
      const pct = totalProdRevenue > 0 ? Math.round((item.revenue / totalProdRevenue) * 100) : 0;
      const imgSrc = item.image_url 
        ? (item.image_url.startsWith('http') || item.image_url.startsWith('/') || item.image_url.startsWith('../') ? item.image_url : '../' + item.image_url)
        : '../assets/images/logo-utut.png';

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <img src="${escapeHtml(imgSrc)}" alt="" style="width: 32px; height: 32px; object-fit: cover; border-radius: 4px; border: 1px solid var(--color-border);" onerror="this.src='../assets/images/logo-utut.png'" />
              <div style="font-weight: 600; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(item.name)}
              </div>
            </div>
          </td>
          <td style="text-align: right; font-weight: 600;">${item.quantity}</td>
          <td style="text-align: right; font-weight: 700; color: var(--color-primary);">${formatVND(item.revenue)}</td>
          <td style="text-align: right;">
            <div style="display: flex; align-items: center; justify-content: flex-end; gap: 6px;">
              <span style="font-weight: 600; color: var(--color-text-muted);">${pct}%</span>
              <div style="width: 48px; height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden;">
                <div style="width: ${pct}%; height: 100%; background: var(--color-primary);"></div>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 6. Render so sánh doanh số theo tháng
  function renderMonthlyComparison(orders) {
    if (!monthlyComparisonBox) return;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = Jan, 9 = Oct

    // Tháng hiện tại (T10)
    const thisMonthOrders = orders.filter(o => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    const thisMonthPaid = thisMonthOrders.filter(o => o.payment_status === 'paid');
    const thisMonthRevenue = thisMonthPaid.reduce((s, o) => s + (Number(o.total_vnd) || 0), 0);

    // Tháng trước (T09)
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const lastMonthOrders = orders.filter(o => {
      if (!o.created_at) return false;
      const d = new Date(o.created_at);
      return d.getFullYear() === lastMonthYear && d.getMonth() === lastMonth;
    });
    const lastMonthPaid = lastMonthOrders.filter(o => o.payment_status === 'paid');
    const lastMonthRevenue = lastMonthPaid.reduce((s, o) => s + (Number(o.total_vnd) || 0), 0);

    // Tính % tăng trưởng
    let growthRate = 0;
    if (lastMonthRevenue > 0) {
      growthRate = Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100);
    } else if (thisMonthRevenue > 0) {
      growthRate = 100;
    }

    const isPositive = growthRate >= 0;

    monthlyComparisonBox.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); margin-bottom: var(--space-4);">
        <!-- Tháng hiện tại -->
        <div style="background: var(--color-bg); padding: var(--space-4); border-radius: var(--radius-lg); border: 2px solid rgba(200,82,30,0.2);">
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-weight: 600; text-transform: uppercase;">
            Tháng ${currentMonth + 1}/${currentYear} (Hiện tại)
          </div>
          <div style="font-size: var(--font-size-xl); font-weight: 800; color: var(--color-primary); margin: 6px 0;">
            ${formatVND(thisMonthRevenue)}
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); display: flex; justify-content: space-between;">
            <span>${thisMonthOrders.length} đơn đặt</span>
            <span>Thành công: ${thisMonthPaid.length}</span>
          </div>
        </div>

        <!-- Tháng trước -->
        <div style="background: var(--color-bg); padding: var(--space-4); border-radius: var(--radius-lg); border: 1px solid var(--color-border);">
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); font-weight: 600; text-transform: uppercase;">
            Tháng ${lastMonth + 1}/${lastMonthYear} (Tháng trước)
          </div>
          <div style="font-size: var(--font-size-xl); font-weight: 800; color: var(--color-text-main); margin: 6px 0;">
            ${formatVND(lastMonthRevenue)}
          </div>
          <div style="font-size: var(--font-size-xs); color: var(--color-text-muted); display: flex; justify-content: space-between;">
            <span>${lastMonthOrders.length} đơn đặt</span>
            <span>Thành công: ${lastMonthPaid.length}</span>
          </div>
        </div>
      </div>

      <!-- Tăng trưởng -->
      <div style="padding: 12px 16px; background: ${isPositive ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)'}; border: 1px solid ${isPositive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}; border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: var(--font-size-xs); color: var(--color-text-main);">
          Tốc độ tăng trưởng doanh số thực nhận:
        </div>
        <div style="font-size: var(--font-size-sm); font-weight: 800; color: ${isPositive ? 'var(--color-success)' : 'var(--color-error)'};">
          ${isPositive ? '▲ +' : '▼ '}${growthRate}% so với tháng trước
        </div>
      </div>
    `;
  }

  // 7. Render bảng đơn hàng gần đây
  function renderRecentOrders(orders) {
    if (!recentOrdersTbody) return;

    if (orders.length === 0) {
      recentOrdersTbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: var(--color-text-muted);">Chưa có đơn hàng nào</td></tr>`;
      return;
    }

    recentOrdersTbody.innerHTML = orders.map(o => {
      const city = extractCityOrProvince(o.shipping_address);
      const isPaid = o.payment_status === 'paid';

      const displayPhone = (o.phone && (o.phone.includes('0814286439') || o.phone.includes('814286439'))) ? '081428xxxx' : (o.phone || '');

      return `
        <tr>
          <td><strong>${escapeHtml(o.order_code)}</strong></td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(o.customer_name)}</div>
            <small style="color: var(--color-text-muted);">${escapeHtml(displayPhone)}</small>
          </td>
          <td>
            <span class="badge badge-info" style="font-weight: 500;">📍 ${escapeHtml(city)}</span>
          </td>
          <td style="font-size: var(--font-size-xs);">${formatDate(o.created_at)}</td>
          <td style="font-weight: 700; color: var(--color-primary);">${formatVND(o.total_vnd)}</td>
          <td>
            <span class="badge ${isPaid ? 'badge-success' : 'badge-pending'}">
              ${isPaid ? 'Đã thanh toán' : 'Chờ thu tiền'}
            </span>
          </td>
          <td>
            <a href="orders.html?search=${encodeURIComponent(o.order_code)}" class="btn btn-outline btn-sm">Xem chi tiết</a>
          </td>
        </tr>
      `;
    }).join('');
  }
}
