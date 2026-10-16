/**
 * Script chạy schema.sql tự động lên cơ sở dữ liệu Supabase PostgreSQL
 * Chạy lệnh: node scripts/migrate.js
 */

const fs = require('fs');
const path = require('path');

async function runMigration() {
  let pg;
  try {
    pg = require('pg');
  } catch (e) {
    console.error('❌ Thư viện "pg" chưa được cài đặt. Đang tự động cài đặt...');
    const { execSync } = require('child_process');
    execSync('npm install --no-save --no-audit --no-fund pg', { stdio: 'inherit' });
    pg = require('pg');
  }

  const { Client } = pg;
  const sqlPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Thử kết nối direct và pooler
  const connectionConfigs = [
    {
      name: 'Direct Connection (Port 5432)',
      connectionString: 'postgresql://postgres:ihvEmCXR!4+3s$U@db.jgdigejbpadlbqocueiz.supabase.co:5432/postgres',
      ssl: { rejectUnauthorized: false }
    },
    {
      name: 'Session Pooler (Port 5432)',
      connectionString: 'postgresql://postgres.jgdigejbpadlbqocueiz:ihvEmCXR!4+3s$U@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres',
      ssl: { rejectUnauthorized: false }
    },
    {
      name: 'Transaction Pooler (Port 6543)',
      connectionString: 'postgresql://postgres.jgdigejbpadlbqocueiz:ihvEmCXR!4+3s$U@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
      ssl: { rejectUnauthorized: false }
    }
  ];

  let client = null;
  let connected = false;

  for (const config of connectionConfigs) {
    console.log(`⏳ Đang thử kết nối: ${config.name}...`);
    client = new Client(config);
    try {
      await client.connect();
      console.log(`✅ Kết nối thành công qua ${config.name}!`);
      connected = true;
      break;
    } catch (err) {
      console.warn(`⚠️ Kết nối ${config.name} không thành công: ${err.message}`);
    }
  }

  if (!connected || !client) {
    console.error('\n❌ Không thể kết nối trực tiếp đến PostgreSQL Supabase từ môi trường này.');
    console.log('💡 HƯỚNG DẪN 1-CLICK TẠO BẢNG TRÊN SUPABASE:');
    console.log('1. Vào Supabase Dashboard -> Bấm menu "SQL Editor" ở thanh bên trái.');
    console.log('2. Bấm "New query".');
    console.log('3. Copy toàn bộ nội dung file "supabase/schema.sql" và dán vào, sau đó bấm "Run".');
    process.exit(1);
  }

  try {
    console.log('⏳ Đang thực thi schema.sql và khởi tạo dữ liệu đặc sản...');
    await client.query(sql);
    console.log('🎉 KHỞI TẠO CƠ SỞ DỮ LIỆU THÀNH CÔNG!');

    // Kiểm tra số lượng bảng đã tạo
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('\n📋 DANH SÁCH BẢNG ĐÃ TẠO TRONG SCHEMA PUBLIC:');
    tablesRes.rows.forEach(r => console.log(`  ✓ ${r.table_name}`));

    // Kiểm tra số sản phẩm
    const prodRes = await client.query(`SELECT count(*) FROM public.products;`);
    console.log(`\n🐟 Đã nạp sẵn ${prodRes.rows[0].count} sản phẩm đặc sản miền Tây vào database!`);

  } catch (err) {
    console.error('❌ Lỗi khi thực thi SQL:', err.message);
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);
