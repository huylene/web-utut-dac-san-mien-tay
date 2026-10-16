/**
 * Products Module — Út Út (utut.vn)
 * Hiển thị danh mục, danh sách sản phẩm, chi tiết sản phẩm và gửi đánh giá
 */

import { DataService } from './supabase-client.js';
import { CartManager } from './cart.js';
import { formatVND, escapeHtml, showToast, renderRatingStars, formatDate } from './ui-utils.js';

/**
 * Tạo HTML cho 1 Card sản phẩm
 */
export function createProductCard(product) {
  const isFeaturedBadge = product.is_featured 
    ? `<span class="product-badge-tag">Nổi bật</span>` 
    : '';

  const comparePriceHtml = product.compare_at_price_vnd && product.compare_at_price_vnd > product.price_vnd
    ? `<span class="product-compare-price">${formatVND(product.compare_at_price_vnd)}</span>`
    : '';

  const categoryName = product.categories?.name || 'Đặc sản';

  return `
    <article class="product-card" data-id="${product.id}">
      <div class="product-image-wrap">
        ${isFeaturedBadge}
        <a href="product.html?id=${encodeURIComponent(product.slug || product.id)}" aria-label="${escapeHtml(product.name)}">
          <img 
            src="${escapeHtml(product.image_url || 'assets/images/logo-utut.png')}" 
            alt="${escapeHtml(product.name)}" 
            class="product-image"
            loading="lazy"
            onerror="this.src='assets/images/logo-utut.png'"
          />
        </a>
      </div>
      <div class="product-content">
        <span class="product-category-name">${escapeHtml(categoryName)}</span>
        <h3 class="product-title">
          <a href="product.html?id=${encodeURIComponent(product.slug || product.id)}">${escapeHtml(product.name)}</a>
        </h3>
        <p class="product-short-desc">${escapeHtml(product.short_description || '')}</p>
        <div class="product-price-row">
          <span class="product-price">${formatVND(product.price_vnd)}</span>
          ${comparePriceHtml}
        </div>
        <div class="product-actions">
          <button type="button" class="btn btn-outline-primary btn-sm btn-block add-to-cart-btn" data-id="${product.id}">
            🛒 Thêm vào giỏ
          </button>
        </div>
      </div>
    </article>
  `;
}

/**
 * Gắn sự kiện "Thêm vào giỏ" cho danh sách sản phẩm
 */
export function bindAddToCartButtons(container) {
  if (!container) return;
  const buttons = container.querySelectorAll('.add-to-cart-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const productId = btn.getAttribute('data-id');
      if (productId) {
        CartManager.addItem(productId, 1);
      }
    });
  });
}

/**
 * Khởi tạo trang Danh Sách Sản Phẩm (products.html)
 */
