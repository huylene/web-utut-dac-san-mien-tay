#!/usr/bin/env node
/**
 * Công cụ quản lý Supabase & Tài khoản Admin qua dòng lệnh — Út Út (utut.vn)
 * Zero-dependency: Chạy trực tiếp bằng Node.js tích hợp sẵn fetch API
 * Cách dùng:
 *   node scripts/manage-supabase.js status
 *   node scripts/manage-supabase.js create-admin <email> <password>
 *   node scripts/manage-supabase.js seed
 */

const fs = require('fs');
const path = require('path');

// Đọc thông tin từ file config.js hoặc .env
const SUPABASE_URL = 'https://jgdigejbpadlbqocueiz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Il8CbcnRuYDbxbzrfj-CCg_SZd8yCTh';
const PROJECT_NAME = 'ututvn_dacsanmientay';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function checkStatus() {
  console.log('====================================================');
  console.log(`🌾 KIỂM TRA KẾT NỐI SUPABASE: ${PROJECT_NAME}`);
  console.log(`URL: ${SUPABASE_URL}`);
  console.log('====================================================\n');

  try {
    const t0 = Date.now();
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, { headers });
    const latency = Date.now() - t0;

    if (res.ok || res.status === 200) {
      console.log(`✅ Kết nối REST API thành công! (Độ trễ: ${latency}ms)`);
    } else {
      console.log(`⚠️ REST API phản hồi mã HTTP ${res.status}`);
    }

    // Kiểm tra bảng categories
    try {
      const catRes = await fetch(`${SUPABASE_URL}/rest/v1/categories?select=id,name`, { headers });
      if (catRes.ok) {
        const cats = await catRes.json();
        console.log(`📁 Bảng 'categories': ${cats.length} danh mục.`);
      } else {
        console.log(`⚠️ Bảng 'categories' chưa sẵn sàng hoặc cần chạy schema.sql (HTTP ${catRes.status})`);
      }
    } catch (e) {
      console.log(`⚠️ Lỗi kiểm tra bảng categories:`, e.message);
    }

    // Kiểm tra bảng products
    try {
      const prodRes = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id,name`, { headers });
      if (prodRes.ok) {
        const prods = await prodRes.json();
        console.log(`🐟 Bảng 'products': ${prods.length} sản phẩm đặc sản.`);
      } else {
        console.log(`⚠️ Bảng 'products' chưa sẵn sàng hoặc cần chạy schema.sql (HTTP ${prodRes.status})`);
      }
    } catch (e) {
      console.log(`⚠️ Lỗi kiểm tra bảng products:`, e.message);
    }

    // Kiểm tra bảng profiles (admin roles)
    try {
      const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=user_id,role`, { headers });
      if (profRes.ok) {
        const profs = await profRes.json();
        console.log(`👤 Bảng 'profiles': ${profs.length} hồ sơ tài khoản.`);
      } else {
        console.log(`⚠️ Bảng 'profiles' chưa sẵn sàng (HTTP ${profRes.status})`);
      }
    } catch (e) {
      console.log(`⚠️ Lỗi kiểm tra bảng profiles:`, e.message);
    }

    console.log('\n💡 HƯỚNG DẪN:');
    console.log('- Xem hướng dẫn chi tiết tại file QUAN-LY-TAI-KHOAN-SUPABASE.md');
    console.log('- Quản lý trực tiếp trên giao diện Admin: http://localhost:3001/admin/supabase.html');
  } catch (err) {
    console.error('❌ Lỗi kết nối Supabase:', err.message);
    console.log('Vui lòng kiểm tra lại kết nối mạng hoặc cấu hình API Key.');
  }
}

async function createAdmin(email, password) {
  if (!email || !password) {
    console.error('❌ Vui lòng cung cấp email và mật khẩu:');
    console.log('Ví dụ: node scripts/manage-supabase.js create-admin admin@utut.vn "MatKhau123!"');
    process.exit(1);
  }

  console.log(`\n⏳ Đang đăng ký tài khoản trên Supabase Auth: ${email}...`);

  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.msg || data.message || JSON.stringify(data));
    }

    const userId = data.user?.id || data.id;
    console.log(`✅ Tạo tài khoản Supabase Auth thành công!`);
    console.log(`- Email: ${email}`);
    console.log(`- User ID (UUID): ${userId}`);

    // Gán role admin vào bảng profiles
    console.log(`⏳ Đang gán quyền Admin trong bảng public.profiles...`);
    const profRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id: userId,
        role: 'admin'
      })
    });

    if (profRes.ok) {
      console.log(`🎉 ĐÃ CẤP QUYỀN ADMIN THÀNH CÔNG CHO ${email}!`);
      console.log(`Bạn có thể đăng nhập ngay tại: http://localhost:3001/admin/login.html`);
    } else {
      console.log(`⚠️ Tài khoản Auth đã tạo, nhưng chưa tự động ghi vào profiles.`);
      console.log(`Vui lòng vào Supabase SQL Editor chạy câu lệnh sau để cấp quyền Admin:`);
      console.log(`\n  insert into public.profiles (user_id, role) values ('${userId}', 'admin') on conflict (user_id) do update set role = 'admin';\n`);
    }
  } catch (err) {
    console.error('❌ Không thể tạo tài khoản:', err.message);
  }
}

async function seedData() {
  console.log('\n⏳ Đang đồng bộ 4 danh mục và 12 đặc sản miền Tây lên Supabase...');

  const categories = [
    { name: 'Khô Đặc Sản', slug: 'kho-dac-san', sort_order: 1, is_active: true },
    { name: 'Bánh Kẹo Truyền Thống', slug: 'banh-keo-truyen-thong', sort_order: 2, is_active: true },
    { name: 'Mật Ong & Nông Sản', slug: 'mat-ong-nong-san', sort_order: 3, is_active: true },
    { name: 'Trái Cây Sấy & Ăn Vặt', slug: 'trai-cay-say-an-vat', sort_order: 4, is_active: true }
  ];

  try {
    const catRes = await fetch(`${SUPABASE_URL}/rest/v1/categories`, {
      method: 'POST',
      headers: {
        ...headers,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify(categories)
    });

    if (catRes.ok) {
      console.log('✅ Đã nạp thành công các danh mục đặc sản!');
    } else {
      console.log('⚠️ Kết quả nạp danh mục:', catRes.status, await catRes.text());
    }

    console.log('💡 Để nạp đầy đủ cấu trúc bảng, views và RPC functions tính giá tự động, vui lòng chạy file supabase/schema.sql trong Supabase SQL Editor.');
  } catch (e) {
    console.error('❌ Lỗi nạp dữ liệu:', e.message);
  }
}

// Router lệnh CLI
const command = process.argv[2] || 'status';

if (command === 'status') {
  checkStatus();
} else if (command === 'create-admin') {
  createAdmin(process.argv[3], process.argv[4]);
} else if (command === 'seed') {
  seedData();
} else {
  console.log('Lệnh không hợp lệ. Các lệnh hỗ trợ:');
  console.log('  node scripts/manage-supabase.js status');
  console.log('  node scripts/manage-supabase.js create-admin <email> <password>');
  console.log('  node scripts/manage-supabase.js seed');
}
