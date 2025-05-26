import { faAddressCard, faEdit } from "@fortawesome/free-regular-svg-icons";
import { faBan, faTriangleExclamation, faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Images from "../constants/images";
import { socketManager } from "../socket/socketConfig"; // Thay đổi từ socket sang socketManager

export default function UserCard({ isUser, dataUser, setInfoUserVisible, onClose }) {
  const [isSending, setIsSending] = useState(false);
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [friendStatus, setFriendStatus] = useState(null);

  // Kiểm tra trạng thái kết bạn ban đầu
  useEffect(() => {
    const checkFriendStatus = async () => {
      try {
        if (!dataUser?._id) return;

        const response = await axios.get(
          `${import.meta.env.VITE_APP_BACKEND_URL}/api/check-friend-status/${dataUser._id}`,
          { withCredentials: true }
        );

        if (response.data.success) {
          console.log("Friend status:", response.data.data);
          setFriendStatus(response.data.data);
          setHasSentRequest(
            response.data.data.status === 'pending' && response.data.data.isSender
          );
        }
      } catch (error) {
        console.error("Error checking friend status:", error);
      }
    };

    if (!isUser && dataUser?._id) {
      checkFriendStatus();
    }
  }, [dataUser?._id, isUser]);

  // Thiết lập socket listeners
  useEffect(() => {
    if (isUser || !dataUser?._id) return;

    console.log(`Setting up socket listeners for user card: ${dataUser?.name}`);
    const socket = socketManager.connect();
    if (!socket) return;

    function handleFriendRequestSent(data) {
      console.log("Friend request sent:", data);
      if (data.success) {
        setFriendStatus({
          status: 'pending',
          isSender: true,
          requestId: data.data._id
        });
        setHasSentRequest(true);
        setIsSending(false);
      }
    }

    function handleFriendRequestCancelled(data) {
      console.log("Friend request cancelled:", data);
      if (data.success) {
        setFriendStatus(null);
        setHasSentRequest(false);
        setIsSending(false);
      }
    }

    function handleFriendRequestError(data) {
      console.error("Friend request error:", data);
      toast.error(data.message);
      setIsSending(false);
    }

    // Thêm listener mới: Lắng nghe khi lời mời kết bạn bị từ chối
    function handleFriendRequestRejected(data) {
      console.log("Friend request rejected:", data);
      // Kiểm tra xem đây có phải lời mời của người dùng hiện tại hay không
      if (data.receiver?.name && friendStatus?.requestId === data.requestId) {
        toast.info(`${data.receiver.name} đã từ chối lời mời kết bạn của bạn`);
        // Reset trạng thái để hiển thị nút "Kết bạn" trở lại
        setFriendStatus(null);
        setHasSentRequest(false);
        setIsSending(false);
      }
    }

    socket.on("friendRequestSent", handleFriendRequestSent);
    socket.on("friendRequestCancelled", handleFriendRequestCancelled);
    socket.on("friendRequestError", handleFriendRequestError);
    socket.on("friendRequestRejected", handleFriendRequestRejected);

    return () => {
      socket.off("friendRequestSent", handleFriendRequestSent);
      socket.off("friendRequestCancelled", handleFriendRequestCancelled);
      socket.off("friendRequestError", handleFriendRequestError);
      socket.off("friendRequestRejected", handleFriendRequestRejected);
    };
  }, [isUser, dataUser?._id, dataUser?.name, friendStatus?.requestId]);

  const handleFriendRequest = async () => {
    if (!socketManager.isConnected()) {
      toast.error("Không thể kết nối đến máy chủ");
      return;
    }

    try {
      setIsSending(true);
      const toastId = toast.loading(
        friendStatus?.status === 'pending' ? "Đang hủy lời mời..." : "Đang gửi lời mời..."
      );

      if (friendStatus?.status === 'pending' && friendStatus?.isSender) {
        console.log("Cancelling friend request:", friendStatus.requestId);
        // Hủy lời mời kết bạn qua socket
        socketManager.emit("cancelFriendRequest", {
          requestId: friendStatus.requestId,
          receiverId: dataUser._id
        });

        // Fallback nếu socket không phản hồi sau 3 giây
        setTimeout(() => {
          if (isSending) {
            console.log("Socket timeout, using API fallback");
            handleCancelViaAPI(friendStatus.requestId, dataUser._id, toastId);
          }
        }, 3000);
      } else {
        console.log("Sending friend request to:", dataUser._id);
        // Gửi lời mời kết bạn qua socket
        socketManager.emit("sendFriendRequest", {
          receiverId: dataUser._id
        });

        // Fallback nếu socket không phản hồi sau 3 giây
        setTimeout(() => {
          if (isSending) {
            console.log("Socket timeout, using API fallback");
            handleSendViaAPI(dataUser._id, toastId);
          }
        }, 3000);
      }
    } catch (error) {
      toast.error("Có lỗi xảy ra khi xử lý yêu cầu");
      setIsSending(false);
    }
  };

  // Fallback API handlers
  const handleSendViaAPI = async (receiverId, toastId) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/send-friend-request`,
        { receiverId },
        { withCredentials: true }
      );
      if (response.data.success) {
        toast.success("Đã gửi lời mời kết bạn", { id: toastId });
        setFriendStatus({
          status: 'pending',
          isSender: true,
          requestId: response.data.data._id
        });
        setHasSentRequest(true);
      } else {
        toast.error(response.data.message, { id: toastId });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra", { id: toastId });
    } finally {
      setIsSending(false);
    }
  };

  const handleCancelViaAPI = async (requestId, receiverId, toastId) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_APP_BACKEND_URL}/api/cancel-friend-request`,
        { requestId, receiverId },
        { withCredentials: true }
      );
      if (response.data.success) {
        toast.success("Đã hủy lời mời kết bạn", { id: toastId });
        setFriendStatus(null);
        setHasSentRequest(false);
      } else {
        toast.error(response.data.message, { id: toastId });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Có lỗi xảy ra", { id: toastId });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-h-[570px] overflow-y-auto">
      <div className="h-[171px] w-full">
        <img src={Images.BLACK} alt="" className="h-full w-full object-cover" />
      </div>
      {/* Avatar */}
      <div className="-mt-4 mb-[6px] flex items-center gap-x-3 p-4 pt-0">
        <img src={dataUser?.profilePic} alt="avatar" className="h-20 w-20 rounded-full border-white object-cover" />
        <span className="text-lg font-semibold">{dataUser?.name}</span>
        <button onClick={setInfoUserVisible}>
          <FontAwesomeIcon icon={faEdit} width={20} />
        </button>
      </div>

      {!isUser && (
        <div className="flex justify-center gap-x-2 px-4 pb-4">
          {friendStatus?.status === "accepted" ? (
            <button
              className="flex h-8 flex-1 items-center justify-center rounded-[3px] bg-[#e5e7eb] text-sm font-semibold"
              disabled
            >
              Bạn bè
            </button>
          ) : (
            <button
              className={`flex h-8 flex-1 items-center justify-center rounded-[3px] text-sm font-semibold disabled:opacity-50 ${
                hasSentRequest ? "bg-[#ffebeb] text-[#ad0000] hover:bg-[#ffdbdb]" : "bg-[#e5e7eb] hover:bg-[#c6cad2]"
              }`}
              onClick={handleFriendRequest}
              disabled={isSending || (friendStatus?.status === "pending" && !friendStatus?.isSender)}
            >
              {isSending
                ? "Đang xử lý..."
                : friendStatus?.status === "pending"
                  ? friendStatus.isSender
                    ? "Hủy lời mời"
                    : "Đã nhận lời mời"
                  : "Kết bạn"}
            </button>
          )}
          <Link
            to={"/chat/" + dataUser?._id}
            onClick={onClose}
            className="flex h-8 flex-1 items-center justify-center rounded-[3px] bg-[#dbebff] text-sm font-semibold text-[#0045ad] hover:bg-[#c7e0ff]"
          >
            Nhắn tin
          </Link>
        </div>
      )}

      <div className="h-[6px] w-full bg-[#ebecf0]"></div>

      <div className="px-4 py-3">
        {/* Info */}
        <div>
          <p className="text-base font-semibold">Thông tin cá nhân</p>
          <div className="mt-3">
            <div className="flex items-center">
              <span className="w-[100px] text-sm text-[#5a6981]">Giới tính</span>
              <span className="text-sm">
                {dataUser?.gender === "male" ? "Nam" : dataUser?.gender === "female" ? "Nữ" : "Chưa có"}
              </span>
            </div>
            <div className="mt-2 flex items-center">
              <span className="w-[100px] text-sm text-[#5a6981]">Ngày sinh</span>
              <span className="text-sm">
                {dataUser?.dateOfBirth ? new Date(dataUser.dateOfBirth).toLocaleDateString("vi-VN") : "Chưa có"}
              </span>
            </div>
            {isUser && (
              <div className="mt-2 flex items-center">
                <span className="w-[100px] text-sm text-[#5a6981]">Điện thoại</span>
                <span className="text-sm">{dataUser?.phone ? `+84 ${dataUser.phone}` : "Chưa có"}</span>
              </div>
            )}
            {isUser && (
              <p className="mt-3 text-[13px] font-normal leading-[18px] text-[#5a6981]">
                Chỉ bạn bè có lưu số của bạn trong danh sách danh bạ máy xem được số này
              </p>
            )}
          </div>

          {isUser && (
            <div>
              <div className="my-3 border border-[#0000000d]"></div>

              <button
                className="flex w-full items-center justify-center gap-x-2 rounded py-1 hover:bg-[#f0f2f5]"
                onClick={setInfoUserVisible}
              >
                <FontAwesomeIcon icon={faEdit} width={20} />
                <span className="font-semibold">Cập nhật</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {!isUser && (
        <div>
          <div className="mt-3 h-[6px] w-full bg-[#ebecf0]"></div>

          <div className="py-3">
            <button className="flex w-full items-center gap-x-2 px-4 py-3" disabled>
              <FontAwesomeIcon icon={faUserGroup} width={14} className="text-[#8b96a7]" />
              <span className="text-sm text-[#8b96a7]">Nhóm chung (0)</span>
            </button>
            <button className="flex w-full items-center gap-x-2 px-4 py-3" disabled>
              <FontAwesomeIcon icon={faAddressCard} width={14} className="text-[#8b96a7]" />
              <span className="text-sm text-[#8b96a7]">Chia sẻ danh thiếp</span>
            </button>
            <button className="flex w-full items-center gap-x-2 px-4 py-3 hover:bg-[#f1f2f4]">
              <FontAwesomeIcon icon={faBan} width={14} className="text-[#717a88]" />
              <span className="text-sm">Chặn tin nhắn và cuộc gọi</span>
            </button>
            <button className="flex w-full items-center gap-x-2 px-4 py-3 hover:bg-[#f1f2f4]">
              <FontAwesomeIcon icon={faTriangleExclamation} width={14} className="text-[#717a88]" />
              <span className="text-sm">Báo xấu</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

UserCard.propTypes = {
  isUser: PropTypes.bool,
  dataUser: PropTypes.object,
  setInfoUserVisible: PropTypes.func,
  onClose: PropTypes.func,
};
