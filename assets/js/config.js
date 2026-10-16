/**
 * Cấu hình hệ thống — config.js
 * CHỈ CHỨA CẤU HÌNH PUBLIC (Publishable/Anon key).
 * Khi chưa thay thế YOUR_PROJECT_REF, website sẽ tự động chạy chế độ Mock Store Demo
 * để kiểm thử giao diện và chức năng mà không bị lỗi mạng.
 */

export const SUPABASE_URL = "https://jgdigejbpadlbqocueiz.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Il8CbcnRuYDbxbzrfj-CCg_SZd8yCTh";

// Cấu hình dự án Supabase cho trang Admin
export const SUPABASE_PROJECT_CONFIG = {
  projectName: "ututvn_dacsanmientay",
  projectRef: "jgdigejbpadlbqocueiz",
  url: "https://jgdigejbpadlbqocueiz.supabase.co",
  dbHost: "db.jgdigejbpadlbqocueiz.supabase.co",
  dbPort: 5432,
  dbName: "postgres",
  dbUser: "postgres"
};

// Thông tin tài khoản nhận chuyển khoản VietQR của tiệm Út Út
export const PAYMENT_CONFIG = {
  bankId: "MB",                         // MB, VCB, ICB, ACB, VPB,...
  bankName: "Ngân hàng Quân Đội (MB Bank)",
  accountNo: "888899992222",              // Số tài khoản ngân hàng (Demo/Fake)
  accountName: "TIEM DAC SAN UT UT",    // Tên chủ tài khoản
  qrTemplate: "compact2"                // Giao diện VietQR
};

// Thông tin liên hệ cửa hàng
export const STORE_CONFIG = {
  name: "Út Út — Đặc sản miền Tây",
  domain: "utut.vn",
  hotline: "0814 286 4xx",
  email: "chao@utut.vn",
  address: "123 Đường 30 Tháng 4, Phường Hưng Lợi, Quận Ninh Kiều, TP. Cần Thơ",
  youtubeEmbedUrl: "https://www.youtube.com/embed/lr75kOuiZ-o?si=-7BKYyana0CKE7Fb",
  mapsUrl: "https://maps.google.com/?q=Ninh+Kiều+Cần+Thơ"
};