export async function initProductsPage() {
  const gridEl = document.getElementById('products-grid');
  const categoryFilterEl = document.getElementById('category-filter');
  const searchInput = document.getElementById('product-search');
  const sortSelect = document.getElementById('product-sort');
  const loadingEl = document.getElementById('products-loading');
  const emptyEl = document.getElementById('products-empty');

  if (!gridEl) return;

  // Lấy danh mục từ URL nếu có (?category=kho-dac-san)
  const urlParams = new URLSearchParams(window.location.search);
  let activeCategorySlug = urlParams.get('category') || '';
  let searchQuery = '';
  let sortBy = 'default';

  // 1. Tải danh mục
  try {
    const categories = await DataService.getCategories();
    if (categoryFilterEl) {
      let filterHtml = `
        <button type="button" class="category-pill ${!activeCategorySlug ? 'active' : ''}" data-slug="">
          Tất cả đặc sản
        </button>
      `;
      categories.forEach(cat => {
        filterHtml += `
          <button type="button" class="category-pill ${activeCategorySlug === cat.slug ? 'active' : ''}" data-slug="${cat.slug}">
            ${escapeHtml(cat.name)}
          </button>
        `;
      });
      categoryFilterEl.innerHTML = filterHtml;

      // Gắn sự kiện click danh mục
      categoryFilterEl.querySelectorAll('.category-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          categoryFilterEl.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          activeCategorySlug = pill.getAttribute('data-slug') || '';
          loadProducts();
        });
      });
    }
  } catch (err) {
    console.error('Lỗi tải danh mục:', err);
  }

  // 2. Hàm tải và lọc sản phẩm
  async function loadProducts() {
    if (loadingEl) loadingEl.style.display = 'block';
    if (emptyEl) emptyEl.style.display = 'none';
    gridEl.innerHTML = '';

    try {
      let products = await DataService.getProducts({
        categorySlug: activeCategorySlug || null,
        search: searchQuery
      });

      // Sắp xếp
      if (sortBy === 'price-asc') {
        products.sort((a, b) => a.price_vnd - b.price_vnd);
      } else if (sortBy === 'price-desc') {
        products.sort((a, b) => b.price_vnd - a.price_vnd);
      }

      if (loadingEl) loadingEl.style.display = 'none';

      if (products.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        return;
      }

      gridEl.innerHTML = products.map(p => createProductCard(p)).join('');
      bindAddToCartButtons(gridEl);
    } catch (err) {
      if (loadingEl) loadingEl.style.display = 'none';
      gridEl.innerHTML = `<div class="state-box"><p class="form-error">Lỗi tải danh sách sản phẩm. Vui lòng thử lại sau.</p></div>`;
      console.error(err);
    }
  }

  // Sự kiện tìm kiếm có debounce
  let searchTimeout;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchQuery = e.target.value.trim();
        loadProducts();
      }, 300);
    });
  }

  // Sự kiện sắp xếp
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      loadProducts();
    });
  }

  await loadProducts();
}

/**
 * Khởi tạo trang Chi Tiết Sản Phẩm (product.html)
 */
