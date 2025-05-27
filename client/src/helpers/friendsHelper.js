import axios from 'axios';
import { socketManager } from '../socket/socketConfig';

/**
 * Check if users are friends using both socket and API fallback
 * @param {string} userId - The ID of the user to check
 * @returns {Promise<{status: string, requestId: string|null, isSender: boolean}>} 
 */
export const checkFriendStatus = async (userId) => {
  try {
    if (!userId) return { status: null, isSender: false, requestId: null };
    
    // Primary API endpoint for detailed friend status
    const response = await axios.get(
      `${import.meta.env.VITE_APP_BACKEND_URL}/api/check-friend-status/${userId}`,
      { withCredentials: true }
    );

    if (response.data.success) {
      console.log("Friend status check result:", response.data.data);
      return response.data.data;
    }
    
    return { status: null, isSender: false, requestId: null };
  } catch (error) {
    console.error("Error checking friend status:", error);
    
    // Fallback to simpler API endpoint
    try {
      const fallbackResponse = await axios.get(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/check-friend/${userId}`,
        { withCredentials: true }
      );
      
      if (fallbackResponse.data.success) {
        // Convert the format if needed
        return {
          status: fallbackResponse.data.data.status,
          isSender: fallbackResponse.data.data.sender === localStorage.getItem('userId'),
          requestId: fallbackResponse.data.data._id
        };
      }
    } catch (fallbackError) {
      console.error("Friend status fallback check failed:", fallbackError);
    }
    
    return { status: null, isSender: false, requestId: null };
  }
};

/**
 * Get pending friend requests count from both socket and API
 * @returns {Promise<number>} Number of pending requests
 */
export const getPendingRequestsCount = async () => {
  return new Promise((resolve) => {
    let resolved = false;
    
    // Set a timeout for API fallback
    const timeoutId = setTimeout(async () => {
      if (!resolved) {
        console.log("Socket timeout, using API fallback for pending requests count");
        try {
          const response = await axios.get(
            `${import.meta.env.VITE_APP_BACKEND_URL}/api/pending-friend-requests`,
            { withCredentials: true }
          );
          
          if (response.data.success) {
            resolved = true;
            resolve(response.data.data.length);
          } else {
            resolved = true;
            resolve(0);
          }
        } catch (error) {
          console.error("API fallback for pending requests failed:", error);
          resolved = true;
          resolve(0);
        }
      }
    }, 3000);
    
    // Try socket first
    if (socketManager.isConnected()) {
      socketManager.emit('getPendingRequestsCount', {}, (response) => {
        clearTimeout(timeoutId);
        
        if (response && response.success) {
          resolved = true;
          resolve(response.count);
        } else {
          resolved = true;
          resolve(0);
        }
      });
    } else {
      // If socket not connected, rely on the API fallback
      console.log("Socket not connected, will wait for API fallback");
    }
  });
};

/**
 * Synchronize notification count across components
 */
export const updateNotificationCount = async () => {
  const count = await getPendingRequestsCount();
  
  // Dispatch a custom event that components can listen for
  const event = new CustomEvent('friendRequestCountUpdated', { 
    detail: { count } 
  });
  
  document.dispatchEvent(event);
  return count;
};
