import { faAddressCard, faEdit } from "@fortawesome/free-regular-svg-icons";
import { faBan, faTriangleExclamation, faUserGroup } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import Images from "../constants/images";
import { socketManager } from "../socket/socketConfig";

export default function UserCard({ isUser, dataUser, setInfoUserVisible, onClose }) {
  const [isSending, setIsSending] = useState(false);
  const [hasSentRequest, setHasSentRequest] = useState(false);
  const [friendStatus, setFriendStatus] = useState(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);
  const isMounted = useRef(true);
  const [retryCount, setRetryCount] = useState(0);
  const checkTimeoutRef = useRef(null);
  const [showUnfriendConfirm, setShowUnfriendConfirm] = useState(false);

  // Kiểm tra trạng thái kết bạn ban đầu với socket và API fallback
  useEffect(() => {
    const checkFriendStatusWithFallback = async () => {
      if (!dataUser?._id) {
        setIsStatusLoading(false);
        return;
      }
      
      setIsStatusLoading(true);
      let statusChecked = false;
      
      // First try using socket
      if (socketManager.isConnected()) {
        console.log("Attempting to check friend status via socket for:", dataUser._id);
        
        try {
          // Return a promise that resolves when the socket response is received
          await new Promise((resolve, reject) => {
            socketManager.emit("checkFriendStatus", { userId: dataUser._id }, (response) => {
              if (!isMounted.current) {
                resolve();
                return;
              }
              
              if (response && response.success) {
                console.log("Friend status from socket:", response.data);
                setFriendStatus(response.data);
                setHasSentRequest(response.data?.status === 'pending' && response.data?.isSender);
                statusChecked = true;
              } else {
                console.warn("Socket friend status check failed:", response?.error || "Unknown error");
              }
              
              setIsStatusLoading(false);
              resolve();
            });
            
            // Set timeout for socket response
            checkTimeoutRef.current = setTimeout(() => {
              if (!statusChecked) {
                console.warn("Socket friend status check timed out");
                reject(new Error("Socket timeout"));
              }
            }, 3000);
          });
          
          // Clear timeout if the promise resolved
          if (checkTimeoutRef.current) {
            clearTimeout(checkTimeoutRef.current);
            checkTimeoutRef.current = null;
          }
          
          // If we got the status, we're done
          if (statusChecked) return;
        } catch (error) {
          console.error("Socket friend status check error:", error);
          // Continue to API fallback
        }
      }
      
      // Fallback to REST API if socket failed or timed out
      try {
        console.log("Using API fallback for friend status check");
        const response = await fetch(
          `${import.meta.env.VITE_APP_BACKEND_URL}/api/check-friend-status/${dataUser._id}`,
          { 
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        const data = await response.json();
        
        if (data.success) {
          console.log("Friend status from API:", data.data);
          setFriendStatus(data.data);
          setHasSentRequest(data.data?.status === 'pending' && data.data?.isSender);
          statusChecked = true;
        } else {
          console.error("API friend status check failed:", data);
        }
      } catch (error) {
        console.error("API friend status check error:", error);
      } finally {
        setIsStatusLoading(false);
      }
      
      // If all checks failed, retry up to 2 times
      if (!statusChecked && retryCount < 2) {
        console.log(`Retrying friend status check (attempt ${retryCount + 1})`);
        setRetryCount(prevCount => prevCount + 1);
        // Will trigger a re-run of the effect due to retryCount change
      }
    };

    isMounted.current = true;
    
    if (!isUser && dataUser?._id) {
      checkFriendStatusWithFallback();
    } else {
      setIsStatusLoading(false);
    }
    
    return () => {
      isMounted.current = false;
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
        checkTimeoutRef.current = null;
      }
    };
  }, [dataUser?._id, isUser, retryCount]);

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

    // Thêm listener mới: Lắng nghe khi lời mời kết bạn được chấp nhận
    function handleFriendRequestAccepted(data) {
      console.log("Friend request accepted:", data);
      // Kiểm tra nếu đây là lời mời mà component hiện tại quan tâm
      if (data.requestId === friendStatus?.requestId || 
          (data.receiver && data.receiver._id === dataUser._id)) {
        // Cập nhật trạng thái thành đã kết bạn
        setFriendStatus({
          status: 'accepted',
          requestId: data.requestId
        });
        setHasSentRequest(false);
        setIsSending(false);
        toast.success(`Đã trở thành bạn bè với ${dataUser.name}`);
      }
    }

    // Thêm listener mới: Lắng nghe khi bạn bè bị xóa
    function handleFriendRemoved(data) {
      console.log("Friend removed:", data);
      // Nếu người dùng hiện tại bị xóa khỏi danh sách bạn bè
      if (data.friendId === dataUser._id) {
        setFriendStatus(null);
        setHasSentRequest(false);
      }
    }

    // Lắng nghe khi lời mời kết bạn bị từ chối
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
    socket.on("friendRequestAccepted", handleFriendRequestAccepted);
    socket.on("friendRemoved", handleFriendRemoved);

    return () => {
      socket.off("friendRequestSent", handleFriendRequestSent);
      socket.off("friendRequestCancelled", handleFriendRequestCancelled);
      socket.off("friendRequestError", handleFriendRequestError);
      socket.off("friendRequestRejected", handleFriendRequestRejected);
      socket.off("friendRequestAccepted", handleFriendRequestAccepted);
      socket.off("friendRemoved", handleFriendRemoved);
    };
  }, [isUser, dataUser?._id, dataUser?.name, friendStatus?.requestId]);

  const handleFriendRequest = async () => {
    if (!socketManager.isConnected()) {
      toast.error("Không thể kết nối đến máy chủ");
      return;
    }

    try {
      setIsSending(true);
      
      // Update the message based on the action
      const actionMessage = friendStatus?.status === 'pending' 
        ? (friendStatus.isSender ? "Đang hủy lời mời..." : "Đang từ chối lời mời...")
        : "Đang gửi lời mời...";
      
      const toastId = toast.message(actionMessage);

      // Use socket exclusively for all interactions
      if (friendStatus?.status === 'pending') {
        if (friendStatus.isSender) {
          // Cancel friend request via socket
          console.log("Cancelling friend request via socket:", friendStatus.requestId);
          socketManager.emit("cancelFriendRequest", {
            requestId: friendStatus.requestId,
            receiverId: dataUser._id
          });
        } else {
          // Reject friend request via socket
          console.log("Rejecting friend request via socket:", friendStatus.requestId);
          socketManager.emit("rejectFriendRequest", {
            requestId: friendStatus.requestId,
            senderId: dataUser._id
          });
        }
      } else {
        // Send new friend request via socket
        console.log("Sending friend request via socket to:", dataUser._id);
        socketManager.emit("sendFriendRequest", {
          receiverId: dataUser._id
        });
      }

      // Set a timeout to display an error if no response is received
      setTimeout(() => {
        if (isSending && isMounted.current) {
          console.error("No response received from socket server");
          toast.error("Không nhận được phản hồi từ máy chủ", { id: toastId });
          setIsSending(false);
        }
      }, 5000);
      
    } catch (error) {
      toast.error("Có lỗi xảy ra khi xử lý yêu cầu");
      setIsSending(false);
    }
  };

  // Add a new function to handle unfriending
  const handleUnfriend = () => {
    // Show confirmation dialog
    setShowUnfriendConfirm(true);
  };

  // Confirm unfriend action
  const confirmUnfriend = () => {
    if (!socketManager.isConnected()) {
      toast.error("Không thể kết nối đến máy chủ");
      setShowUnfriendConfirm(false);
      return;
    }

    setShowUnfriendConfirm(false);
    const toastId = toast.message("Đang hủy kết bạn...");

    // Use socket for unfriending
    console.log("Removing friend via socket:", dataUser._id);
    socketManager.emit("removeFriend", {
      friendId: dataUser._id
    });
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
          {isStatusLoading ? (
            // Enhanced loading state with better indication
            <button
              className="flex h-8 flex-1 items-center justify-center rounded-[3px] bg-[#e5e7eb] text-sm font-semibold opacity-70"
              disabled
            >
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"></span>
              Đang kiểm tra trạng thái...
            </button>
          ) : friendStatus?.status === "accepted" ? (
            // Updated button - not disabled, clear hover state
            <button
              className="flex h-8 flex-1 items-center justify-center rounded-[3px] bg-[#e5e7eb] text-sm font-semibold hover:bg-[#d3d5d9]"
              onClick={handleUnfriend}
            >
              Bạn bè
            </button>
          ) : (
            <button
              className={`flex h-8 flex-1 items-center justify-center rounded-[3px] text-sm font-semibold disabled:opacity-50 ${
                friendStatus?.status === "pending"
                  ? friendStatus.isSender
                    ? "bg-[#ffebeb] text-[#ad0000] hover:bg-[#ffdbdb]" 
                    : "bg-[#ea4335] text-white hover:bg-[#d73c30]"
                  : "bg-[#e5e7eb] hover:bg-[#c6cad2]"
              }`}
              onClick={handleFriendRequest}
              disabled={isSending}
            >
              {isSending
                ? "Đang xử lý..."
                : friendStatus?.status === "pending"
                  ? friendStatus.isSender
                    ? "Hủy lời mời"
                    : "Từ chối" 
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

      {/* Confirmation modal for unfriending */}
      {showUnfriendConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-80 rounded-lg bg-white p-4 shadow-lg">
            <h3 className="mb-4 text-lg font-medium">Xác nhận hủy kết bạn</h3>
            <p className="mb-4 text-sm text-gray-600">
              Bạn có chắc chắn muốn hủy kết bạn với {dataUser?.name}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="rounded-md bg-gray-200 px-4 py-2 text-sm hover:bg-gray-300"
                onClick={() => setShowUnfriendConfirm(false)}
              >
                Hủy
              </button>
              <button
                className="rounded-md bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
                onClick={confirmUnfriend}
              >
                Xác nhận
              </button>
            </div>
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
