/**
 * File mẫu cấu hình — config.example.js
 * Sao chép thành config.js và điền thông tin Supabase của bạn.
 * CHỈ CHỨA CẤU HÌNH PUBLIC (Publishable/Anon key).
 * TUYỆT ĐỐI KHÔNG ĐƯA service_role key vào đây.
 */

export const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY";

// Thông tin tài khoản nhận chuyển khoản VietQR của tiệm Út Út
export const PAYMENT_CONFIG = {
  bankId: "MB",                         // Mã ngân hàng theo chuẩn VietQR (MB, VCB, ICB, ACB, VPB,...)
  bankName: "Ngân hàng Quân Đội (MB Bank)",
  accountNo: "888899992222",              // Số tài khoản nhận tiền (Demo/Fake)
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
