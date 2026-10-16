/**
 * Admin Auth Guard — Út Út (utut.vn)
 * Kiểm tra phiên đăng nhập và bảo vệ trang Admin
 * Tuân thủ 06-ADMIN-AND-SECURITY.md
 */

import { DataService } from '../supabase-client.js';

export async function checkAdminAuth() {
  const session = await DataService.getAdminSession();
  const currentPath = window.location.pathname;

  if (!session) {
    if (!currentPath.endsWith('login.html')) {
      window.location.href = 'login.html';
      return null;
    }
    return null;
  }

  // Nếu đang ở login.html mà đã đăng nhập -> chuyển sang index.html
  if (currentPath.endsWith('login.html')) {
    window.location.href = 'index.html';
    return session;
  }

  // Cập nhật thông tin admin trên topbar
  const adminEmailEl = document.getElementById('admin-user-email');
  if (adminEmailEl) {
    adminEmailEl.textContent = session.email || 'Admin';
  }

  // Gắn sự kiện đăng xuất
  const logoutBtn = document.getElementById('admin-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await DataService.adminLogout();
      window.location.href = 'login.html';
    });
  }

  return session;
}
