import axios from 'axios';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { socketManager } from '../socket/socketConfig';
import { useNotifications } from '../contexts/NotificationContext';
import { useLocation } from 'react-router-dom';

const RequestItem = memo(({ request, onAccept, onReject, isProcessing }) => {
  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">
      <div className="flex items-center gap-4">
        <img 
          src={request.sender.profilePic} 
          alt="avatar" 
          className="w-12 h-12 rounded-full object-cover"
        />
        <div>
          <p className="font-semibold">{request.sender.name}</p>
          <p className="text-sm text-gray-500">Muốn kết bạn với bạn</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onAccept(request._id, request.sender._id)}
          disabled={isProcessing}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 flex items-center"
        >
          {isProcessing === "accepting" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></span>
          ) : null}
          Chấp nhận
        </button>
        <button
          onClick={() => onReject(request._id, request.sender._id)}
          disabled={isProcessing}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:bg-gray-100 flex items-center"
        >
          {isProcessing === "rejecting" ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent mr-2"></span>
          ) : null}
          Từ chối
        </button>
      </div>
    </div>
  );
});

export default function FriendRequests() {
  const location = useLocation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequests, setProcessingRequests] = useState(new Map());
  const { updateNotifications } = useNotifications();

  const fetchRequests = useCallback(() => {
    setLoading(true);
    
    // Sử dụng socket để lấy danh sách lời mời
    const socket = socketManager.connect();
    socket.emit("getFriendRequests");
    
    socket.once("friendRequests", (response) => {
      if (response.success) {
        setRequests(response.data);
        updateNotifications(response.data.length);
      } else {
        toast.error("Không thể tải danh sách lời mời");
      }
      setLoading(false);
    });
    
    socket.once("friendRequestsProcessing", () => {
      // Hiệu ứng khi đang xử lý tải dữ liệu
    });
  }, [updateNotifications]);

  // Add immediate refresh when route changes to listinvites
  useEffect(() => {
    if (location.pathname === '/bookphone/listinvites') {
      fetchRequests();
    }
  }, [location, fetchRequests]);

  // Set up socket event handlers
  useEffect(() => {
    const socket = socketManager.connect();
    
    socket.on("receiveFriendRequest", (data) => {
      const { requestId, sender } = data;
      setRequests(prev => {
        if (prev.some(req => req._id === requestId)) return prev;
        const newRequests = [{
          _id: requestId,
          sender,
          timestamp: Date.now()
        }, ...prev];
        updateNotifications(newRequests.length);
        return newRequests;
      });
    });
    
    socket.on("friendRequestCancelled", (data) => {
      const { requestId } = data;
      setRequests(prev => {
        const filteredRequests = prev.filter(request => request._id !== requestId);
        updateNotifications(filteredRequests.length);
        return filteredRequests;
      });
    });
    
    return () => {
      socket.off("receiveFriendRequest");
      socket.off("friendRequestCancelled");
    };
  }, [updateNotifications]);

  // Handle request acceptance with socket
  const handleAccept = useCallback(async (requestId, senderId) => {
    setProcessingRequests(prev => {
      const newMap = new Map(prev);
      newMap.set(requestId, "accepting");
      return newMap;
    });

    try {
      // Sử dụng socket để chấp nhận lời mời
      const socket = socketManager.connect();
      socket.emit("acceptFriendRequest", { requestId, senderId });
      
      socket.once("friendRequestAccepted", (data) => {
        if (data.success) {
          setRequests(prev => {
            const newRequests = prev.filter(request => request._id !== requestId);
            updateNotifications(newRequests.length);
            return newRequests;
          });
          toast.success("Đã chấp nhận lời mời kết bạn");
        } else {
          toast.error("Không thể chấp nhận lời mời");
        }
        
        setProcessingRequests(prev => {
          const newMap = new Map(prev);
          newMap.delete(requestId);
          return newMap;
        });
      });
      
    } catch (error) {
      toast.error("Không thể chấp nhận lời mời");
      setProcessingRequests(prev => {
        const newMap = new Map(prev);
        newMap.delete(requestId);
        return newMap;
      });
    }
  }, [updateNotifications]);

  // Handle request rejection with socket
  const handleReject = useCallback(async (requestId, senderId) => {
    setProcessingRequests(prev => {
      const newMap = new Map(prev);
      newMap.set(requestId, "rejecting");
      return newMap;
    });

    try {
      // Sử dụng socket để từ chối lời mời
      const socket = socketManager.connect();
      if (!socket) {
        throw new Error("Không thể kết nối đến máy chủ");
      }
      
      socket.emit("rejectFriendRequest", { requestId, senderId });
      
      socket.once("friendRequestRejected", (data) => {
        if (data.success) {
          setRequests(prev => {
            const newRequests = prev.filter(request => request._id !== requestId);
            updateNotifications(newRequests.length);
            return newRequests;
          });
          toast.success("Đã từ chối lời mời kết bạn");
        } else {
          toast.error("Không thể từ chối lời mời");
        }
        
        setProcessingRequests(prev => {
          const newMap = new Map(prev);
          newMap.delete(requestId);
          return newMap;
        });
      });
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast.error("Không thể từ chối lời mời");
      
      // Thử fallback API nếu socket thất bại
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_APP_BACKEND_URL}/api/reject-friend-request`,
          { requestId },
          { withCredentials: true }
        );
        
        if (response.data.success) {
          setRequests(prev => {
            const newRequests = prev.filter(request => request._id !== requestId);
            updateNotifications(newRequests.length);
            return newRequests;
          });
          toast.success("Đã từ chối lời mời kết bạn");
        }
      } catch (apiError) {
        console.error("API fallback failed:", apiError);
      }
      
      setProcessingRequests(prev => {
        const newMap = new Map(prev);
        newMap.delete(requestId);
        return newMap;
      });
    }
  }, [updateNotifications]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Lời mời kết bạn</h2>
      {requests.length === 0 ? (
        <p className="text-gray-500">Không có lời mời kết bạn nào</p>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <RequestItem 
              key={request._id}
              request={request}
              onAccept={handleAccept}
              onReject={handleReject}
              isProcessing={processingRequests.get(request._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}