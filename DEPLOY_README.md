# 📘 Hướng dẫn Cài đặt & Deploy Tự động

Dành cho người mới bắt đầu, chưa cài đặt gì cả.

## 🛠 Bước 1: Chuẩn bị mã nguồn (Quan trọng)

1. **GitHub**: Hãy đảm bảo bạn đang đứng trong thư mục dự án của BẠN (chứa file `index.html`).
2. **Git**: Thư mục này phải là một **Git Repository** và đã được kết nối với GitHub của bạn.
   - Nếu chưa, hãy tạo repo trên GitHub và Clone về máy tính.
   *(Lưu ý: Tool này chỉ hoạt động khi bạn đã có sẵn Git trong thư mục dự án)*

## ⚙️ Bước 2: Chạy lệnh cài đặt
Sau khi đã có code trong máy, bạn mở chat với AI và gõ:
> **`/setup-deploy`**

Hệ thống sẽ tự động:
- Cài đặt công cụ Clasp.
- Tải code từ GitHub về.
- Tạo các thư mục cần thiết.

## 🔑 Bước 3: Đăng nhập & Kết nối (Thủ công 1 lần)
Vì lý do bảo mật, AI không thể đăng nhập thay bạn. Hãy làm theo hướng dẫn hiển thị trên màn hình sau khi chạy bước 2:
1. Chạy lệnh `clasp login` để đăng nhập Google.
2. Lấy **Script ID** từ link Google Sheet của bạn.
3. Cập nhật ID vào file cấu hình (AI sẽ chỉ chỗ).

---

## 🚀 Bước 4: Sử dụng hàng ngày
Từ nay về sau, mỗi khi code xong, bạn chỉ cần gõ:
> **`/push`**

Hệ thống sẽ tự động làm tất cả mọi thứ!
