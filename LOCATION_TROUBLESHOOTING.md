# Hướng dẫn khắc phục lỗi truy cập vị trí

## Vấn đề: ErrorCode 1 - Location access was denied

Khi bạn thấy thông báo lỗi này, có nghĩa là trình duyệt đã từ chối quyền truy cập vị trí của ứng dụng.

## Cách khắc phục:

### 1. Chrome/Edge

- Nhấp vào biểu tượng khóa (🔒) bên trái thanh địa chỉ
- Chọn "Cho phép" cho mục "Vị trí"
- Tải lại trang

### 2. Firefox

- Nhấp vào biểu tượng vị trí (📍) bên trái thanh địa chỉ
- Chọn "Cho phép"
- Tải lại trang

### 3. Safari

- Vào Safari → Tùy chọn (Preferences)
- Chọn tab "Bảo mật" (Security)
- Đảm bảo "Cho phép truy cập vị trí" được bật
- Tải lại trang

### 4. Trên điện thoại

- **iOS**: Cài đặt → Quyền riêng tư → Dịch vụ vị trí → Safari → Cho phép
- **Android**: Cài đặt → Ứng dụng → Safari/Chrome → Quyền → Vị trí → Cho phép

## Các lỗi khác:

### ErrorCode 2 - Position unavailable

- Kiểm tra GPS/Location Services đã được bật trên thiết bị
- Đảm bảo kết nối internet ổn định
- Thử lại sau vài giây

### ErrorCode 3 - Timeout

- Yêu cầu vị trí bị timeout
- Thử lại hoặc kiểm tra kết nối mạng

## Fallback tự động

Ứng dụng sẽ tự động thử lấy vị trí qua IP address nếu GPS không khả dụng, tuy nhiên độ chính xác sẽ thấp hơn.

## Cache vị trí

- Ứng dụng sẽ cache vị trí trong **5 phút** để tránh yêu cầu quyền liên tục
- Sau khi cấp quyền lần đầu, ứng dụng sẽ sử dụng vị trí đã cache
- Nếu cần vị trí mới, hãy đợi 5 phút hoặc tải lại trang

## Tại sao vẫn yêu cầu vị trí dù đã cấp quyền?

Có thể do:

1. **Cache đã hết hạn** (sau 5 phút)
2. **Trình duyệt đã xóa cache** (tắt/mở lại trình duyệt)
3. **maximumAge setting** trước đây được đặt = 0 (đã sửa)

## Vẫn gặp vấn đề?

Nếu vẫn không thể lấy được vị trí, ứng dụng vẫn hoạt động bình thường nhưng sẽ không có thông tin vị trí trong báo cáo.
