# CareProtocol

CareProtocol là prototype hỗ trợ theo dõi một bài tập phục hồi đầu gối sau phẫu thuật. MediaPipe xử lý khung hình trong trình duyệt để ước tính góc gối và đếm số lần tập. Người dùng có thể chọn ký một bản ghi tóm tắt bằng Phantom trên Solana Devnet.

Đây là bản sao phát triển riêng trong repo `CareProtocol-Redesign`; website demo và repo nguồn không được dùng làm đích ghi/deploy.

## Chạy trên máy

Yêu cầu Node.js 18 trở lên, trình duyệt hiện đại có webcam và kết nối mạng để tải MediaPipe.

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Camera chỉ được bật sau khi người dùng bấm **Bắt đầu tập** và cấp quyền.

### Solana Devnet (tùy chọn)

Kết nối Phantom đang ở Devnet nếu muốn ghi nhận phiên tập. RPC mặc định là public Devnet; có thể đặt `NEXT_PUBLIC_SOLANA_RPC_URL` trong `.env.local` để dùng RPC riêng. Không đưa private key vào biến `NEXT_PUBLIC_*`.

Nếu ví thiếu SOL Devnet, nút xin SOL trong ứng dụng gọi airdrop Devnet; yêu cầu có thể bị giới hạn. Giao dịch chỉ được hiển thị thành công sau khi RPC xác nhận và có liên kết Solana Explorer.

## Luồng hiện có

1. Xem hướng dẫn bài tập và mục tiêu 10 lần.
2. Tải mô hình PoseLandmarker, cho phép camera và tập theo phản hồi trực tiếp.
3. Khi hoàn thành, xem số lần và điểm kỹ thuật ước tính.
4. Tùy chọn kết nối Phantom, xin SOL Devnet và ký check-in.
5. Mở giao dịch trên Explorer; các phiên đã xác nhận được lưu trong local storage của trình duyệt hiện tại.

## Quyền riêng tư và giới hạn

- Ảnh/video camera được xử lý trong trình duyệt; ứng dụng không upload video.
- Giao dịch memo trên Devnet công khai wallet address cùng mã bài tập, số lần, điểm ước tính, thời điểm và hash. Không ghi tên, bệnh án, ảnh hay video lên chain.
- Điểm kỹ thuật và góc khớp là ước tính từ prototype, chưa được xác nhận lâm sàng và không nên dùng để tự chẩn đoán hoặc điều chỉnh phác đồ.
- Ứng dụng không có đăng nhập bệnh nhân, lưu trữ hồ sơ bệnh viện, bác sĩ/Tele-ICU, FHIR hay AI lâm sàng trong source hiện tại.
- Dùng dữ liệu demo; không nhập thông tin nhận dạng hoặc dữ liệu sức khỏe thật.

## Công nghệ

- Next.js 14.2, React 18, TypeScript và Tailwind CSS 3
- MediaPipe Tasks Vision chạy phía trình duyệt
- Phantom Wallet Adapter và Solana Web3.js
- SPL Memo Program trên Solana Devnet để lưu hash và số liệu phiên

## Nguồn tham khảo

Repo này phát triển độc lập từ source CareProtocol-Web trong tài khoản chủ repo. Các thay đổi ở đây không cập nhật website demo hoặc repo của Andrew.
