
import { faMessage } from "@fortawesome/free-regular-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function ListFriend() {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const currentUser = useSelector((state) => state.user);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_APP_BACKEND_URL}/api/friends`,
          { withCredentials: true }
        );

        // Lọc và xử lý danh sách bạn bè
        const processedFriends = response.data.data.map(friend => {
          // Nếu người dùng hiện tại là sender, hiển thị thông tin receiver
          if (friend.sender._id === currentUser._id) {
            return {
              ...friend,
              friendInfo: friend.receiver
            };
          }
          // Ngược lại hiển thị thông tin sender
          return {
            ...friend,
            friendInfo: friend.sender
          };
        });

        setFriends(processedFriends);
      } catch (error) {
        toast.error(error.response?.data?.message || "Có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [currentUser._id]);

  return (
    <div className="h-full p-4">
      {loading ? (
        <div className="flex h-20 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-500"></div>
        </div>
      ) : friends.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-gray-500">Chưa có bạn bè</p>
        </div>
      ) : (
        <div className="space-y-4">
          {friends.map((friend) => (
            <div key={friend._id} className="flex items-center justify-between rounded-lg p-4 hover:bg-gray-50">
              <div className="flex items-center space-x-4">
                <img
                  src={friend.friendInfo.profilePic}
                  alt="avatar"
                  className="h-12 w-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium">{friend.friendInfo.name}</p>
                  <p className="text-sm text-gray-500">{friend.friendInfo.email}</p>
                </div>
              </div>
              <button
                onClick={() => navigate(`/chat/${friend.friendInfo._id}`)}
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                <FontAwesomeIcon icon={faMessage} />
                Nhắn tin
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
