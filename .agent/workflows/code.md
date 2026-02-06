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
2.  **🚨 QUAN TRỌNG: Thêm Debug Log (Granular Stepping)**
    *Nguyên tắc: "Log từng nhịp thở của code". Không chỉ Log Input/Output mà phải Log cả quá trình biến đổi.*
    
    -   **STEP 1 - Input:** Log ngay dòng đầu tiên của hàm.
        ```javascript
        console.log('🔍 [Feature] 1. Fn Start. Input:', { rawData });
        ```
    -   **STEP 2 - Transformation:** Log sau mỗi lần biến đổi dữ liệu (Split, Parsed, Calculate).
        ```javascript
        const id = url.split('/')[5];
        console.log('🔍 [Feature] 2. Parsed ID:', id); // <-- BẮT BUỘC
        ```
    -   **STEP 3 - Logic Branch:** Log trong các `if/else`, `for`.
        ```javascript
        if (!id) console.log('❌ [Feature] ID Missing!');
        else console.log('✅ [Feature] ID Valid. Proceeding...');
        ```
    -   **STEP 4 - Output:** Log kết quả cuối cùng trước khi return.
        ```javascript
        console.log('✅ [Feature] 4. Fn End. Result:', result);
        ```
    -   **LƯU Ý:** Với logic phức tạp (ví dụ Form -> API -> Update), phải log dây chuyền để User chụp ảnh là thấy ngay lỗi ở bước nào.

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
