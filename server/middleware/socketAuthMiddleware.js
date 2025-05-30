const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

// Cache để lưu thông tin user
const userCache = new Map();

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      console.error('Socket connection attempt with no token');
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id;

    // Kiểm tra cache trước
    let user = userCache.get(userId);
    
    if (!user) {
      // Nếu không có trong cache, query từ DB
      user = await UserModel.findById(userId)
        .select('_id name email profilePic')
        .lean();
      
      if (user) {
        // Lưu vào cache
        userCache.set(userId, user);
        
        // Tự động xóa cache sau 5 phút
        setTimeout(() => {
          userCache.delete(userId);
        }, 300000);
      }
    }

    if (!user) {
      console.error(`User ID ${userId} from token not found in database`);
      return next(new Error('User not found'));
    }

    socket.user = user;
    socket.userId = userId;
    socket.join(userId); // Tự động join room của user
    console.log(`Socket authenticated for user: ${user.name} (${userId})`);

    next();
  } catch (error) {
    console.error('Socket authentication error:', error.message);
    next(new Error('Authentication failed'));
  }
};

module.exports = socketAuthMiddleware;