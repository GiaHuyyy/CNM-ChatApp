import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { socket } from '../socket';

export default function FriendRequestHandler() {
  const navigate = useNavigate();
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    // Initial fetch of pending requests
    const fetchPendingRequests = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_APP_BACKEND_URL}/api/friend-requests/received`,
          { withCredentials: true }
        );
        if (response.data.success) {
          setPendingRequests(response.data.data);
        }
      } catch (error) {
        console.error("Error fetching pending requests:", error);
      }
    };

    fetchPendingRequests();

    // Listen for new friend requests
    socket.on("receiveFriendRequest", (data) => {
      const { requestId, sender } = data;
      setPendingRequests(prev => [...prev, {
        _id: requestId,
        sender: sender,
        status: 'pending'
      }]);

      toast.message("Lời mời kết bạn mới", {
        description: `${sender.name} muốn kết bạn với bạn`,
        action: {
          label: "Xem",
          onClick: () => navigate("/bookphone/listinvites")
        }
      });
    });

    // Listen for cancelled requests
    socket.on("friendRequestCancelled", (data) => {
      const { requestId, sender } = data;
      setPendingRequests(prev => prev.filter(request => request._id !== requestId));

      toast.message("Hủy lời mời kết bạn", {
        description: `${sender.name} đã hủy lời mời kết bạn`
      });
    });

    // Listen for accepted requests
    socket.on("friendRequestAccepted", (data) => {
      const { requestId } = data;
      setPendingRequests(prev => prev.filter(request => request._id !== requestId));
    });

    return () => {
      socket.off("receiveFriendRequest");
      socket.off("friendRequestCancelled");
      socket.off("friendRequestAccepted");
    };
  }, [navigate]);

  // Make the pending requests available to other components
  return null;
}