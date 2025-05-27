import { io } from 'socket.io-client';

// Singleton pattern để đảm bảo duy nhất một kết nối socket
class SocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.reconnecting = false;
    this.eventCallbacks = new Map(); // Store callbacks for one-time events with API fallback
    this.fallbackTimers = new Map();  // Track timers for API fallbacks
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
      // For joinRoom events, add special validation
      if (event === 'joinRoom') {
        // Validate that the room ID is a potential MongoDB ObjectId
        // This prevents route paths from being sent as room IDs
        if (typeof data === 'string' && (data.includes('/') || !data.match(/^[0-9a-fA-F]{24}$/))) {
          console.warn(`Prevented invalid joinRoom emit with ID: ${data}`);
          if (callback) callback({ success: false, error: 'Invalid room ID format' });
          return false;
        }
      }
      
      console.log(`Emitting event: ${event}`, data);
      socket.emit(event, data, callback);
      return true;
    }
    console.warn(`Failed to emit ${event}: socket not connected`);
    return false;
  }
  
  /**
   * Enhanced event handler with API fallback
   * @param {string} event - Socket event name
   * @param {function} callback - Event callback
   * @param {function} apiFallback - API fallback function to call if socket times out
   * @param {number} timeout - Timeout in ms before using API fallback
   */
  onWithFallback(event, callback, apiFallback, timeout = 5000) {
    const socket = this.connect();
    if (!socket) return false;
    
    console.log(`Registering listener with fallback for: ${event}`);
    
    // Create unique ID for this listener
    const listenerId = `${event}_${Date.now()}`;
    
    // Store original callback
    this.eventCallbacks.set(listenerId, callback);
    
    // Create wrapped callback that clears the fallback timer
    const wrappedCallback = (...args) => {
      // Clear the fallback timer when we get a socket response
      if (this.fallbackTimers.has(listenerId)) {
        clearTimeout(this.fallbackTimers.get(listenerId));
        this.fallbackTimers.delete(listenerId);
      }
      
      // Call the original callback
      if (this.eventCallbacks.has(listenerId)) {
        this.eventCallbacks.get(listenerId)(...args);
      }
    };
    
    // Add the listener
    socket.on(event, wrappedCallback);
    
    // Set a timer for API fallback
    if (apiFallback) {
      const timer = setTimeout(() => {
        console.log(`Socket event ${event} timed out, using API fallback`);
        
        // Only call fallback if no response has been received
        if (this.fallbackTimers.has(listenerId)) {
          apiFallback();
          
          // Clean up
          this.fallbackTimers.delete(listenerId);
          this.eventCallbacks.delete(listenerId);
        }
      }, timeout);
      
      this.fallbackTimers.set(listenerId, timer);
    }
    
    return {
      dispose: () => {
        // Clean up function to remove listener and timer
        if (socket) {
          socket.off(event, wrappedCallback);
        }
        
        if (this.fallbackTimers.has(listenerId)) {
          clearTimeout(this.fallbackTimers.get(listenerId));
          this.fallbackTimers.delete(listenerId);
        }
        
        this.eventCallbacks.delete(listenerId);
      }
    };
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