export async function initProductDetailPage() {
  const container = document.getElementById('product-detail-container');
  if (!container) return;

  const urlParams = new URLSearchParams(window.location.search);
  const idOrSlug = urlParams.get('id') || urlParams.get('slug');

  if (!idOrSlug) {
    container.innerHTML = `
      <div class="state-box">
        <div class="state-icon">🔍</div>
        <h2 class="state-title">Không tìm thấy sản phẩm</h2>
        <p class="state-desc">Đường dẫn không hợp lệ hoặc sản phẩm không tồn tại.</p>
        <a href="products.html" class="btn btn-primary">Xem danh sách sản phẩm</a>
      </div>
    `;
    return;
  }

  try {
    const product = await DataService.getProductByIdOrSlug(idOrSlug);
    if (!product) {
      container.innerHTML = `
        <div class="state-box">
          <div class="state-icon">📦</div>
          <h2 class="state-title">Sản phẩm không tồn tại</h2>
          <p class="state-desc">Sản phẩm này có thể đã ngừng bán hoặc đã được chuyển địa chỉ.</p>
          <a href="products.html" class="btn btn-primary">Quay lại danh mục</a>
        </div>
      `;
      return;
    }

    // Đổi tiêu đề trang theo sản phẩm
    document.title = `${product.name} — Út Út`;

    const comparePriceHtml = product.compare_at_price_vnd && product.compare_at_price_vnd > product.price_vnd
      ? `<span class="compare-price">${formatVND(product.compare_at_price_vnd)}</span>`
      : '';

    container.innerHTML = `
      <div class="product-detail-grid">
        <div class="product-detail-media">
          <img 
            src="${escapeHtml(product.image_url || 'assets/images/logo-utut.png')}" 
            alt="${escapeHtml(product.name)}" 
            class="product-detail-img"
            onerror="this.src='assets/images/logo-utut.png'"
          />
        </div>
        <div class="product-detail-info">
          <div class="product-stock-tag">
            <span class="badge ${product.stock_quantity > 0 ? 'badge-success' : 'badge-error'}">
              ${product.stock_quantity > 0 ? 'Còn hàng' : 'Tạm hết hàng'}
            </span>
            <span class="badge badge-info" style="margin-left: 8px;">
              ${escapeHtml(product.categories?.name || 'Đặc sản')}
            </span>
          </div>

          <h1 class="product-detail-title">${escapeHtml(product.name)}</h1>
          
          <div class="product-price-box">
            <span class="main-price">${formatVND(product.price_vnd)}</span>
            ${comparePriceHtml}
          </div>

          <p class="section-desc" style="font-weight: 500;">
            ${escapeHtml(product.short_description || '')}
          </p>

          <div class="product-description-content">
            <h4 style="margin-bottom: 8px;">Mô tả sản phẩm & Nguồn gốc</h4>
            <p>${escapeHtml(product.description || 'Đặc sản miền Tây gia truyền thương hiệu Út Út.')}</p>
          </div>

          <div class="product-add-group">
            <div class="qty-control">
              <button type="button" class="qty-btn" id="qty-minus" aria-label="Giảm">-</button>
              <input type="number" id="detail-qty" class="qty-input" value="1" min="1" max="${product.stock_quantity || 99}" readonly />
              <button type="button" class="qty-btn" id="qty-plus" aria-label="Tăng">+</button>
            </div>
            <button type="button" class="btn btn-primary btn-lg" id="detail-add-btn" style="flex: 1;" ${product.stock_quantity <= 0 ? 'disabled' : ''}>
              🛒 Thêm vào giỏ hàng
            </button>
          </div>
        </div>
      </div>

      <!-- Phần đánh giá -->
      <section class="section" style="border-top: 1px solid var(--color-border); padding-top: var(--space-8);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-4);">
          <div>
            <h3>Đánh giá từ khách hàng</h3>
            <p style="font-size: var(--font-size-sm); margin: 0;">Chỉ hiển thị các đánh giá thật đã được quản trị viên duyệt.</p>
          </div>
          <button type="button" class="btn btn-outline-primary btn-sm" id="toggle-review-form-btn">
            ✍️ Viết đánh giá của bạn
          </button>
        </div>

        <!-- Form gửi đánh giá -->
        <div id="review-form-wrap" style="display: none; background: #FFFFFF; border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: var(--space-6); margin-bottom: var(--space-8);">
          <h4 style="margin-bottom: var(--space-4);">Chia sẻ cảm nhận về món này</h4>
          <form id="submit-review-form">
            <div class="form-group">
              <label class="form-label" for="rev-name">Tên hiển thị <span class="required">*</span></label>
              <input type="text" id="rev-name" class="form-control" placeholder="Ví dụ: Chị Ba, Anh Năm..." required />
            </div>
            <div class="form-group">
              <label class="form-label">Chất lượng món ăn</label>
              <div class="star-rating-input">
                <input type="radio" id="star5" name="rating" value="5" checked /><label for="star5">★</label>
                <input type="radio" id="star4" name="rating" value="4" /><label for="star4">★</label>
                <input type="radio" id="star3" name="rating" value="3" /><label for="star3">★</label>
                <input type="radio" id="star2" name="rating" value="2" /><label for="star2">★</label>
                <input type="radio" id="star1" name="rating" value="1" /><label for="star1">★</label>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="rev-comment">Bình luận cảm nhận <span class="required">*</span></label>
              <textarea id="rev-comment" class="form-control" rows="3" placeholder="Hương vị ra sao, đóng gói thế nào..." required></textarea>
            </div>
            <div style="display: flex; gap: var(--space-3);">
              <button type="submit" class="btn btn-primary" id="rev-submit-btn">Gửi đánh giá</button>
              <button type="button" class="btn btn-outline" id="rev-cancel-btn">Hủy</button>
            </div>
          </form>
        </div>

        <!-- Danh sách đánh giá -->
        <div id="reviews-list">
          <div class="spinner"></div>
        </div>
      </section>
    `;

    // 1. Logic Số lượng & Thêm vào giỏ
    const qtyInput = document.getElementById('detail-qty');
    const minusBtn = document.getElementById('qty-minus');
    const plusBtn = document.getElementById('qty-plus');
    const addBtn = document.getElementById('detail-add-btn');

    minusBtn?.addEventListener('click', () => {
      let val = parseInt(qtyInput.value) || 1;
      if (val > 1) qtyInput.value = val - 1;
    });

    plusBtn?.addEventListener('click', () => {
      let val = parseInt(qtyInput.value) || 1;
      qtyInput.value = val + 1;
    });

    addBtn?.addEventListener('click', () => {
      const quantity = parseInt(qtyInput.value) || 1;
      CartManager.addItem(product.id, quantity);
    });

    // 2. Logic Form Review
    const toggleFormBtn = document.getElementById('toggle-review-form-btn');
    const formWrap = document.getElementById('review-form-wrap');
    const cancelFormBtn = document.getElementById('rev-cancel-btn');
    const reviewForm = document.getElementById('submit-review-form');

    toggleFormBtn?.addEventListener('click', () => {
      formWrap.style.display = formWrap.style.display === 'none' ? 'block' : 'none';
    });

    cancelFormBtn?.addEventListener('click', () => {
      formWrap.style.display = 'none';
    });

    reviewForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const displayName = document.getElementById('rev-name').value.trim();
      const rating = document.querySelector('input[name="rating"]:checked')?.value || 5;
      const comment = document.getElementById('rev-comment').value.trim();

      if (!displayName || !comment) {
        showToast('Vui lòng điền đầy đủ tên và cảm nhận', 'warning');
        return;
      }

      const submitBtn = document.getElementById('rev-submit-btn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang gửi...';

      try {
        await DataService.submitReview({
          productId: product.id,
          productSlug: product.slug,
          displayName,
          rating,
          comment
        });
        showToast('Cảm ơn bạn! Đánh giá đã được gửi và đang chờ kiểm duyệt.', 'success');
        reviewForm.reset();
        formWrap.style.display = 'none';
      } catch (err) {
        showToast('Không thể gửi đánh giá, vui lòng thử lại sau', 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Gửi đánh giá';
      }
    });

    // 3. Tải danh sách Review đã duyệt
    const reviewsListEl = document.getElementById('reviews-list');
    const reviews = await DataService.getProductReviews(product.id, product.slug);

    const titleEl = document.querySelector('section h3');
    if (titleEl && titleEl.textContent.includes('Đánh giá')) {
      titleEl.innerHTML = `Đánh giá từ khách hàng <span style="font-size: 0.9rem; font-weight: normal; color: var(--color-text-muted);">(${reviews.length})</span>`;
    }

    if (reviews.length === 0) {
      reviewsListEl.innerHTML = `
        <div style="background-color: var(--color-surface); padding: var(--space-6); border-radius: var(--radius-md); border: 1px dashed var(--color-border); text-align: center;">
          <p style="margin: 0; color: var(--color-text-muted);">Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên chia sẻ cảm nhận!</p>
        </div>
      `;
    } else {
      reviewsListEl.innerHTML = reviews.map(r => `
        <div style="background-color: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-4); margin-bottom: var(--space-3); box-shadow: var(--shadow-sm);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2); flex-wrap: wrap; gap: 4px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 32px; height: 32px; border-radius: 50%; background: #F8F5EE; border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.85rem; color: var(--color-primary);">
                ${escapeHtml((r.display_name || 'K').charAt(0).toUpperCase())}
              </div>
              <div>
                <strong style="color: var(--color-text-main); font-size: var(--font-size-base);">${escapeHtml(r.display_name)}</strong>
                <span style="font-size: 0.75rem; color: #059669; background: #ECFDF5; padding: 1px 6px; border-radius: 4px; margin-left: 6px;">✓ Đã mua hàng</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div class="star-rating">${renderRatingStars(r.rating)}</div>
              <span style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${formatDate(r.created_at)}</span>
            </div>
          </div>
          <p style="margin: 0; color: var(--color-text-main); font-size: var(--font-size-sm); line-height: 1.5; padding-left: 40px;">${escapeHtml(r.comment || '')}</p>
        </div>
      `).join('');
    }

  } catch (err) {
    console.error('Lỗi chi tiết sản phẩm:', err);
    container.innerHTML = `<div class="state-box"><p class="form-error">Lỗi kết nối khi tải sản phẩm.</p></div>`;
  }
}
