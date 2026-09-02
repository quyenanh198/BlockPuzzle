# Xếp Gạch

Chơi online: https://quyenanh198.github.io/BlockPuzzle/

Tetris clone bằng HTML, CSS và JavaScript thuần. Không cần cài đặt.

## Chơi

Chạy một HTTP server tĩnh rồi mở trong trình duyệt (service worker cần HTTP, không chạy qua `file://`):

```
python3 -m http.server 8000
```

Là PWA: có thể "Thêm vào màn hình chính" trên điện thoại hoặc cài từ thanh địa chỉ trên desktop, chạy offline sau lần tải đầu.

| Phím | Hành động |
|------|-----------|
| ← → | Di chuyển |
| ↑ | Xoay |
| ↓ | Rơi nhanh |
| Space | Rơi ngay |
| P | Tạm dừng |

Trên điện thoại dùng các nút cảm ứng dưới bảng. Kỷ lục lưu trong `localStorage`.

## Test

```
node --test
```
