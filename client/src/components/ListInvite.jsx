import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { socketManager } from "../socket/socketConfig";
import { useNavigate } from "react-router-dom";

export default function ListInvite() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingRequests, setProcessingRequests] = useState(new Map());
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingRequests();

    // Thiết lập kết nối socket
    const socket = socketManager.connect();

    // Lắng nghe khi có lời mời mới
    socket.on("receiveFriendRequest", (data) => {
      const { requestId, sender } = data;
      setRequests((prev) => {
        if (prev.some((req) => req._id === requestId)) return prev;
        return [
          {
            _id: requestId,
            sender,
            timestamp: Date.now(),
          },
          ...prev,
        ];
      });

      toast.info(`${sender.name} đã gửi lời mời kết bạn`, {
        duration: 5000,
        position: "top-right",
        action: {
          label: "Xem",
          onClick: () => navigate("/bookphone/listinvites"),
        },
      });
    });

    // Lắng nghe khi lời mời bị hủy
    socket.on("friendRequestCancelled", (data) => {
      const { requestId } = data;
      setRequests((prev) => prev.filter((request) => request._id !== requestId));
      toast.info("Lời mời kết bạn đã bị hủy");
    });

    return () => {
      socket.off("receiveFriendRequest");
      socket.off("friendRequestCancelled");
    };
  }, [navigate]);

  const fetchPendingRequests = async () => {
    try {
      // Hiển thị trạng thái đang tải
      setLoading(true);

      // Sử dụng socket để lấy danh sách lời mời
      const socket = socketManager.connect();
      socket.emit("getFriendRequests");

      socket.once("friendRequests", (response) => {
        if (response.success) {
          setRequests(response.data);
        } else {
          toast.error("Không thể lấy danh sách lời mời");
        }
        setLoading(false);
      });
    } catch (error) {
      toast.error("Có lỗi xảy ra khi tải danh sách lời mời");
      setLoading(false);
    }
  };

  const handleResponse = async (requestId, senderId, action) => {
    try {
      // Hiển thị trạng thái xử lý
      setProcessingRequests((prev) => {
        const newMap = new Map(prev);
        newMap.set(requestId, action);
        return newMap;
      });

      // Sử dụng socket để trả lời lời mời
      const socket = socketManager.connect();

      if (action === "accepted") {
        // Chấp nhận lời mời
        socket.emit("acceptFriendRequest", { requestId, senderId });

        // Lắng nghe phản hồi
        socket.once("friendRequestAccepted", (data) => {
          if (data.success) {
            toast.success("Đã chấp nhận lời mời kết bạn");
            setRequests((prev) => prev.filter((request) => request._id !== requestId));
          } else {
            toast.error("Không thể chấp nhận lời mời");
          }

          // Xóa trạng thái xử lý
          setProcessingRequests((prev) => {
            const newMap = new Map(prev);
            newMap.delete(requestId);
            return newMap;
          });
        });
      } else {
        // Từ chối lời mời
        socket.emit("rejectFriendRequest", { requestId, senderId });

        // Lắng nghe phản hồi
        socket.once("friendRequestRejected", (data) => {
          if (data.success) {
            toast.success("Đã từ chối lời mời kết bạn");
            setRequests((prev) => prev.filter((request) => request._id !== requestId));
          } else {
            toast.error("Không thể từ chối lời mời");
          }

          // Xóa trạng thái xử lý
          setProcessingRequests((prev) => {
            const newMap = new Map(prev);
            newMap.delete(requestId);
            return newMap;
          });
        });
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra");

      // Xóa trạng thái xử lý
      setProcessingRequests((prev) => {
        const newMap = new Map(prev);
        newMap.delete(requestId);
        return newMap;
      });
    }
  };

  return (
    <div className="h-full p-4">
      {loading ? (
        <div className="flex h-20 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-500">Không có lời mời kết bạn nào</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request._id}
              className="flex items-center justify-between rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                <img
                  src={request.sender.profilePic}
                  alt="avatar"
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium">{request.sender.name}</p>
                  <p className="text-sm text-gray-500">{request.sender.email}</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleResponse(request._id, request.sender._id, "accepted")}
                  className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                  disabled={processingRequests.has(request._id)}
                >
                  {processingRequests.get(request._id) === "accepted" ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  ) : (
                    <FontAwesomeIcon icon={faCheck} />
                  )}
                  Đồng ý
                </button>
                <button
                  onClick={() => handleResponse(request._id, request.sender._id, "rejected")}
                  className="flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300"
                  disabled={processingRequests.has(request._id)}
                >
                  {processingRequests.get(request._id) === "rejected" ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"></div>
                  ) : (
                    <FontAwesomeIcon icon={faXmark} />
                  )}
                  Từ chối
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
