import axios from 'axios';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSocketEvent } from '../hooks/useSocketEvent';
import { socketManager } from '../socket/socketConfig';
import { useNotifications } from '../contexts/NotificationContext';

const RequestItem = memo(({ request, onAccept, onReject }) => {
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
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Chấp nhận
        </button>
        <button
          onClick={() => onReject(request._id, request.sender._id)}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
        >
          Từ chối
        </button>
      </div>
    </div>
  );
});

import { useNotifications } from '../contexts/NotificationContext';
import { useLocation } from 'react-router-dom';

export default function FriendRequests() {
  const location = useLocation();
  const [requests, setRequests] = useState([]);

  // Add immediate refresh when route changes to listinvites
  useEffect(() => {
    if (location.pathname === '/bookphone/listinvites') {
      fetchRequests();
    }
  }, [location]);

  // Add real-time update handler
  useSocketEvent("receiveFriendRequest", (data) => {
    const { requestId, sender } = data;
    // Force immediate update
    setRequests(prev => {
      if (prev.some(req => req._id === requestId)) return prev;
      return [{
        _id: requestId,
        sender,
        timestamp: Date.now()
      }, ...prev];
    });
  });
  const [loading, setLoading] = useState(true);
  const [localRequests, setLocalRequests] = useState(new Map());
  const toastId = useRef(null);
  const { updateNotifications } = useNotifications();

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_APP_BACKEND_URL}/api/friend-requests/received`,
          { withCredentials: true }
        );
        if (response.data.success) {
          const newRequests = response.data.data.map(request => ({
            ...request,
            timestamp: Date.now()
          }));
          setRequests(newRequests);
          updateNotifications(newRequests.length); // Update notification count
        }
      } catch (error) {
        console.error("Error fetching requests:", error);
        toast.error("Không thể tải danh sách lời mời");
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [updateNotifications]);

  useSocketEvent("receiveFriendRequest", (data) => {
    const { requestId, sender } = data;
    setRequests(prev => {
      if (prev.some(req => req._id === requestId)) return prev;
      const newRequests = [{
        _id: requestId,
        sender,
        timestamp: Date.now()
      }, ...prev];
      updateNotifications(newRequests.length); // Update notification count
      return newRequests;
    });

    toast.info(`${sender.name} đã gửi lời mời kết bạn`, {
      duration: 3000,
      important: true,
      position: "top-right"
    });
  });

  // Update handleAccept and handleReject to manage notifications
  const handleAccept = useCallback(async (requestId, senderId) => {
    const tempId = `temp_${Date.now()}`;
    setLocalRequests(prev => {
      const newMap = new Map(prev);
      newMap.set(requestId, { status: 'accepting', id: tempId });
      return newMap;
    });

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/accept-friend-request`,
        { requestId },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        setRequests(prev => {
          const newRequests = prev.filter(request => request._id !== requestId);
          updateNotifications(newRequests.length);
          return newRequests;
        });
        toast.success("Đã chấp nhận lời mời kết bạn");
        socketManager.emit("acceptFriendRequest", { requestId, senderId });
      }
    } catch (error) {
      setLocalRequests(prev => {
        const newMap = new Map(prev);
        newMap.delete(requestId);
        return newMap;
      });
      toast.error("Không thể chấp nhận lời mời");
    }
  }, [updateNotifications]);

  // Similar update for handleReject
  const handleReject = useCallback(async (requestId, senderId) => {
    const tempId = `temp_${Date.now()}`;
    setLocalRequests(prev => {
      const newMap = new Map(prev);
      newMap.set(requestId, { status: 'rejecting', id: tempId });
      return newMap;
    });

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/reject-friend-request`,
        { requestId },
        { withCredentials: true }
      );
      
      if (response.data.success) {
        setRequests(prev => prev.filter(request => request._id !== requestId));
        toast.success("Đã từ chối lời mời kết bạn");
        socket.emit("rejectFriendRequest", { requestId, senderId });
      }
    } catch (error) {
      setLocalRequests(prev => {
        const newMap = new Map(prev);
        newMap.delete(requestId);
        return newMap;
      });
      toast.error("Không thể từ chối lời mời");
    }
  }, [updateNotifications]);

  if (loading) {
    return <div>Đang tải...</div>;
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
              isLocal={localRequests.has(request._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}