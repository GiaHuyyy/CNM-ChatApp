
import { faCheck, faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function ListInvite() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingRequests();
  }, []);

  const fetchPendingRequests = async () => {
    try {
      const response = await axios.get(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/pending-friend-requests`,
        { withCredentials: true }
      );
      setRequests(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (requestId, status) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/respond-friend-request`,
        { requestId, status },
        { withCredentials: true }
      );
      toast.success(response.data.message);
      fetchPendingRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra");
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
            <div key={request._id} className="flex items-center justify-between rounded-lg p-4 hover:bg-gray-50">
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
                  onClick={() => handleResponse(request._id, "accepted")}
                  className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                >
                  <FontAwesomeIcon icon={faCheck} />
                  Đồng ý
                </button>
                <button
                  onClick={() => handleResponse(request._id, "rejected")}
                  className="flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 hover:bg-gray-300"
                >
                  <FontAwesomeIcon icon={faXmark} />
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
