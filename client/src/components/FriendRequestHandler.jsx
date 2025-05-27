import axios from 'axios';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useNotifications } from '../contexts/NotificationContext';
import { updateNotificationCount } from '../helpers/friendsHelper';
import { socketManager } from '../socket/socketConfig';

export default function FriendRequestHandler() {
  const navigate = useNavigate();
  const { updateNotifications } = useNotifications();
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    // Initial fetch of pending requests using REST API (fallback)
    const fetchPendingRequests = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_APP_BACKEND_URL}/api/friend-requests/received`,
          { withCredentials: true }
        );
        if (response.data.success) {
          setPendingRequests(response.data.data);
          updateNotifications(response.data.data.length);
        }
      } catch (error) {
        console.error("Error fetching pending requests:", error);
      }
    };

    fetchPendingRequests();
    
    // Ensure socket is connected
    const socket = socketManager.connect();
    if (!socket) {
      console.error("Could not connect to socket in FriendRequestHandler");
      return;
    }

    console.log("Setting up friend request socket listeners");
    
    // Listen for new friend requests
    socket.on("receiveFriendRequest", (data) => {
      console.log("Received friend request:", data);
      const { requestId, sender } = data;
      setPendingRequests(prev => {
        const updated = [...prev, {
          _id: requestId,
          sender: sender,
          status: 'pending'
        }];
        // Update notification count in global context
        updateNotifications(updated.length);
        // Also update notification count globally for other components
        updateNotificationCount();
        return updated;
      });

      toast.message("Lời mời kết bạn mới", {
        description: `${sender.name} muốn kết bạn với bạn`,
        action: {
          label: "Xem",
          onClick: () => navigate("/bookphone/listinvites")
        },
        duration: 8000,
        important: true
      });
    });

    // Listen for cancelled requests
    socket.on("friendRequestCancelled", (data) => {
      console.log("Friend request cancelled:", data);
      const { requestId, sender } = data;
      setPendingRequests(prev => {
        const updated = prev.filter(request => request._id !== requestId);
        // Update notification count in global context
        updateNotifications(updated.length);
        // Also update notification count globally for other components
        updateNotificationCount();
        return updated;
      });

      toast.message("Hủy lời mời kết bạn", {
        description: `${sender.name} đã hủy lời mời kết bạn`,
        duration: 5000
      });
    });

    // Listen for accepted requests
    socket.on("friendRequestAccepted", (data) => {
      console.log("Friend request accepted:", data);
      const { requestId } = data;
      setPendingRequests(prev => {
        const updated = prev.filter(request => request._id !== requestId);
        // Update notification count in global context 
        updateNotifications(updated.length);
        // Also update notification count globally for other components
        updateNotificationCount();
        return updated;
      });
    });
    
    // Listen for rejected requests
    socket.on("friendRequestRejected", (data) => {
      console.log("Friend request rejected:", data);
      const { requestId } = data;
      setPendingRequests(prev => {
        const updated = prev.filter(request => request._id !== requestId);
        // Update notification count in global context
        updateNotifications(updated.length);
        // Also update notification count globally for other components
        updateNotificationCount();
        return updated;
      });
    });
    
    // Listen for global notification count updates
    const handleCountUpdate = (event) => {
      updateNotifications(event.detail.count);
    };
    
    document.addEventListener('friendRequestCountUpdated', handleCountUpdate);

    return () => {
      console.log("Cleaning up friend request socket listeners");
      if (socket) {
        socket.off("receiveFriendRequest");
        socket.off("friendRequestCancelled");
        socket.off("friendRequestAccepted");
        socket.off("friendRequestRejected");
      }
      document.removeEventListener('friendRequestCountUpdated', handleCountUpdate);
    };
  }, [navigate, updateNotifications]);

  return null;
}