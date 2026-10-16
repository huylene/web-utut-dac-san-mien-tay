/**
 * UI & Security Utilities — Út Út (utut.vn)
 * XSS Prevention, Toast Notification, Formatting, Clipboard
 */

/**
 * Định dạng số tiền sang định dạng tiền tệ Việt Nam (VNĐ)
 * @param {number|string} amount
 * @returns {string}
 */
export function formatVND(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Chống XSS bằng cách escape các ký tự đặc biệt trong chuỗi HTML
 * Tuân thủ quy định 06-ADMIN-AND-SECURITY.md: không nối chuỗi trực tiếp vào innerHTML
 * @param {string} unsafe
 * @returns {string}
 */
export function escapeHtml(unsafe) {
  if (unsafe === null || unsafe === undefined) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Hiển thị thông báo Toast trên màn hình
 * @param {string} message
 * @param {'info'|'success'|'error'|'warning'} type
 * @param {number} duration
 */
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  toast.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-weight: bold; font-size: 1.1rem;">${iconMap[type] || 'ℹ'}</span>
      <span>${escapeHtml(message)}</span>
    </div>
    <button class="toast-close" aria-label="Đóng">&times;</button>
  `;

  const closeBtn = toast.querySelector('.toast-close');
  closeBtn.addEventListener('click', () => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

/**
 * Sao chép văn bản vào bộ nhớ đệm
 * @param {string} text
 * @param {string} successMessage
 */
export async function copyToClipboard(text, successMessage = 'Đã sao chép vào bộ nhớ đệm!') {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    showToast(successMessage, 'success');
  } catch (err) {
    showToast('Không thể sao chép, vui lòng thử lại', 'error');
  }
}

/**
 * Định dạng thời gian ISO sang giờ Việt Nam
 * @param {string} isoString
 * @returns {string}
 */
export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Tạo chuỗi sao đánh giá
 * @param {number} rating
 * @returns {string}
 */
export function renderRatingStars(rating) {
  const fullStar = '★';
  const emptyStar = '☆';
  const stars = Math.max(1, Math.min(5, Math.round(rating || 5)));
  return fullStar.repeat(stars) + emptyStar.repeat(5 - stars);
}

/**
 * Khởi tạo menu di động trên header
 */
export function initMobileNav() {
  const toggleBtn = document.querySelector('.mobile-toggle');
  const navMenu = document.querySelector('.nav-menu');
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      const isOpen = navMenu.classList.contains('open');
      toggleBtn.setAttribute('aria-expanded', isOpen);
    });

    // Đóng khi click ngoài
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !toggleBtn.contains(e.target) && navMenu.classList.contains('open')) {
        navMenu.classList.remove('open');
      }
    });
  }
}
