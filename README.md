# CMN-ChatApp - Ứng dụng Trò chuyện Thời gian thực

<p align="center">
  <img src="https://ui-avatars.com/api/?name=CMN+ChatApp&background=0D8ABC&color=fff&size=256" alt="CMN-ChatApp Logo" width="150" />
</p>

<p align="center">
  <strong>Ứng dụng trò chuyện hiện đại với nhiều tính năng và khả năng gọi điện thoại/video</strong>
</p>

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Kiến trúc](#kiến-trúc)
- [Cài đặt & Thiết lập](#cài-đặt--thiết-lập)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Tài liệu API](#tài-liệu-api)
- [Sự kiện WebSocket](#sự-kiện-websocket)
- [Luồng xác thực](#luồng-xác-thực)
- [Luồng cuộc gọi](#luồng-cuộc-gọi)
- [Các thành phần chính](#các-thành-phần-chính)
- [Đóng góp](#đóng-góp)
- [Xử lý sự cố](#xử-lý-sự-cố)
- [Giấy phép](#giấy-phép)

## 🔭 Tổng quan

CMN-ChatApp là một nền tảng nhắn tin thời gian thực toàn diện được thiết kế để cung cấp cho người dùng trải nghiệm giao tiếp liền mạch. Ứng dụng hỗ trợ trò chuyện một-một, hội thoại nhóm, chia sẻ phương tiện và gọi điện thoại/video, làm cho nó phù hợp cho cả sử dụng cá nhân và chuyên nghiệp.

Được xây dựng với React.js cho frontend và Node.js cho backend, ứng dụng tận dụng Socket.io cho giao tiếp thời gian thực và MongoDB để lưu trữ dữ liệu. Kiến trúc tuân theo các phương pháp tốt nhất hiện đại, đảm bảo khả năng mở rộng, hiệu suất và khả năng bảo trì.

## ✨ Tính năng

### Quản lý người dùng
- **Xác thực**: Xác thực dựa trên số điện thoại & mật khẩu với JWT
- **Quản lý hồ sơ**: Người dùng có thể cập nhật thông tin và hình ảnh hồ sơ
- **Tìm kiếm người dùng**: Tìm kiếm người dùng khác theo tên hoặc số điện thoại
- **Trạng thái trực tuyến**: Theo dõi trạng thái trực tuyến/ngoại tuyến của người dùng theo thời gian thực

### Nhắn tin
- **Nhắn tin thời gian thực**: Gửi và nhận tin nhắn ngay lập tức
- **Xác nhận đã đọc**: Theo dõi khi tin nhắn được người nhận xem
- **Chỉnh sửa & Xóa tin nhắn**: Chỉnh sửa hoặc xóa tin nhắn sau khi gửi
- **Biểu cảm Emoji**: Phản ứng với tin nhắn bằng nhiều emoji
- **Xem trước liên kết**: Tự động định dạng và xem trước các liên kết được chia sẻ

### Chia sẻ phương tiện & tệp
- **Tải lên hình ảnh**: Chia sẻ hình ảnh trong hội thoại
- **Chia sẻ video**: Tải lên và chia sẻ nội dung video
- **Chia sẻ tài liệu**: Trao đổi tài liệu ở nhiều định dạng
- **Thư viện phương tiện**: Duyệt phương tiện đã chia sẻ trong thanh bên hội thoại

### Trò chuyện nhóm
- **Tạo nhóm**: Tạo hội thoại nhiều người dùng
- **Quản lý thành viên**: Thêm hoặc xóa thành viên khỏi nhóm
- **Quyền quản trị viên**: Đặc quyền đặc biệt cho người tạo nhóm
- **Thông báo nhóm**: Tin nhắn hệ thống cho các sự kiện nhóm

### Gọi điện thoại & Video
- **Gọi điện thoại một-một**: Thực hiện cuộc gọi thoại cho người dùng khác
- **Gọi video một-một**: Hỗ trợ đầy đủ cuộc gọi video
- **Lịch sử cuộc gọi**: Theo dõi cuộc gọi với dấu thời gian và thời lượng
- **Trạng thái cuộc gọi**: Xem các cuộc gọi nhỡ, bị từ chối và hoàn thành

### Giao diện người dùng
- **Thiết kế đáp ứng**: Hoạt động trên máy tính để bàn và thiết bị di động
- **Tìm kiếm tin nhắn**: Tìm tin nhắn cụ thể trong các hội thoại
- **Xem trước tệp**: Xem trước phương tiện trước khi gửi
- **Quản lý hội thoại**: Xóa hoặc lưu trữ hội thoại

## 🛠️ Công nghệ sử dụng

### Frontend
- **React.js**: Thư viện UI dựa trên component
- **Redux**: Quản lý trạng thái
- **React Router**: Điều hướng và định tuyến
- **Socket.io Client**: Giao tiếp thời gian thực
- **Tailwind CSS**: Framework CSS theo phương pháp tiếp cận utility-first
- **FontAwesome**: Thư viện biểu tượng
- **Date-fns**: Định dạng ngày tháng
- **Emoji Picker React**: Chọn emoji
- **Sonner**: Thông báo toast
- **Simple-Peer**: Quản lý kết nối ngang hàng WebRTC

### Backend
- **Node.js**: Môi trường chạy JavaScript
- **Express**: Framework web
- **Socket.io**: Giao tiếp hai chiều
- **MongoDB**: Cơ sở dữ liệu NoSQL
- **Mongoose**: ODM cho MongoDB
- **JSON Web Tokens**: Cơ chế xác thực
- **Bcrypt**: Băm mật khẩu
- **Cloudinary**: Lưu trữ đám mây cho tệp và hình ảnh
- **Cors**: Chia sẻ tài nguyên cross-origin

### Công cụ phát triển & Build
- **Vite**: Công cụ build frontend
- **ESLint**: Linting code
- **Prettier**: Định dạng code
- **Nodemon**: Tự động tải lại server

## 🏗️ Kiến trúc

Ứng dụng tuân theo kiến trúc client-server điển hình với tích hợp WebSocket:

### Luồng dữ liệu
1. **Xác thực**: Luồng xác thực dựa trên JWT
2. **Yêu cầu API**: API RESTful cho dữ liệu người dùng và các hoạt động không thời gian thực
3. **WebSockets**: Socket.io cho nhắn tin thời gian thực và cập nhật trạng thái
4. **WebRTC**: Kết nối ngang hàng cho cuộc gọi điện thoại/video

## 🚀 Cài đặt & Thiết lập

### Yêu cầu
- Node.js (v14 hoặc cao hơn)
- MongoDB (instance local hoặc URI Atlas)
- Tài khoản Cloudinary (cho tải lên tệp)

### Thiết lập Client
```bash
# Chuyển đến thư mục client
cd client

# Cài đặt các phụ thuộc
npm install

# Tạo tệp .env với:
echo "VITE_APP_BACKEND_URL=http://localhost:5000" > .env

# Khởi động server phát triển
npm run dev
```

### Thiết lập Server
```bash
# Chuyển đến thư mục server
cd server

# Cài đặt các phụ thuộc
npm install

# Tạo tệp .env với:
echo "MONGO_URI=mongodb://localhost:27017/chatapp" > .env
echo "JWT_SECRET=your_jwt_secret" >> .env
echo "CLOUDINARY_URL=your_cloudinary_url" >> .env

# Khởi động server
npm start
```

## 📁 Cấu trúc dự án

### Cấu trúc Client
```
client/
├── public/
├── src/
│   ├── components/         # Các component UI tái sử dụng
│   │   ├── AddGroupMemberModal.jsx
│   │   ├── ConfirmModal.jsx
│   │   ├── MessagePage.jsx   # Component nhắn tin chính
│   │   ├── ReactionDisplay.jsx
│   │   ├── RightSidebar.jsx
│   │   └── Sidebar.jsx
│   ├── context/            # Các provider context React
│   │   ├── CallProvider.jsx  # Chức năng gọi WebRTC
│   │   └── GlobalProvider.jsx # Quản lý trạng thái toàn cục
│   ├── helpers/            # Các hàm tiện ích
│   │   └── uploadFileToClound.js
│   ├── layout/             # Layout trang
│   │   ├── AuthLayout.jsx
│   │   └── HomeLayout.jsx
│   ├── pages/              # Các component trang
│   │   ├── LoginWithPhonePage.jsx
│   │   ├── LoginWithQR.jsx
│   │   └── RegisterPage.jsx
│   ├── redux/              # Redux store và slices
│   │   └── userSlice.js
│   ├── App.jsx             # Component ứng dụng chính
│   └── main.jsx            # Điểm vào
```

### Cấu trúc Server
```
server/
├── controllers/            # Xử lý yêu cầu
│   ├── checkPassword.js
│   ├── checkPhone.js
│   ├── loginUser.js
│   ├── logout.js
│   ├── registerUser.js
│   ├── searchFriendUser.js
│   ├── searchUser.js
│   ├── updateUserDetails.js
│   └── userDetails.js
├── helpers/                # Các hàm tiện ích
│   ├── getUserDetailsFromToken.js
│   └── getConversation.js
├── models/                 # Các model Mongoose
│   ├── ConversationModel.js
│   └── UserModel.js
├── routers/                # Các route Express
│   └── index.js
├── socket/                 # Xử lý sự kiện Socket.io
│   └── index.js
├── .env                    # Biến môi trường
└── index.js                # Điểm vào server
```

## 📡 Tài liệu API

### Endpoint Xác thực
| Endpoint         | Phương thức | Mô tả                      | Request Body                     |
|------------------|-------------|----------------------------|----------------------------------|
| /api/register    | POST        | Đăng ký người dùng mới     | { phone, password, name }       |
| /api/phone       | POST        | Kiểm tra số điện thoại tồn tại | { phone }                       |
| /api/password    | POST        | Xác thực thông tin đăng nhập | { phone, password }             |
| /api/login       | POST        | Đăng nhập người dùng       | { phone, password }             |
| /api/logout      | GET         | Đăng xuất người dùng hiện tại | -                                |
| /api/user-details| GET         | Lấy thông tin người dùng hiện tại | -                                |
| /api/update-user | POST        | Cập nhật hồ sơ người dùng  | { name, profilePic }            |
| /api/search-user | POST        | Tìm kiếm người dùng        | { search }                      |

## 🔌 Sự kiện WebSocket

### Sự kiện từ Client đến Server
| Sự kiện                | Mô tả                          | Payload                          |
|------------------------|---------------------------------|----------------------------------|
| joinRoom               | Tham gia phòng hội thoại       | conversationId                  |
| newMessage             | Gửi tin nhắn trực tiếp mới     | { sender, receiver, text, ... } |
| newGroupMessage        | Gửi tin nhắn đến nhóm          | { conversationId, text, ... }   |
| createGroupChat        | Tạo nhóm hội thoại mới         | { name, members, creator }      |
| addMembersToGroup      | Thêm thành viên vào nhóm       | { groupId, newMembers, addedBy }|
| removeMemberFromGroup  | Xóa thành viên khỏi nhóm       | { groupId, memberId, adminId }  |
| leaveGroup             | Rời khỏi nhóm                 | { groupId, userId }             |
| deleteConversation     | Xóa hội thoại                  | { conversationId, userId }      |
| deleteMessage          | Xóa tin nhắn                  | { messageId, conversationId, ...}|
| editMessage            | Chỉnh sửa tin nhắn            | { messageId, text, ... }        |
| addReaction            | Thêm biểu cảm vào tin nhắn    | { messageId, emoji, userId, ...}|
| call-user              | Bắt đầu cuộc gọi thoại/video  | { callerId, receiverId, ... }   |
| answer-call            | Chấp nhận cuộc gọi đến        | { callerId, signal, messageId } |
| reject-call            | Từ chối cuộc gọi đến          | { callerId, messageId, reason } |
| end-call               | Kết thúc cuộc gọi đang diễn ra| { userId, partnerId, ... }      |
| ice-candidate          | Gửi ứng viên ICE WebRTC       | { userId, candidate }           |

### Sự kiện từ Server đến Client
| Sự kiện                | Mô tả                          |
|------------------------|---------------------------------|
| messageUser            | Gửi thông tin người dùng đến client |
| message                | Gửi tin nhắn hội thoại         |
| groupMessage           | Gửi dữ liệu hội thoại nhóm     |
| conversation           | Gửi danh sách hội thoại trong thanh bên |
| onlineUser             | Gửi danh sách người dùng trực tuyến |
| groupCreated           | Thông báo về việc tạo nhóm mới |
| membersAddedToGroup    | Thông báo về việc thêm thành viên mới |
| memberRemovedFromGroup | Thông báo về việc xóa thành viên |
| leftGroup              | Xác nhận rời khỏi nhóm         |
| conversationDeleted    | Xác nhận xóa hội thoại         |
| messageDeleted         | Xác nhận xóa tin nhắn          |
| messageEdited          | Xác nhận chỉnh sửa tin nhắn     |
| reactionAdded          | Xác nhận thêm biểu cảm         |
| incoming-call          | Thông báo về cuộc gọi đến      |
| call-accepted          | Thông báo người gọi rằng cuộc gọi đã được chấp nhận |
| call-rejected          | Thông báo người gọi rằng cuộc gọi đã bị từ chối |
| call-ended             | Thông báo rằng cuộc gọi đã kết thúc |
| call-terminated        | Buộc giao diện cuộc gọi đóng   |

## 🔐 Luồng xác thực

### Đăng ký:
1. Người dùng nhập số điện thoại, tên và mật khẩu.
2. Server xác thực đầu vào và kiểm tra tài khoản đã tồn tại.
3. Mật khẩu được băm bằng bcrypt trước khi lưu trữ.
4. Bản ghi người dùng được tạo trong MongoDB.

### Đăng nhập:
1. Người dùng cung cấp số điện thoại và mật khẩu.
2. Server xác thực thông tin đăng nhập.
3. Token JWT được tạo và gửi đến client.
4. Client lưu trữ token trong localStorage.

### Xác thực:
1. Token JWT được gửi kèm với các yêu cầu API trong header Authorization.
2. Kết nối Socket xác thực bằng token.
3. Server xác thực token cho mỗi yêu cầu.

## 📞 Luồng cuộc gọi

### Bắt đầu cuộc gọi:
1. Người gọi tạo một đề nghị WebRTC thông qua simple-peer.
2. Tín hiệu đề nghị được gửi đến người nhận thông qua Socket.io.
3. Thông báo cuộc gọi xuất hiện cho người nhận.

### Chấp nhận cuộc gọi:
1. Người nhận tạo một câu trả lời WebRTC.
2. Tín hiệu câu trả lời được gửi lại cho người gọi.
3. Kết nối ngang hàng được thiết lập.

### Trao đổi phương tiện:
1. Luồng âm thanh/video được trao đổi trực tiếp thông qua WebRTC.
2. Các ứng viên ICE được trao đổi để thiết lập đường kết nối tối ưu.

### Kết thúc cuộc gọi:
1. Một trong hai bên có thể kết thúc cuộc gọi.
2. Metadata cuộc gọi (thời lượng, trạng thái) được lưu trữ trong cơ sở dữ liệu.
3. Giao diện cuộc gọi được đóng cho cả hai bên.

## 🧩 Các thành phần chính

### 1. MessagePage.jsx
Component cốt lõi để hiển thị và tương tác hội thoại:
- Hiển thị lịch sử tin nhắn và xử lý cập nhật thời gian thực.
- Quản lý gửi, chỉnh sửa và xóa tin nhắn.
- Xử lý tải lên tệp và chọn emoji.
- Hiển thị nhật ký cuộc gọi và quản lý biểu cảm.

### 2. CallProvider.jsx
Quản lý chức năng gọi điện thoại và video:
- Thiết lập kết nối ngang hàng WebRTC.
- Xử lý việc lấy và chia sẻ luồng phương tiện.
- Quản lý trạng thái cuộc gọi (đang đổ chuông, kết nối, kết thúc).
- Theo dõi thời lượng và trạng thái cuộc gọi.

### 3. GlobalProvider.jsx
Provider context toàn ứng dụng:
- Quản lý kết nối socket.io và kết nối lại.
- Xử lý trạng thái toàn cục như xác thực.
- Cung cấp ngữ cảnh hội thoại cho các component.

### 4. Sidebar.jsx
Component danh sách hội thoại và điều hướng:
- Hiển thị tất cả các hội thoại của người dùng.
- Hiển thị số lượng tin nhắn chưa đọc.
- Cung cấp giao diện để tạo hội thoại mới.
- Hiển thị trạng thái trực tuyến của người dùng.

### 5. RightSidebar.jsx
Component chi tiết hội thoại:
- Hiển thị phương tiện, tệp và liên kết đã chia sẻ.
- Hiển thị danh sách thành viên nhóm.
- Cung cấp các tùy chọn quản lý hội thoại.
- Cho phép thêm/xóa thành viên nhóm.

## ❓ Xử lý sự cố

### Các vấn đề thường gặp

#### Vấn đề kết nối:
- Đảm bảo cả client và server đang chạy.
- Kiểm tra rằng các biến môi trường được thiết lập chính xác.
- Xác minh kết nối mạng và cài đặt CORS.

#### Vấn đề phương tiện:
- Đảm bảo quyền trình duyệt cho camera và microphone.
- Kiểm tra rằng cấu hình Cloudinary là chính xác.
- Xác minh các định dạng tệp được hỗ trợ (hình ảnh, video, tài liệu).

#### Lỗi xác thực:
- Kiểm tra thời hạn token JWT.
- Xác minh thông tin đăng nhập đúng đang được sử dụng.
- Đảm bảo token được lưu trữ và gửi đúng cách với các yêu cầu.

#### Lỗi kết nối cuộc gọi:
- Kiểm tra khả năng tương thích WebRTC của trình duyệt.
- Đảm bảo cả hai người dùng đã cấp quyền phương tiện.
- Xác minh mạng cho phép kết nối WebRTC (một số tường lửa chặn nó).

## 🤝 Đóng góp

Chúng tôi hoan nghênh các đóng góp để cải thiện CMN-ChatApp!

1. Fork repository.
2. Tạo một nhánh tính năng: `git checkout -b feature/amazing-feature`.
3. Commit các thay đổi của bạn: `git commit -m 'Add some amazing feature'`.
4. Push lên nhánh: `git push origin feature/amazing-feature`.
5. Mở một Pull Request.

## 📄 Giấy phép

Dự án này được cấp phép theo Giấy phép MIT - xem tệp LICENSE để biết chi tiết.

