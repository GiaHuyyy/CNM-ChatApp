import { io } from 'socket.io-client';

// Singleton pattern để đảm bảo duy nhất một kết nối socket
class SocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnecting = false;
  }

  connect() {
    if (!this.socket) {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log("No token available, cannot connect to socket");
          return null;
        }

        console.log("Establishing new socket connection...");
        this.socket = io(import.meta.env.VITE_APP_SOCKET_URL || 'http://localhost:5000', {
          auth: {
            token: token
          },
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000
        });
        
        // Log các sự kiện kết nối
        this.socket.on('connect', () => {
          console.log('Socket connected successfully:', this.socket.id);
          this.connected = true;
          this.reconnecting = false;
        });
        
        this.socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason);
          this.connected = false;
        });
        
        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error);
          this.connected = false;
        });

        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`Socket reconnected after ${attemptNumber} attempts`);
          this.connected = true;
          this.reconnecting = false;
        });

        this.socket.on('reconnecting', (attemptNumber) => {
          console.log(`Socket reconnecting... (Attempt ${attemptNumber})`);
          this.reconnecting = true;
        });

        this.socket.on('reconnect_failed', () => {
          console.error('Socket reconnection failed');
          this.reconnecting = false;
        });
      } catch (err) {
        console.error("Error initializing socket:", err);
        return null;
      }
    }
    
    return this.socket;
  }
  
  emit(event, data, callback) {
    const socket = this.connect();
    if (socket && this.connected) {
      console.log(`Emitting event: ${event}`, data);
      socket.emit(event, data, callback);
      return true;
    }
    console.warn(`Failed to emit ${event}: socket not connected`);
    return false;
  }
  
  on(event, callback) {
    const socket = this.connect();
    if (socket) {
      console.log(`Registering listener for: ${event}`);
      socket.on(event, callback);
      return true;
    }
    return false;
  }
  
  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
      return true;
    }
    return false;
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  isConnected() {
    return this.connected;
  }
}

export const socketManager = new SocketManager();