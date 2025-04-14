import io from 'socket.io-client';

class SocketManager {
  static instance = null;
  static socket = null;

  static getInstance() {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  connect() {
    if (!SocketManager.socket) {
      SocketManager.socket = io(import.meta.env.VITE_APP_BACKEND_URL, {
        withCredentials: true,
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.setupListeners();
    }
    return SocketManager.socket;
  }

  setupListeners() {
    SocketManager.socket.on('connect', () => {
      console.log('Socket connected');
    });

    SocketManager.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    SocketManager.socket.on('disconnect', () => {
      setTimeout(() => {
        this.connect();
      }, 1000);
    });
  }

  emit(event, data) {
    if (SocketManager.socket && SocketManager.socket.connected) {
      SocketManager.socket.emit(event, data);
      return true;
    }
    return false;
  }
}

export const socketManager = SocketManager.getInstance();