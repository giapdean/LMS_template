---
description: Quy trình code tính năng mới (BẮT BUỘC thêm Debug Log)
---

# Quy trình Code & Implement Tính năng

Mỗi khi thực hiện code một tính năng mới hoặc fix bug, BẮT BUỘC phải tuân thủ việc thêm Log để dễ dàng debug sau này.

## 1. Phân tích & Chuẩn bị
1.  Đọc kỹ yêu cầu của user.
2.  Xác định các file cần sửa đổi.
3.  Xác định luồng dữ liệu (Data Flow): Từ đâu -> Xử lý gì -> Ra đâu.

## 2. Thực hiện Code (Implementation)
1.  Viết code logic chính.
2.  **🚨 QUAN TRỌNG: Thêm Debug Log**
    -   **Log Input:** Log dữ liệu đầu vào của hàm/API.
        ```javascript
        console.log('🔍 [FeatureName] Input:', { param1, param2 });
        ```
    -   **Log Process:** Log các bước xử lý quan trọng (nếu logic phức tạp).
        ```javascript
        console.log('🔍 [FeatureName] Processing step X...', data);
        ```
    -   **Log Output:** Log kết quả trả về hoặc dữ liệu cuối cùng.
        ```javascript
        console.log('✅ [FeatureName] Success:', result);
        ```
    -   **Log Error:** Luôn bọc `try-catch` ở các điểm rủi ro và log lỗi chi tiết.
        ```javascript
        console.error('❌ [FeatureName] Error:', error);
        ```

## 3. Kiểm tra & Verify (Theo chuẩn verify-code)
1.  **Kiểm tra Logic Flow (Early Return):**
    -   Trace code từ đầu đến cuối.
    -   Đảm bảo các lệnh `return` sớm không chặn luồng chính vô lý.
2.  **Kiểm tra Data Flow (Tên biến):**
    -   So sánh tên field Backend trả về vs Frontend sử dụng (ví dụ: `lessonAnalytics` vs `lessons`).
    -   Dùng grep để confirm nhất quán.
3.  **Kiểm tra UI/CSS:**
    -   `z-index`: Modal/Dropdown có bị che không?
    -   `display`/`opacity`: Element có bị ẩn do CSS mặc định không?
4.  **Kiểm tra Runtime:**
    -   Chạy thử tính năng.
    -   Mở Console (F12) check log `🔍 [FeatureName]`.
    -   Đảm bảo không có lỗi đỏ (ReferenceError, Undefined).

## 4. Deploy & Bàn giao
1.  Thực hiện `/push` (Deploy Frontend + Backend).
2.  Thông báo cho user và hướng dẫn cách check log nếu có lỗi.
