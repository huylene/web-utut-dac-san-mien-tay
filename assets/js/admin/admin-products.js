/**
 * Admin Products Module — Út Út (utut.vn)
 * Quản lý danh mục & sản phẩm, thêm/sửa, tải ảnh từ máy, chuyển đổi trạng thái và xuất CSV
 */

import { DataService } from '../supabase-client.js';
import { formatVND, escapeHtml, showToast } from '../ui-utils.js';

// Định dạng đường dẫn ảnh chuẩn cho trang admin (/admin/)
function formatAdminImgSrc(url) {
  if (!url) return '../assets/images/logo-utut.png';
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/') || url.startsWith('../')) {
    return url;
  }
  return '../' + url;
}

// Nén và chuẩn hoá ảnh từ máy tính thành Data URL gọn nhẹ (~60KB-120KB)
function compressImageFile(file, maxWidth = 800, maxHeight = 800, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export async function initAdminProductsPage() {
  const tbody = document.getElementById('products-tbody');
  const addBtn = document.getElementById('add-product-btn');
  const exportBtn = document.getElementById('export-products-csv-btn');
  const modalEl = document.getElementById('product-modal');
  const productForm = document.getElementById('product-form');

  const imageInput = document.getElementById('prod-image');
  const browseImageBtn = document.getElementById('btn-browse-image');
  const imageFileInput = document.getElementById('prod-image-file');
  const imagePreview = document.getElementById('prod-image-preview');
  const previewTitle = document.getElementById('prod-image-preview-title');
  const previewSub = document.getElementById('prod-image-preview-sub');
  const clearImageBtn = document.getElementById('btn-clear-image');

  let currentProducts = [];

  // Hàm cập nhật khung xem trước ảnh
  function updateImagePreview(url) {
    if (!imagePreview) return;
    const cleanUrl = (url || '').trim();

    if (!cleanUrl) {
      imagePreview.src = '../assets/images/logo-utut.png';
      if (previewTitle) previewTitle.textContent = 'Chưa chọn hình ảnh';
      if (previewSub) previewSub.textContent = 'Có thể dán link trực tiếp hoặc bấm "Tải ảnh" từ máy tính.';
      if (clearImageBtn) clearImageBtn.style.display = 'none';
      return;
    }

    imagePreview.src = formatAdminImgSrc(cleanUrl);
    if (previewTitle) {
      if (cleanUrl.startsWith('data:')) {
        previewTitle.textContent = '✓ Ảnh đã tải từ máy tính (Đã tối ưu)';
      } else {
        const fileName = cleanUrl.split('/').pop() || cleanUrl;
        previewTitle.textContent = '✓ ' + fileName;
      }
    }
    if (previewSub) previewSub.textContent = 'Hình ảnh hợp lệ, sẵn sàng hiển thị trên website.';
    if (clearImageBtn) clearImageBtn.style.display = 'inline-block';
  }

  // Tải danh sách sản phẩm
  async function loadProducts() {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;"><div class="spinner"></div></td></tr>`;
    try {
      currentProducts = await DataService.adminGetProducts();

      if (currentProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 24px; color: var(--color-text-muted);">Chưa có sản phẩm nào.</td></tr>`;
        return;
      }

      tbody.innerHTML = currentProducts.map(p => {
        const imgSrc = formatAdminImgSrc(p.image_url);
        return `
        <tr>
          <td>
            <img src="${escapeHtml(imgSrc)}" alt="" style="width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid var(--color-border);" onerror="this.src='../assets/images/logo-utut.png'" />
          </td>
          <td>
            <strong>${escapeHtml(p.name)}</strong>
            <div style="font-size: var(--font-size-xs); color: var(--color-text-muted);">${escapeHtml(p.categories?.name || 'Đặc sản')}</div>
          </td>
          <td style="font-weight: 600; color: var(--color-primary);">${formatVND(p.price_vnd)}</td>
          <td>${p.stock_quantity || 0}</td>
          <td>
            <button type="button" class="badge ${p.is_featured ? 'badge-success' : 'badge-info'} toggle-featured-btn" data-id="${p.id}" style="border:none; cursor:pointer;">
              ${p.is_featured ? '★ Nổi bật' : 'Bình thường'}
            </button>
          </td>
          <td>
            <button type="button" class="badge ${p.is_active ? 'badge-success' : 'badge-error'} toggle-active-btn" data-id="${p.id}" style="border:none; cursor:pointer;">
              ${p.is_active ? 'Đang bán' : 'Tạm dừng'}
            </button>
          </td>
          <td>
            <button type="button" class="btn btn-outline btn-sm edit-prod-btn" data-id="${p.id}">Sửa</button>
          </td>
        </tr>
      `;
      }).join('');

      // Gắn sự kiện Bật/Tắt Nổi bật
      tbody.querySelectorAll('.toggle-featured-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const prod = currentProducts.find(p => p.id === id);
          if (prod) {
            await DataService.adminSaveProduct({ ...prod, is_featured: !prod.is_featured });
            showToast('Đã đổi trạng thái nổi bật', 'info');
            loadProducts();
          }
        });
      });

      // Gắn sự kiện Bật/Tắt Kinh doanh
      tbody.querySelectorAll('.toggle-active-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const prod = currentProducts.find(p => p.id === id);
          if (prod) {
            await DataService.adminSaveProduct({ ...prod, is_active: !prod.is_active });
            showToast('Đã đổi trạng thái kinh doanh', 'info');
            loadProducts();
          }
        });
      });

      // Gắn sự kiện Sửa sản phẩm
      tbody.querySelectorAll('.edit-prod-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-id');
          const prod = currentProducts.find(p => p.id === id);
          if (prod) openProductModal(prod);
        });
      });

    } catch (err) {
      console.error(err);
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-error); padding: 20px;">Lỗi tải sản phẩm.</td></tr>`;
    }
  }

  // Mở modal thêm hoặc sửa
  function openProductModal(prod = null) {
    if (!modalEl || !productForm) return;

    document.getElementById('prod-modal-title').textContent = prod ? 'Chỉnh sửa đặc sản' : 'Thêm đặc sản mới';
    document.getElementById('prod-id').value = prod?.id || '';
    document.getElementById('prod-name').value = prod?.name || '';
    document.getElementById('prod-slug').value = prod?.slug || '';
    document.getElementById('prod-price').value = prod?.price_vnd || '';
    document.getElementById('prod-compare-price').value = prod?.compare_at_price_vnd || '';
    document.getElementById('prod-stock').value = prod?.stock_quantity ?? 20;

    const imgUrl = prod?.image_url || '';
    if (imageInput) imageInput.value = imgUrl;
    updateImagePreview(imgUrl);

    document.getElementById('prod-short-desc').value = prod?.short_description || '';
    document.getElementById('prod-desc').value = prod?.description || '';
    document.getElementById('prod-featured').checked = prod?.is_featured || false;
    document.getElementById('prod-active').checked = prod ? prod.is_active : true;

    modalEl.classList.add('open');
  }

  // Sự kiện chọn ảnh từ máy tính
  browseImageBtn?.addEventListener('click', () => {
    imageFileInput?.click();
  });

  imageFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WebP)!', 'error');
      return;
    }

    try {
      showToast('Đang xử lý hình ảnh...', 'info', 1500);
      const compressedDataUrl = await compressImageFile(file);
      if (imageInput) {
        imageInput.value = compressedDataUrl;
      }
      updateImagePreview(compressedDataUrl);
      showToast('Đã tải và tối ưu ảnh thành công!', 'success');
    } catch (err) {
      console.error('Lỗi đọc ảnh:', err);
      showToast('Không thể đọc file ảnh: ' + err.message, 'error');
    } finally {
      imageFileInput.value = '';
    }
  });

  // Sự kiện nhập link ảnh thủ công
  imageInput?.addEventListener('input', () => {
    updateImagePreview(imageInput.value);
  });

  // Sự kiện xoá ảnh
  clearImageBtn?.addEventListener('click', () => {
    if (imageInput) imageInput.value = '';
    updateImagePreview('');
  });

  // Đóng modal
  modalEl?.querySelector('.modal-close')?.addEventListener('click', () => modalEl.classList.remove('open'));
  document.getElementById('prod-cancel-btn')?.addEventListener('click', () => modalEl.classList.remove('open'));

  // Nút Thêm mới
  addBtn?.addEventListener('click', () => openProductModal());

  // Lưu form sản phẩm
  productForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('prod-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const slug = document.getElementById('prod-slug').value.trim();
    const price_vnd = Number(document.getElementById('prod-price').value);
    const compare_at_price_vnd = Number(document.getElementById('prod-compare-price').value) || null;
    const stock_quantity = Number(document.getElementById('prod-stock').value);
    const image_url = (document.getElementById('prod-image').value || '').trim();
    const short_description = document.getElementById('prod-short-desc').value.trim();
    const description = document.getElementById('prod-desc').value.trim();
    const is_featured = document.getElementById('prod-featured').checked;
    const is_active = document.getElementById('prod-active').checked;

    if (!name || price_vnd <= 0) {
      showToast('Vui lòng điền tên và giá hợp lệ', 'error');
      return;
    }

    try {
      const payload = {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        price_vnd,
        compare_at_price_vnd,
        stock_quantity,
        image_url,
        short_description,
        description,
        is_featured,
        is_active
      };
      if (id) payload.id = id;

      await DataService.adminSaveProduct(payload);
      showToast('Đã lưu thông tin sản phẩm thành công!', 'success');
      modalEl.classList.remove('open');
      loadProducts();
    } catch (err) {
      showToast('Lỗi lưu sản phẩm: ' + err.message, 'error');
    }
  });

  // Xuất CSV sản phẩm
  exportBtn?.addEventListener('click', () => {
    if (currentProducts.length === 0) {
      showToast('Không có dữ liệu sản phẩm', 'warning');
      return;
    }
    let csv = 'Tên sản phẩm,Slug,Giá VND,Giá so sánh,Tồn kho,Nổi bật,Kinh doanh\n';
    currentProducts.forEach(p => {
      const cleanName = `"${(p.name || '').replace(/"/g, '""')}"`;
      csv += `${cleanName},${p.slug},${p.price_vnd},${p.compare_at_price_vnd || ''},${p.stock_quantity},${p.is_featured},${p.is_active}\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `san-pham-ut-ut-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast('Đã xuất CSV danh sách sản phẩm', 'success');
  });

  await loadProducts();
}
