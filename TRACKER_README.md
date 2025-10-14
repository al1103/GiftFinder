# 🔍 Client Telemetry Tracker - Hướng dẫn sử dụng

## Mô tả
Trang web tự động thu thập và gửi thông tin client đến Telegram ngay khi được tải, không cần người dùng nhập gì.

## Cách sử dụng

### Bước 1: Cấu hình Telegram Bot

1. **Tạo Telegram Bot:**
   - Mở Telegram và tìm `@BotFather`
   - Gửi lệnh `/newbot`
   - Đặt tên cho bot của bạn
   - Lưu lại **Bot Token** (dạng: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

2. **Lấy Chat ID:**
   - Gửi tin nhắn bất kỳ cho bot của bạn
   - Truy cập: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Tìm giá trị `"chat":{"id":123456789}` - đây là Chat ID của bạn

### Bước 2: Cập nhật config.js

Mở file `config.js` và thay thế các giá trị:

```javascript
export const TELEGRAM_BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'; // Token bot của bạn
export const TELEGRAM_CHAT_ID = '123456789'; // Chat ID của bạn
export const TELEGRAM_API_URL = 'https://api.telegram.org';
export const IP_LOOKUP_URL = 'https://ipapi.co/json/'; // Hoặc để trống '' nếu không cần IP lookup
```

### Bước 3: Sử dụng

1. **Mở file tracker.html trong trình duyệt**
2. Trang sẽ tự động:
   - Thu thập thông tin client
   - Hiển thị thông tin đã thu thập
   - Gửi đến Telegram của bạn

## Thông tin được thu thập

### 📍 IP & Vị trí (nếu bật IP_LOOKUP_URL)
- IP công khai
- Quốc gia, thành phố
- Nhà mạng (ISP/Organization)
- Timezone, mã bưu điện, ASN

### 🖥️ Trình duyệt & Hệ thống
- User Agent đầy đủ
- Platform (Windows, macOS, Linux, Android, iOS...)
- Vendor (Google, Apple...)
- Ngôn ngữ ưu tiên
- Timezone
- Số lõi CPU
- Điểm chạm (touch points)

### 📱 Màn hình & Thiết bị
- Độ phân giải màn hình
- Kích thước viewport
- Độ sâu màu (color depth)
- Tỷ lệ pixel (device pixel ratio)
- Hướng màn hình (orientation)

### 💡 Client Hints (nếu trình duyệt hỗ trợ)
- Brands (Chrome, Edge, Chromium...)
- Mobile hay Desktop
- Platform version
- Architecture (x86, ARM...)
- Bitness (32-bit, 64-bit)
- Model (tên thiết bị nếu có)

### 🌐 Thông tin Mạng
- Loại kết nối (4G, 3G, WiFi...)
- Tốc độ download (downlink)
- RTT (Round Trip Time)
- Save Data mode

### ⚡ Performance Timing
- DNS Lookup time
- TCP Connection time
- Time to First Byte (TTFB)
- DOM Content Loaded
- Total Load Time
- Transfer Size

### ✨ Tính năng Trình duyệt
- Cookies enabled
- Do Not Track
- Online/Offline status
- Touch support
- LocalStorage, SessionStorage
- WebGL support

### 🔗 Navigation & Tracking
- **Referrer**: Trang web người dùng truy cập trước đó
- **Current URL**: URL hiện tại
- **Cookies**: Cookie của chính trang này

### ⚠️ Telemetry & Errors
- JavaScript errors (nếu có)
- Promise rejections
- Timestamp của mỗi lỗi

## Privacy & Security

⚠️ **Lưu ý quan trọng:**
- Công cụ này thu thập nhiều thông tin cá nhân
- Chỉ sử dụng cho mục đích hợp pháp (analytics, debugging...)
- Tuân thủ GDPR, CCPA và các quy định về quyền riêng tư
- Nên thông báo cho người dùng về việc thu thập dữ liệu

## Giới hạn

### Same-Origin Policy
- ❌ **KHÔNG THỂ** đọc cookie của website khác
- ❌ **KHÔNG THỂ** truy cập LocalStorage của domain khác
- ✅ Chỉ đọc được cookie và storage của chính trang này

### Client Hints
- Chỉ hoạt động trên trình duyệt Chromium (Chrome, Edge, Opera...)
- Firefox và Safari không hỗ trợ User-Agent Client Hints

### Referrer Policy
- Header `Referrer` có thể bị ẩn hoặc cắt ngắn tùy thuộc vào:
  - Referrer-Policy của trang gốc
  - Cài đặt privacy của trình duyệt
  - Extension chặn tracking

### IP Lookup
- Dịch vụ `ipapi.co` có giới hạn: 1000 requests/ngày (free tier)
- Có thể thay bằng dịch vụ khác:
  - `https://ipapi.co/json/`
  - `https://ip-api.com/json/`
  - `https://ipinfo.io/json`

## Troubleshooting

### Không gửi được Telegram
1. Kiểm tra Bot Token và Chat ID trong `config.js`
2. Đảm bảo đã gửi ít nhất 1 tin nhắn cho bot
3. Mở Console (F12) để xem lỗi

### Không lấy được IP
1. Kiểm tra `IP_LOOKUP_URL` trong `config.js`
2. Có thể bị giới hạn rate limit - đợi một lúc
3. Thử dịch vụ IP lookup khác

### Client Hints trống
- Trình duyệt không hỗ trợ (Firefox, Safari)
- Đây là tính năng mới, chỉ có trên Chromium

## Files

- `tracker.html` - Trang tracking (MỞ FILE NÀY)
- `assets/tracker.js` - Logic thu thập và gửi dữ liệu
- `config.js` - Cấu hình Telegram Bot
- `index.html` - Trang GiftFinder gốc (không liên quan)

## Demo Message Format

```
🔍 Thông tin Client Telemetry

⏰ Thời gian: 14/10/2025, 10:30:45
🌐 URL: https://example.com/tracker.html

📍 Thông tin IP & Vị trí
  • IP Address: 203.123.45.67
  • Location: Hanoi, Hanoi, Vietnam
  • Country Code: VN
  • ISP/Organization: Viettel
  • Timezone: Asia/Ho_Chi_Minh

🖥️ Trình duyệt & Hệ thống
  • User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64)...
  • Platform: Win32
  • Language: vi-VN
  • CPU Cores: 8

📱 Màn hình & Thiết bị
  • Screen Resolution: 1920x1080
  • Viewport Size: 1536x864
  • Pixel Ratio: 1

⚡ Performance Timing (ms)
  • Time to First Byte: 45
  • Total Load Time: 523

✅ Không có lỗi
```

---

**Tạo bởi:** Client Telemetry Tracker
**Phiên bản:** 1.0
**Ngày:** 14/10/2025
