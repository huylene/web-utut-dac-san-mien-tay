/**
 * Admin Reviews Moderation — Út Út (utut.vn)
 * Kiểm duyệt đánh giá khách hàng (Duyệt & Hiện / Ẩn / Xóa vĩnh viễn)
 * Tuân thủ 04-DATABASE-SUPABASE.md & 05-FEATURE-SPECS.md
 */

import { DataService } from '../supabase-client.js';
import { escapeHtml, formatDate, renderRatingStars, showToast } from '../ui-utils.js';

export async function initAdminReviewsPage() {
  const tbody = document.getElementById('reviews-tbody');
  const searchInput = document.getElementById('review-search');
  const statusFilter = document.getElementById('review-status-filter');
  const refreshBtn = document.getElementById('review-refresh-btn');
  const countText = document.getElementById('review-count-text');

  // KPI Elements
  const kpiTotal = document.getElementById('kpi-total-revs');
  const kpiApproved = document.getElementById('kpi-approved-revs');
  const kpiPending = document.getElementById('kpi-pending-revs');
  const kpiRejected = document.getElementById('kpi-rejected-revs');

  const cardApproved = document.getElementById('card-filter-approved');
  const cardPending = document.getElementById('card-filter-pending');
  const cardRejected = document.getElementById('card-filter-rejected');

  let allReviews = [];
  let searchTimeout = null;

  async function loadReviews() {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 28px;"><div class="spinner"></div><div style="margin-top: 8px; color: var(--color-text-muted); font-size: 0.85rem;">Đang tải danh sách đánh giá...</div></td></tr>`;
    try {
      allReviews = await DataService.adminGetReviews();
      updateKpiCounts();
      renderTable();
    } catch (err) {
      console.error('Lỗi tải đánh giá:', err);
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--color-error); padding: 20px;">
              <div>⚠️ Không thể tải danh sách đánh giá.</div>
              <div style="font-size: 0.85rem; color: var(--color-text-muted); margin-top: 4px;">${escapeHtml(err.message)}</div>
              <button type="button" class="btn btn-outline btn-sm" id="btn-retry-reviews" style="margin-top: 10px;">Thử lại</button>
            </td>
          </tr>
        `;
        document.getElementById('btn-retry-reviews')?.addEventListener('click', loadReviews);
      }
    }
  }

  function updateKpiCounts() {
    const total = allReviews.length;
    const approved = allReviews.filter(r => r.moderation_status === 'approved').length;
    const pending = allReviews.filter(r => r.moderation_status === 'pending').length;
    const rejected = allReviews.filter(r => r.moderation_status === 'rejected').length;

    if (kpiTotal) kpiTotal.textContent = total;
    if (kpiApproved) kpiApproved.textContent = approved;
    if (kpiPending) kpiPending.textContent = pending;
    if (kpiRejected) kpiRejected.textContent = rejected;
  }

  function getFilteredReviews() {
    const filter = statusFilter?.value || '';
    const search = (searchInput?.value || '').trim().toLowerCase();

    return allReviews.filter(r => {
      // Lọc theo trạng thái
      if (filter && r.moderation_status !== filter) return false;

      // Lọc theo từ khóa tìm kiếm
      if (search) {
        const name = (r.display_name || '').toLowerCase();
        const comment = (r.comment || '').toLowerCase();
        const prod = (r.products?.name || '').toLowerCase();
        if (!name.includes(search) && !comment.includes(search) && !prod.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }

  function renderTable() {
    if (!tbody) return;

    const filtered = getFilteredReviews();

    if (countText) {
      countText.textContent = `Hiển thị ${filtered.length}/${allReviews.length} đánh giá`;
    }

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: var(--color-text-muted);">
            <div style="font-size: 1.8rem; margin-bottom: 6px;">🔍</div>
            <div>Không tìm thấy đánh giá nào phù hợp với bộ lọc.</div>
          </td>
        </tr>
      `;
      return;
    }

    const statusBadge = {
      approved: '<span class="badge badge-success">✅ Đã duyệt (Hiện)</span>',
      pending: '<span class="badge badge-pending">⏳ Chờ kiểm duyệt</span>',
      rejected: '<span class="badge badge-error">👁️ Đang ẩn</span>'
    };

    tbody.innerHTML = filtered.map(r => {
      const isApproved = r.moderation_status === 'approved';
      const prodName = r.products?.name || 'Đặc sản miền Tây';
      const prodSlug = r.products?.slug || '';
      const prodLink = prodSlug ? `../product.html?slug=${encodeURIComponent(prodSlug)}` : '../products.html';

      return `
        <tr style="${!isApproved ? 'background-color: #FAF9F6;' : ''}">
          <!-- Cột 1: Tên đặc sản -->
          <td>
            <a href="${prodLink}" target="_blank" style="font-weight: 600; color: var(--color-primary); text-decoration: none;" title="Bấm để xem trang sản phẩm">
              ${escapeHtml(prodName)} ↗
            </a>
          </td>

          <!-- Cột 2: Khách hàng -->
          <td>
            <div style="font-weight: 600; color: var(--color-text-main);">${escapeHtml(r.display_name)}</div>
            <small style="color: var(--color-text-muted); font-size: 0.75rem;">${formatDate(r.created_at)}</small>
          </td>

          <!-- Cột 3: Số sao -->
          <td>
            <div class="star-rating">${renderRatingStars(r.rating)}</div>
          </td>

          <!-- Cột 4: Nội dung cảm nhận -->
          <td>
            <div style="font-size: var(--font-size-sm); color: var(--color-text-main); line-height: 1.4;">
              "${escapeHtml(r.comment || '')}"
            </div>
          </td>

          <!-- Cột 5: Trạng thái -->
          <td>
            ${statusBadge[r.moderation_status] || `<span class="badge badge-info">${escapeHtml(r.moderation_status)}</span>`}
          </td>

          <!-- Cột 6: Hành động (Duyệt & Hiện / Ẩn / Xóa) -->
          <td style="text-align: center;">
            <div style="display: inline-flex; gap: 6px; align-items: center; justify-content: center; flex-wrap: wrap;">
              ${isApproved ? `
                <button type="button" class="btn btn-sm hide-rev-btn" data-id="${r.id}" style="background-color: #FEF3C7; border: 1px solid #F59E0B; color: #B45309; font-size: 0.75rem; padding: 4px 8px;" title="Ẩn đánh giá này khỏi trang web">
                  👁️ Ẩn
                </button>
              ` : `
                <button type="button" class="btn btn-sm approve-rev-btn" data-id="${r.id}" style="background-color: #059669; border: 1px solid #059669; color: #FFFFFF; font-size: 0.75rem; padding: 4px 8px;" title="Duyệt và cho phép hiển thị ra website">
                  ✓ Duyệt & Hiện
                </button>
              `}
              
              <button type="button" class="btn btn-outline btn-sm delete-rev-btn" data-id="${r.id}" data-name="${escapeHtml(r.display_name)}" style="color: #DC2626; border-color: #FCA5A5; font-size: 0.75rem; padding: 4px 8px;" title="Xóa vĩnh viễn đánh giá này">
                🗑️ Xóa
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // 1. Gắn sự kiện nút Duyệt & Hiện
    tbody.querySelectorAll('.approve-rev-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.textContent = 'Đang duyệt...';
        try {
          await DataService.adminModerateReview(id, 'approved');
          showToast('Đã duyệt và hiển thị đánh giá lên trang web thành công!', 'success');
          await loadReviews();
        } catch (err) {
          showToast('Lỗi duyệt: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = '✓ Duyệt & Hiện';
        }
      });
    });

    // 2. Gắn sự kiện nút Ẩn đánh giá
    tbody.querySelectorAll('.hide-rev-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.textContent = 'Đang ẩn...';
        try {
          await DataService.adminModerateReview(id, 'rejected');
          showToast('Đã ẩn đánh giá khỏi website!', 'info');
          await loadReviews();
        } catch (err) {
          showToast('Lỗi ẩn: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = '👁️ Ẩn';
        }
      });
    });

    // 3. Gắn sự kiện nút Xóa vĩnh viễn đánh giá
    tbody.querySelectorAll('.delete-rev-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        
        if (!confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN đánh giá của khách hàng "${name}" không?\n\nThao tác này sẽ xóa hoàn toàn khỏi cơ sở dữ liệu và không thể khôi phục.`)) {
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Đang xóa...';
        try {
          await DataService.adminDeleteReview(id);
          showToast('Đã xóa vĩnh viễn đánh giá thành công!', 'success');
          await loadReviews();
        } catch (err) {
          showToast('Lỗi xóa: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = '🗑️ Xóa';
        }
      });
    });
  }

  // Lắng nghe sự kiện tìm kiếm (debounce 200ms)
  searchInput?.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      renderTable();
    }, 200);
  });

  // Lắng nghe bộ lọc trạng thái
  statusFilter?.addEventListener('change', () => renderTable());

  // Click vào các thẻ KPI để lọc nhanh
  cardApproved?.addEventListener('click', () => {
    if (statusFilter) {
      statusFilter.value = 'approved';
      renderTable();
    }
  });

  cardPending?.addEventListener('click', () => {
    if (statusFilter) {
      statusFilter.value = 'pending';
      renderTable();
    }
  });

  cardRejected?.addEventListener('click', () => {
    if (statusFilter) {
      statusFilter.value = 'rejected';
      renderTable();
    }
  });

  // Nút làm mới
  refreshBtn?.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '🔄 Đang tải...';
    await loadReviews();
    refreshBtn.disabled = false;
    refreshBtn.innerHTML = '🔄 Tải lại';
    showToast('Đã làm mới dữ liệu đánh giá', 'success');
  });

  await loadReviews();
}
