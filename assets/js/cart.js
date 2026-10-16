/**
 * Cart Manager — Út Út (utut.vn)
 * Quản lý giỏ hàng qua localStorage (chỉ lưu productId và quantity)
 * Tuân thủ đặc tả 05-FEATURE-SPECS.md: Đồng bộ giá mới nhất từ Database khi mở giỏ
 */

import { DataService } from './supabase-client.js';
import { showToast } from './ui-utils.js';

const CART_STORAGE_KEY = 'utut_cart_items_v1';

export const CartManager = {
  /**
   * Lấy danh sách thô từ localStorage
   * @returns {Array<{ productId: string, quantity: number }>}
   */
  getItems() {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('[Cart] Lỗi đọc giỏ hàng:', e);
      return [];
    }
  },

  /**
   * Lưu giỏ hàng vào localStorage
   */
  saveItems(items) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    this.updateBadges();
    window.dispatchEvent(new CustomEvent('utut:cart-updated', { detail: { items } }));
  },

  /**
   * Tổng số lượng món trong giỏ
   */
  getCount() {
    const items = this.getItems();
    return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  },

  /**
   * Thêm sản phẩm vào giỏ
   */
  addItem(productId, quantity = 1, showFeedback = true) {
    if (!productId || quantity <= 0) return;
    const items = this.getItems();
    const existing = items.find(i => i.productId === productId);

    if (existing) {
      existing.quantity += Number(quantity);
    } else {
      items.push({ productId, quantity: Number(quantity) });
    }

    this.saveItems(items);
    if (showFeedback) {
      showToast('Đã thêm sản phẩm vào giỏ hàng!', 'success');
    }
  },

  /**
   * Cập nhật số lượng
   */
  updateQuantity(productId, quantity) {
    let items = this.getItems();
    const targetQty = Number(quantity);

    if (targetQty <= 0) {
      this.removeItem(productId);
      return;
    }

    const item = items.find(i => i.productId === productId);
    if (item) {
      item.quantity = targetQty;
      this.saveItems(items);
    }
  },

  /**
   * Xóa một sản phẩm
   */
  removeItem(productId) {
    let items = this.getItems();
    items = items.filter(i => i.productId !== productId);
    this.saveItems(items);
    showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'info');
  },

  /**
   * Làm trống giỏ hàng
   */
  clear() {
    localStorage.removeItem(CART_STORAGE_KEY);
    this.updateBadges();
    window.dispatchEvent(new CustomEvent('utut:cart-updated', { detail: { items: [] } }));
  },

  /**
   * Cập nhật số đếm trên badge giỏ hàng ở header
   */
  updateBadges() {
    const count = this.getCount();
    const badges = document.querySelectorAll('.cart-badge');
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  /**
   * Lấy chi tiết giỏ hàng đầy đủ (kết hợp giá mới nhất từ Database)
   */
  async getDetailedCart() {
    const rawItems = this.getItems();
    if (rawItems.length === 0) {
      return { items: [], subtotalVND: 0 };
    }

    const detailedItems = [];
    let subtotal = 0;

    for (const raw of rawItems) {
      const product = await DataService.getProductByIdOrSlug(raw.productId);
      if (product && product.is_active) {
        const lineTotal = product.price_vnd * raw.quantity;
        subtotal += lineTotal;
        detailedItems.push({
          product,
          quantity: raw.quantity,
          lineTotalVND: lineTotal
        });
      }
    }

    return {
      items: detailedItems,
      subtotalVND: subtotal
    };
  }
};

// Tự động gắn cập nhật badge khi tải trang
document.addEventListener('DOMContentLoaded', () => {
  CartManager.updateBadges();
});
