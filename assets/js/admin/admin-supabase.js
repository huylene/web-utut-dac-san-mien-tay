/**
 * Admin Supabase & Account Management Module — Út Út (utut.vn)
 * Xử lý kiểm tra kết nối, tạo tài khoản Admin, đồng bộ dữ liệu với Supabase
 */

import { checkAdminAuth } from './admin-auth.js';
import { DataService } from '../supabase-client.js';
import { SUPABASE_PROJECT_CONFIG } from '../config.js';
import { showToast, copyToClipboard } from '../ui-utils.js';

const DB_CONNECTION_STRING = 'postgresql://postgres:ihvEmCXR!4+3s$U@db.jgdigejbpadlbqocueiz.supabase.co:5432/postgres';

async function initSupabaseAdminPage() {
  await checkAdminAuth();

  const connBadge = document.getElementById('conn-badge');
  const connDetailsBox = document.getElementById('conn-details-box');
  const btnTestConn = document.getElementById('btn-test-conn');
  const btnCopyDbUrl = document.getElementById('btn-copy-dburl');
  const btnSyncData = document.getElementById('btn-sync-data');
  const btnCopySql = document.getElementById('btn-copy-sql');
  const createAdminForm = document.getElementById('create-admin-form');
  const btnCreateAdmin = document.getElementById('btn-create-admin');

  // Copy connection URI
  if (btnCopyDbUrl) {
    btnCopyDbUrl.addEventListener('click', async () => {
      await copyToClipboard(DB_CONNECTION_STRING);
      showToast('Đã sao chép PostgreSQL Connection URI!', 'success');
    });
  }

  // Chức năng kiểm tra kết nối
  async function runHealthCheck() {
    if (connBadge) {
      connBadge.className = 'badge badge-pending';
      connBadge.textContent = 'Đang kiểm tra kết nối...';
    }

    try {
      const health = await DataService.testSupabaseHealth();
      
      const tblCat = document.getElementById('tbl-cat-status');
      const tblProd = document.getElementById('tbl-prod-status');
      const tblOrder = document.getElementById('tbl-order-status');
      const tblProf = document.getElementById('tbl-prof-status');

      if (tblCat) tblCat.textContent = typeof health.tables.categories === 'number' ? `${health.tables.categories} danh mục` : health.tables.categories;
      if (tblProd) tblProd.textContent = typeof health.tables.products === 'number' ? `${health.tables.products} sản phẩm` : health.tables.products;
      if (tblOrder) tblOrder.textContent = typeof health.tables.orders === 'number' ? `${health.tables.orders} đơn hàng` : health.tables.orders;
      if (tblProf) tblProf.textContent = typeof health.tables.profiles === 'number' ? `${health.tables.profiles} hồ sơ admin` : health.tables.profiles;

      if (health.connected || health.pingMs > 0) {
        if (connBadge) {
          connBadge.className = 'badge badge-confirmed';
          connBadge.style.backgroundColor = '#EAF8F0';
          connBadge.style.color = '#27AE60';
          connBadge.textContent = `🟢 Đã kết nối Supabase Cloud (${health.pingMs}ms)`;
        }

        if (connDetailsBox) {
          connDetailsBox.style.display = 'block';
          connDetailsBox.innerHTML = `
            <div style="font-weight: bold; color: #27AE60; margin-bottom: 4px;">✅ Kết nối Supabase Cloud hoạt động bình thường!</div>
            <div style="color: var(--color-text-main);">
              - Tên dự án: <strong>${SUPABASE_PROJECT_CONFIG.projectName}</strong> (Ref: <code>${SUPABASE_PROJECT_CONFIG.projectRef}</code>)<br>
              - Thời gian phản hồi API: <strong>${health.pingMs}ms</strong><br>
              - Endpoint: <code>${health.url}</code>
            </div>
          `;
        }
      } else {
        if (connBadge) {
          connBadge.className = 'badge badge-cancelled';
          connBadge.textContent = '⚠️ Chưa phản hồi hoặc đang chạy Mock';
        }
        if (connDetailsBox) {
          connDetailsBox.style.display = 'block';
          connDetailsBox.style.background = '#FFFBEB';
          connDetailsBox.style.borderColor = '#FEF08A';
          connDetailsBox.innerHTML = `
            <div style="font-weight: bold; color: #D97706; margin-bottom: 4px;">⚠️ Supabase Cloud cần chạy schema.sql:</div>
            <div style="color: var(--color-text-muted); font-size: 13px;">
              ${health.error || 'Các bảng dữ liệu trên Supabase chưa được khởi tạo. Bạn hãy bấm nút "Sao chép toàn bộ mã SQL" và chạy trong Supabase SQL Editor.'}
            </div>
          `;
        }
      }
    } catch (err) {
      if (connBadge) {
        connBadge.className = 'badge badge-cancelled';
        connBadge.textContent = '❌ Lỗi kết nối';
      }
      console.warn('Lỗi kiểm tra Supabase:', err);
    }
  }

  // Gọi kiểm tra ngay khi mở trang
  await runHealthCheck();

  if (btnTestConn) {
    btnTestConn.addEventListener('click', async () => {
      btnTestConn.disabled = true;
      btnTestConn.textContent = 'Đang kiểm tra...';
      await runHealthCheck();
      btnTestConn.disabled = false;
      btnTestConn.textContent = '🔄 Kiểm Tra Kết Nối Ngay';
      showToast('Đã hoàn tất kiểm tra trạng thái Supabase!', 'info');
    });
  }

  // Tạo tài khoản Admin mới
  if (createAdminForm) {
    createAdminForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('new-admin-email').value.trim();
      const password = document.getElementById('new-admin-password').value;

      if (!email || !password || password.length < 6) {
        showToast('Vui lòng nhập email hợp lệ và mật khẩu tối thiểu 6 ký tự!', 'error');
        return;
      }

      btnCreateAdmin.disabled = true;
      btnCreateAdmin.textContent = 'Đang tạo tài khoản trên Supabase...';

      try {
        await DataService.adminCreateSupabaseUser({ email, password });
        showToast(`Đã tạo tài khoản Admin thành công cho ${email}!`, 'success');
        createAdminForm.reset();
        await runHealthCheck();
      } catch (err) {
        showToast('Lỗi tạo tài khoản: ' + (err.message || 'Không thể kết nối'), 'error');
      } finally {
        btnCreateAdmin.disabled = false;
        btnCreateAdmin.textContent = '➕ Tạo Tài Khoản Quản Trị Supabase';
      }
    });
  }

  // Đồng bộ dữ liệu mẫu lên Supabase
  if (btnSyncData) {
    btnSyncData.addEventListener('click', async () => {
      if (!confirm('Bạn có muốn đồng bộ 4 danh mục và 12 sản phẩm đặc sản mẫu lên Supabase Database?')) {
        return;
      }

      btnSyncData.disabled = true;
      btnSyncData.textContent = 'Đang đồng bộ dữ liệu...';

      try {
        const res = await DataService.adminSyncSampleDataToSupabase();
        showToast(`Đồng bộ thành công! Đã nạp ${res.categoriesCount} danh mục và ${res.productsCount} đặc sản.`, 'success');
        await runHealthCheck();
      } catch (err) {
        showToast('Lỗi đồng bộ: ' + (err.message || 'Không thể đồng bộ'), 'error');
      } finally {
        btnSyncData.disabled = false;
        btnSyncData.textContent = '🐟 Đồng Bộ 12 Đặc Sản Mẫu Lên Supabase';
      }
    });
  }

  // Sao chép mã fix-rls-admin.sql
  const btnCopyFixRls = document.getElementById('btn-copy-fix-rls');
  if (btnCopyFixRls) {
    btnCopyFixRls.addEventListener('click', async () => {
      btnCopyFixRls.disabled = true;
      btnCopyFixRls.textContent = 'Đang tải SQL...';

      try {
        const res = await fetch('../supabase/fix-rls-admin.sql');
        const sqlText = await res.text();
        await copyToClipboard(sqlText);
        showToast('Đã sao chép mã SQL mở quyền Admin (fix-rls-admin.sql)! Dán vào Supabase SQL Editor và bấm Run.', 'success');
      } catch (err) {
        showToast('Không thể tải file fix-rls-admin.sql. Vui lòng mở trực tiếp file trong thư mục supabase/.', 'error');
      } finally {
        btnCopyFixRls.disabled = false;
        btnCopyFixRls.textContent = '⚡ Sao Chép Mã Mở Quyền Admin (fix-rls-admin.sql)';
      }
    });
  }

  // Sao chép toàn bộ schema.sql
  if (btnCopySql) {
    btnCopySql.addEventListener('click', async () => {
      btnCopySql.disabled = true;
      btnCopySql.textContent = 'Đang tải SQL...';

      try {
        const res = await fetch('../supabase/schema.sql');
        const sqlText = await res.text();
        await copyToClipboard(sqlText);
        showToast('Đã sao chép toàn bộ mã SQL (schema.sql)! Hãy dán vào Supabase SQL Editor.', 'success');
      } catch (err) {
        showToast('Không thể tải file SQL. Vui lòng mở trực tiếp supabase/schema.sql.', 'error');
      } finally {
        btnCopySql.disabled = false;
        btnCopySql.textContent = '📋 Sao Chép Toàn Bộ Mã SQL (schema.sql)';
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', initSupabaseAdminPage);
