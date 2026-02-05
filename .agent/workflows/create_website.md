---
description: Quy trình Thiết kế & Code Website chuẩn Premium UX/UI (BẮT BUỘC khi User yêu cầu làm web mới)
---

# 🎨 Quy trình Design & Build Website (Premium UX/UI)

Workflow này giúp biến yêu cầu sơ khai của User thành một giao diện **Premium Dark Mode Dashboard** (tương tự mẫu LMS đã làm).

## 🟢 Phase 1: Thấu hiểu (Consultation)
**KHI USER YÊU CẦU:** "Tạo cho tôi một website..." hoặc "Design giao diện..."

**BẠN PHẢI HỎI (Copy câu này):**
> "Để thiết kế giao diện chuẩn Premium cho bạn, tôi cần vài thông tin cốt lõi:
> 1.  **Tên Brand/Dự án:** (Để làm Logo/Header)
> 2.  **Màu chủ đạo (Primary Color):** (Mặc định là Đỏ #DC2626, bạn có muốn đổi sang Xanh dương/Tím/Cam không?)
> 3.  **Cấu trúc chính:** Website bao gồm những mục nào? (Ví dụ: Dashboard, Danh sách User, Cài đặt...)
> 4.  **Dữ liệu quan trọng:** Những con số nào cần User chú ý nhất? (Để đưa lên Cards nổi bật)"

---

## 🟡 Phase 2: Bộ Gen thiết kế (The Design System DNA)
Sau khi User cung cấp thông tin, bạn **BẮT BUỘC** sử dụng các nguyên tắc sau khi code HTML/CSS. **KHÔNG** dùng style mặc định trình duyệt.

### 1. Màu sắc (Color Palette) - Dark Mode Only
-   **Background Chính:** `#050507` (Deep Black - tạo chiều sâu hơn #000).
-   **Card Background:** `#121216` (Nhẹ hơn nền, nổi bật khối).
-   **Border:** `1px solid #1F1F23` (Viền siêu mỏng, tinh tế).
-   **Text Chính:** `White` hoặc `#FAFAFA`.
-   **Text Phụ:** `#A1A1AA` (Zinc 400 - Đọc dịu mắt, không dùng Gray thường).
-   **Accent:** Dùng Gradient cho trạng thái Active (Ví dụ: `linear-gradient(90deg, rgba(220,38,38,0.15), transparent)`).

### 2. Hiệu ứng (Effects) - The "Premium" Feel
-   **Glassmorphism:** Dùng cho Header/Modal.
    ```css
    backdrop-filter: blur(10px);
    background: rgba(5,5,7,0.8);
    ```
-   **Glow:** Dùng cho Badge hoặc Card Hover.
    ```css
    box-shadow: 0 0 20px rgba(VarColor, 0.1);
    ```
-   **Transition:** Mượt mà cho mọi tương tác.
    ```css
    transition: all 0.2s ease-in-out;
    ```

### 3. Typography & Icons
-   **Font:** Inter, Outfit, hoặc System Font (San-serif modern).
-   **Icons:** **Lucide Icons** (Bắt buộc). Nét mảnh (Stroke 1.5-2px), size chuẩn 16px-24px.
-   **Uppercase Label:** Các tiêu đề phụ dùng `font-size: 10-11px; text-transform: uppercase; letter-spacing: 0.05em;`.

### 4. Layout (Grid & Flexbox)
-   **Dashboard:** Luôn dùng CSS Grid `grid-template-columns: repeat(4, 1fr)` cho các Card thống kê.
-   **Sidebar:** Fixed width (240-280px), Sticky position.

---

## 🔴 Phase 3: Thực thi (Implementation)
Khi viết code (file `index.html` hoặc `style.css`), hãy copy cấu trúc CSS chuẩn này làm nền tảng:

```css
/* --- CORE VARIABLES --- */
:root {
  --bg-dark: #050507;
  --card-bg: #121216;
  --border: #1F1F23;
  --text-main: #FFFFFF;
  --text-sub: #A1A1AA;
  --accent: #DC2626; /* Màu user chọn */
  --accent-glow: rgba(220, 38, 38, 0.15);
}

body {
  background-color: var(--bg-dark);
  color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  margin: 0;
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* --- COMPONENT: CARD --- */
.premium-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s;
}
.premium-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255,255,255,0.1);
}

/* --- COMPONENT: BUTTON --- */
.btn-primary {
  background: var(--accent);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
```

## 🔵 Phase 4: Kiểm tra UX (Checklist)
Trước khi giao cho User, tự check:
1.  [ ] **Độ tương phản:** Chữ phụ (`#A1A1AA`) có dễ đọc trên nền tối không?
2.  **Spacing:** Padding trong Card tối thiểu `20px-24px` (Không làm chật chội).
3.  **Empty State:** Nếu không có dữ liệu, hiện Icon + Thông báo đẹp (đừng để trống trơn).
4.  **Loading:** Có Skeleton hoặc Spinner khi load dữ liệu không?
