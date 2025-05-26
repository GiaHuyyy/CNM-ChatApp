import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faEdit, faUser } from "@fortawesome/free-regular-svg-icons";
import {
  faCaretDown,
  faChevronLeft,
  faGear,
  faLink,
  faSignOut,
  faThumbTack,
  faTrash,
  faUsers,
  faFilePen,
  faCommentSlash,
  faComment,
  faUserPlus,
  faUserMinus, // Add this new icon for removing deputy status
} from "@fortawesome/free-solid-svg-icons";
import commingSoon from "../helpers/commingSoon";
import { format } from "date-fns";
import ImageViewerModal from "./ImageViewerModal";
import EditGroupModal from "./EditGroupModal";
import { toast } from "sonner";
import handleRemoveMember from "./handles/handleRemoveMember";
import handleToggleMute from "./handles/handleToggleMute";
import { useNavigate } from "react-router-dom";
import handleLeaveGroup from "./handles/handleLeaveGroup";
import handleDeleteConversation from "./handles/handleDeleteConversation";

// File type
const isImageFile = (url) => {
  if (!url) return false;
  const extensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"];
  return extensions.some((ext) => url.toLowerCase().endsWith(ext));
};

const isVideoFile = (url) => {
  if (!url) return false;
  const extensions = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];
  return extensions.some((ext) => url.toLowerCase().endsWith(ext));
};

const isLinkText = (text) => {
  return text && (text.startsWith("http://") || text.startsWith("https://"));
};

// Action Group Button component
const ActionGroupButton = ({ icon, title, handleOnClick }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-y-1">
      <button
        onClick={handleOnClick}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ebe7eb] hover:bg-[#e0dde0]"
      >
        <FontAwesomeIcon icon={icon} width={20} />
      </button>
      <span className="w-16 text-center text-xs">{title}</span>
    </div>
  );
};

ActionGroupButton.propTypes = {
  icon: PropTypes.object,
  title: PropTypes.string,
  handleOnClick: PropTypes.func,
};

// SidebarSection component
const SidebarSection = ({ title, children, emptyMessage, onViewAll, activeTab }) => {
  return (
    <div className="mt-2 flex flex-col items-center bg-white">
      <button className="flex h-12 w-full items-center justify-between px-4">
        <span className="text-base font-semibold">{title}</span>
        <FontAwesomeIcon icon={faCaretDown} width={20} />
      </button>

      {children.length > 0 ? (
        <div className="w-full">
          <div className={title === "File" || title === "Link" ? "flex flex-col" : "grid grid-cols-4 gap-2 px-4"}>
            {children}
          </div>
          <div className="p-4">
            <button
              className="flex h-8 w-full items-center justify-center gap-x-1 rounded-sm bg-[#ebe7eb] text-sm font-semibold hover:bg-[#e0dde0]"
              onClick={() => onViewAll(activeTab)}
            >
              Xem tất cả
            </button>
          </div>
        </div>
      ) : (
        <span className="h-10 text-[13px] text-[#888]">{emptyMessage}</span>
      )}
    </div>
  );
};

SidebarSection.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.array,
  emptyMessage: PropTypes.string.isRequired,
  onViewAll: PropTypes.func.isRequired,
  activeTab: PropTypes.string.isRequired,
};

// MediaItem component
const MediaItem = ({ message, type, handleImageClick }) => {
  // Render media content with the files array as the primary source
  const renderMediaContent = () => {
    if (message.files && Array.isArray(message.files) && message.files.length > 0) {
      const file = message.files[0]; // Get the first file from the array

      if (type === "photo") {
        if (file.type?.startsWith("image/")) {
          return (
            <button
              className="h-[72px] w-full overflow-hidden hover:opacity-80"
              onClick={() => handleImageClick(file.url)}
            >
              <img src={file.url} alt="image" className="h-full w-full rounded-[3px] object-cover" />
            </button>
          );
        } else if (file.type?.startsWith("video/")) {
          return (
            <button
              className="h-[72px] w-full overflow-hidden hover:opacity-80"
              onClick={() => handleImageClick(file.url)}
            >
              <video className="h-full w-full rounded-[3px] object-cover">
                <source src={file.url} type={file.type} />
                Your browser does not support video.
              </video>
            </button>
          );
        }
      } else if (type === "file") {
        return (
          <a
            href={file.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-16 items-center justify-center px-4 hover:bg-[#f1f2f4]"
          >
            <FontAwesomeIcon icon={faFilePen} width={20} className="text-[#ccc]" />
            <div className="flex flex-1 flex-col items-start pl-3">
              <span className="break-words text-sm">{file.name || "File"}</span>
              <div className="flex w-full items-center justify-between text-xs font-bold text-[#42414180]">
                <span>{file.size ? `${Math.round(file.size / 1024)} KB` : ""}</span>
                <span>{format(new Date(message.createdAt), "dd/MM/yyyy")}</span>
              </div>
            </div>
          </a>
        );
      }
    }

    // Legacy support (for backward compatibility)
    if (type === "photo") {
      const fileUrl = message.imageUrl || message.fileUrl;
      if (!fileUrl) return null;

      return (
        <button className="h-[72px] w-full overflow-hidden hover:opacity-80" onClick={() => handleImageClick(fileUrl)}>
          {isImageFile(fileUrl) && (
            <img src={fileUrl} alt="image" className="h-full w-full rounded-[3px] object-cover" />
          )}
          {isVideoFile(fileUrl) && (
            <video className="h-full w-full rounded-[3px] object-cover">
              <source src={fileUrl} type="video/mp4" />
              Your browser does not support video.
            </video>
          )}
        </button>
      );
    } else if (type === "file") {
      if (!message.fileUrl) return null;

      return (
        <a
          href={message.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-16 items-center justify-center px-4 hover:bg-[#f1f2f4]"
        >
          <FontAwesomeIcon icon={faFilePen} width={20} className="text-[#ccc]" />
          <div className="flex flex-1 flex-col items-start pl-3">
            <span className="break-words text-sm">{message.fileName || "File"}</span>
            <div className="flex w-full items-center justify-between text-xs font-bold text-[#42414180]">
              <span>{format(new Date(message.createdAt), "dd/MM/yyyy")}</span>
            </div>
          </div>
        </a>
      );
    } else if (type === "link") {
      if (!message.text) return null;

      return (
        <a
          href={message.text}
          target="_blank"
          rel="noreferrer"
          className="flex h-16 items-center justify-center px-4 hover:bg-[#f1f2f4]"
        >
          <FontAwesomeIcon icon={faLink} width={20} className="text-[#ccc]" />
          <div className="flex flex-1 flex-col items-start pl-3">
            <span className="w-[270px] truncate text-sm">{message.text}</span>
            <div className="flex w-full items-center justify-between text-xs font-bold text-[#42414180]">
              <span className="max-w-[220px] truncate font-medium text-blue-500">
                {message.text.replace(/^https?:\/\//, "")}
              </span>
              <span>{format(new Date(message.createdAt), "dd/MM/yyyy")}</span>
            </div>
          </div>
        </a>
      );
    }
    return null;
  };

  return renderMediaContent();
};

MediaItem.propTypes = {
  message: PropTypes.object.isRequired,
  type: PropTypes.string.isRequired,
};

// Modernize the getAllMediaItems function to prioritize files array
const getAllMediaItems = (messages, type) => {
  const allItems = [];

  messages.forEach((message) => {
    // Handle links separately
    if (type === "link") {
      if (isLinkText(message.text)) {
        allItems.push(message);
      }
      return;
    }

    // Use files array as primary source
    if (message.files && Array.isArray(message.files) && message.files.length > 0) {
      if (type === "photo") {
        const mediaFiles = message.files.filter(
          (file) => file.type?.startsWith("image/") || file.type?.startsWith("video/"),
        );

        mediaFiles.forEach((file) => {
          allItems.push({
            _id: `${message._id}-${file.url}`,
            files: [file],
            createdAt: message.createdAt,
          });
        });
      } else if (type === "file") {
        const docFiles = message.files.filter(
          (file) => !file.type?.startsWith("image/") && !file.type?.startsWith("video/"),
        );

        docFiles.forEach((file) => {
          allItems.push({
            _id: `${message._id}-${file.url}`,
            files: [file],
            createdAt: message.createdAt,
          });
        });
      }
    } else {
      if (type === "photo") {
        const url = message.imageUrl || message.fileUrl;
        const isMediaFile = url && (isImageFile(url) || isVideoFile(url));

        if (isMediaFile) {
          // Convert to files array format
          allItems.push({
            _id: message._id,
            files: [
              {
                url: url,
                type: isImageFile(url) ? "image/jpeg" : "video/mp4",
                name: "Media",
              },
            ],
            createdAt: message.createdAt,
          });
        }
      } else if (type === "file") {
        if (message.fileUrl && !isImageFile(message.fileUrl) && !isVideoFile(message.fileUrl)) {
          // Convert to files array format
          allItems.push({
            _id: message._id,
            files: [
              {
                url: message.fileUrl,
                type: "application/octet-stream",
                name: message.fileName || "File",
              },
            ],
            createdAt: message.createdAt,
          });
        }
      }
    }
  });

  return allItems;
};

export default function RightSidebar({
  socketConnection,
  params,
  user,
  dataUser,
  photoVideoMessages,
  fileMessages,
  linkMessages,
  handleAddMember,
  showContextMenu,
  setShowContextMenu,
  setConfirmModal,
}) {
  const [activeTab, setActiveTab] = useState("Anh/Video");
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const navigate = useNavigate();

  // Add useEffect to get all conversations for counting pinned ones
  useEffect(() => {
    if (socketConnection) {
      socketConnection.on("conversation", (data) => {
        if (data) {
          setAllUsers(data);
        }
      });

      // Request conversations data on component mount
      socketConnection.emit("sidebar", user?._id);

      return () => {
        socketConnection.off("conversation");
      };
    }
  }, [socketConnection, user?._id]);

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleContextMenuChange = (menu) => {
    setShowContextMenu(menu);
  };

  const handleOpenArchive = (tab) => {
    setShowContextMenu("Kho lưu trữ");
    setActiveTab(tab);
  };

  const handleEditGroupInfo = () => {
    if (dataUser.isGroup && user._id === dataUser.groupAdmin?._id) {
      setShowEditGroupModal(true);
    } else if (dataUser.isGroup) {
      toast.warning("Tính năng này chỉ dành cho admin!", {
        position: "center-center",
      });
    } else {
      commingSoon();
    }
  };

  // Check if a member is a deputy admin
  const isDeputyAdmin = (member) => {
    if (!dataUser.deputyAdmins || !Array.isArray(dataUser.deputyAdmins)) {
      return false;
    }

    const memberId = typeof member._id === "object" ? member._id.toString() : member._id.toString();

    return dataUser.deputyAdmins.some((deputyId) => {
      const deputyIdStr =
        typeof deputyId === "object"
          ? deputyId._id
            ? deputyId._id.toString()
            : deputyId.toString()
          : deputyId.toString();
      return deputyIdStr === memberId;
    });
  };

  // Check if user has admin privileges (either admin or deputy)
  const hasAdminPrivileges = () => {
    if (user._id === dataUser.groupAdmin?._id) return true;
    return isDeputyAdmin({ _id: user._id });
  };

  // Toggle deputy admin status
  const handleToggleDeputyAdmin = (memberId, memberName, isCurrentlyDeputy) => {
    // Only the main admin can promote/demote deputies
    if (user._id !== dataUser.groupAdmin?._id) {
      toast.error("Chỉ quản trị viên chính mới có quyền này");
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: isCurrentlyDeputy ? "Hủy quyền phó nhóm" : "Thêm phó nhóm",
      message: isCurrentlyDeputy
        ? `Bạn có chắc chắn muốn hủy quyền phó nhóm của ${memberName}?`
        : `Bạn có chắc chắn muốn thêm ${memberName} làm phó nhóm?`,
      action: () => {
        socketConnection.emit("toggleDeputyAdmin", {
          groupId: params.userId,
          memberId: memberId,
          isPromoting: !isCurrentlyDeputy,
          adminId: user._id,
        });

        // Add a one-time listener for the response
        socketConnection.once("deputyAdminUpdated", (response) => {
          if (response.success) {
            toast.success(response.message);
            // Request fresh data
            socketConnection.emit("joinRoom", params.userId);
          } else {
            toast.error(response.message || "Có lỗi xảy ra");
          }
        });
      },
    });
  };

  const isMemberMuted = (member, mutedMembers) => {
    if (!mutedMembers || !Array.isArray(mutedMembers) || mutedMembers.length === 0) {
      return false;
    }

    const memberId = typeof member._id === "object" ? member._id.toString() : member._id.toString();

    return mutedMembers.some((mutedId) => {
      const mutedIdStr =
        typeof mutedId === "object" ? (mutedId._id ? mutedId._id.toString() : mutedId.toString()) : mutedId.toString();
      return mutedIdStr === memberId;
    });
  };

  // Add function to count pinned conversations
  const countPinnedConversations = () => {
    return allUsers ? allUsers.filter((chat) => chat.pinned).length : 0;
  };

  const handlePinConversation = () => {
    const isPinned = Array.isArray(dataUser.pinnedBy) && dataUser.pinnedBy.includes(user._id);

    // If trying to pin and already at limit
    if (!isPinned && countPinnedConversations() >= 5) {
      toast.error("Bạn chỉ có thể ghim tối đa 5 cuộc trò chuyện!", {
        position: "top-center",
      });
      return;
    }

    socketConnection.emit("pinConversation", {
      conversationId: dataUser._id,
      pin: !isPinned,
    });

    // Give feedback with toast
    toast.success(!isPinned ? "Đã ghim hội thoại" : "Đã bỏ ghim hội thoại", {
      position: "top-center",
    });
  };

  const processedPhotoVideoMessages = getAllMediaItems(photoVideoMessages, "photo");
  const processedFileMessages = getAllMediaItems(fileMessages, "file");
  const processedLinkMessages = linkMessages.filter((msg) => isLinkText(msg.text));

  const renderTabContent = () => {
    switch (activeTab) {
      case "Anh/Video":
        return (
          <div className="mt-4 grid grid-cols-4 gap-2 px-4">
            {processedPhotoVideoMessages.map((mediaItem, index) => (
              <MediaItem
                key={mediaItem._id || index}
                message={mediaItem}
                type="photo"
                handleImageClick={handleImageClick}
              />
            ))}
          </div>
        );
      case "Files":
        return (
          <div className="flex flex-col">
            {processedFileMessages.map((mediaItem, index) => (
              <MediaItem
                key={mediaItem._id || index}
                message={mediaItem}
                type="file"
                handleImageClick={handleImageClick}
              />
            ))}
          </div>
        );
      case "Link":
        return (
          <div className="flex flex-col">
            {processedLinkMessages.map((message, index) => (
              <MediaItem key={message._id || index} message={message} type="link" handleImageClick={handleImageClick} />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  // if (!isVisible) return null;

  return (
    <div className="custom-scrollbar !max-h-[100vh] w-[344px] overflow-auto border-l border-[#c8c9cc] bg-[#ebecf0]">
      {/* Header */}
      <div className="sticky top-0 z-10 flex h-[68px] items-center justify-center border-b border-[#c8c9cc] bg-white">
        {showContextMenu !== "Thông tin hội thoại" && (
          <button
            className="absolute left-2 flex h-8 w-8 items-center justify-center rounded-full object-cover hover:bg-[#ebe7eb]"
            onClick={() => handleContextMenuChange("Thông tin hội thoại")}
          >
            <FontAwesomeIcon icon={faChevronLeft} width={20} />
          </button>
        )}
        <span className="text-lg font-bold">{showContextMenu}</span>
      </div>

      {/* Show context main */}
      {showContextMenu === "Thông tin hội thoại" && (
        <div className="">
          <div className="flex flex-col items-center bg-white px-4 py-3">
            <button className="my-3">
              <img
                src={dataUser?.profilePic}
                alt={dataUser.name}
                className="h-12 w-12 rounded-full border border-[rgba(0,0,0,0.15)] object-cover"
              />
            </button>
            <div className="flex items-center space-x-1">
              <span className="text-base font-semibold">{dataUser.name}</span>
              <button onClick={handleEditGroupInfo}>
                <FontAwesomeIcon icon={faEdit} width={20} />
              </button>
            </div>
            <div className="mt-3 flex w-full items-center justify-center space-x-2">
              <ActionGroupButton icon={faBell} title="Tăt thông báo" handleOnClick={commingSoon} />
              <ActionGroupButton
                icon={faThumbTack}
                title={
                  Array.isArray(dataUser.pinnedBy) && dataUser.pinnedBy.includes(user._id)
                    ? "Bỏ ghim hội thoại"
                    : "Ghim hội thoại"
                }
                handleOnClick={handlePinConversation}
              />
              {dataUser.isGroup && (
                <>
                  <ActionGroupButton icon={faUsers} title="Thêm thành viên" handleOnClick={handleAddMember} />
                  <ActionGroupButton icon={faGear} title="Quản lý nhóm" handleOnClick={commingSoon} />
                </>
              )}
            </div>
          </div>
          {dataUser.isGroup && (
            <div className="mt-2 flex flex-col items-center bg-white">
              <button className="flex h-12 w-full items-center justify-between px-4">
                <span className="text-base font-semibold">Thành viên nhóm</span>
                <FontAwesomeIcon icon={faCaretDown} width={20} />
              </button>
              <button
                className="flex h-12 w-full items-center justify-start px-4 text-sm hover:bg-[#f1f2f4]"
                onClick={() => handleContextMenuChange("Thành viên")}
              >
                <FontAwesomeIcon icon={faUser} width={20} />
                {dataUser.members?.length || 0} thành viên
              </button>
            </div>
          )}
          {/* Show 8 Photo & Video lastest */}
          <SidebarSection
            title="Ảnh/Video"
            emptyMessage="Chưa có Ảnh/Video nào được chia sẻ"
            onViewAll={handleOpenArchive}
            activeTab="Anh/Video"
          >
            {processedPhotoVideoMessages.slice(0, 8).map((mediaItem, index) => (
              <MediaItem
                key={mediaItem._id || `photo-${index}`}
                message={mediaItem}
                type="photo"
                handleImageClick={handleImageClick}
              />
            ))}
          </SidebarSection>

          {/* Show 3 File lastest */}
          <SidebarSection
            title="File"
            emptyMessage="Chưa có file nào được chia sẻ"
            onViewAll={handleOpenArchive}
            activeTab="Files"
          >
            {processedFileMessages.slice(0, 3).map((mediaItem, index) => (
              <MediaItem
                key={mediaItem._id || `file-${index}`}
                message={mediaItem}
                type="file"
                handleImageClick={handleImageClick}
              />
            ))}
          </SidebarSection>

          {/* Show 3 Link lastest */}
          <SidebarSection
            title="Link"
            emptyMessage="Chưa có link nào được chia sẻ"
            onViewAll={handleOpenArchive}
            activeTab="Link"
          >
            {processedLinkMessages.slice(0, 3).map((message, index) => (
              <MediaItem
                key={message._id || `link-${index}`}
                message={message}
                type="link"
                handleImageClick={handleImageClick}
              />
            ))}
          </SidebarSection>
          <div className="mt-2 flex flex-col items-center bg-white">
            <button
              className="flex h-12 w-full items-center justify-start px-4 text-sm text-red-600 hover:bg-[#f1f2f4]"
              onClick={() => {
                if (dataUser.isGroup && user._id !== dataUser.groupAdmin?._id) {
                  handleLeaveGroup({ socketConnection, setConfirmModal, params, user, dataUser, navigate });
                } else {
                  handleDeleteConversation({ socketConnection, setConfirmModal, params, user, dataUser, navigate });
                }
              }}
            >
              {user._id !== dataUser.groupAdmin?._id && dataUser.isGroup ? (
                <>
                  <FontAwesomeIcon icon={faSignOut} width={20} />
                  Rời nhóm
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faTrash} width={20} />
                  {dataUser.isGroup ? "Xóa nhóm chat" : "Xóa lịch sử trò chuyện"}
                </>
              )}
            </button>
          </div>
        </div>
      )}
      {/* Show context members */}
      {showContextMenu === "Thành viên" && (
        <div className="h-[calc(100vh_-_68px)] w-full overflow-hidden bg-white pt-4">
          <div className="mx-4">
            <button
              className="flex h-8 w-full items-center justify-center gap-x-1 rounded-sm bg-[#ebe7eb] text-sm hover:bg-[#e0dde0]"
              onClick={handleAddMember}
            >
              <FontAwesomeIcon icon={faUsers} width={20} />
              Thêm thành viên
            </button>
          </div>
          <span className="mb-3 mt-4 block px-4 text-sm">Danh sách thành viên ({dataUser.members?.length || 0})</span>
          {dataUser.members?.map((member) => (
            <div key={member._id} className="flex h-16 w-full items-center justify-between px-4 hover:bg-[#ebe7eb]">
              <div className="flex items-center">
                <img src={member.profilePic} alt={member.name} className="h-10 w-10 rounded-full object-cover" />
                <div className="flex flex-col items-start pl-3">
                  {member._id === user._id ? (
                    <span className="text-[15px] text-pink-600">Bạn</span>
                  ) : (
                    <p className="text-[15px]">{member.name}</p>
                  )}
                  {dataUser.groupAdmin?._id === member._id && (
                    <span className="text-xs text-blue-500">Quản trị viên</span>
                  )}
                  {isDeputyAdmin(member) && <span className="text-xs text-green-600">Phó nhóm</span>}
                  {isMemberMuted(member, dataUser.mutedMembers) && (
                    <span className="text-xs text-red-500">Đã tắt quyền nhắn tin</span>
                  )}
                </div>
              </div>

              {/* Action buttons for admins and deputy admins */}
              {hasAdminPrivileges() && member._id !== user._id && (
                <div className="flex space-x-2">
                  {/* Only show mute button to main admin and deputy admins, but prevent action on main admin */}
                  {(member._id !== dataUser.groupAdmin?._id || user._id === dataUser.groupAdmin?._id) && (
                    <button
                      onClick={() =>
                        handleToggleMute({
                          socketConnection,
                          setConfirmModal,
                          params,
                          user,
                          dataUser,
                          memberId: member._id,
                          memberName: member.name,
                          isMuted: isMemberMuted(member, dataUser.mutedMembers),
                        })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                      title={isMemberMuted(member, dataUser.mutedMembers) ? "Bỏ tắt quyền chat" : "Tắt quyền chat"}
                      disabled={member._id === dataUser.groupAdmin?._id} // Can't mute the main admin
                    >
                      <FontAwesomeIcon
                        icon={isMemberMuted(member, dataUser.mutedMembers) ? faCommentSlash : faComment}
                        width={14}
                        className={
                          member._id === dataUser.groupAdmin?._id
                            ? "text-gray-300" // If it's the main admin, show as disabled
                            : isMemberMuted(member, dataUser.mutedMembers)
                              ? "text-gray-500"
                              : "text-green-500"
                        }
                      />
                    </button>
                  )}

                  {/* Deputy admin toggle button (only for main admin) */}
                  {user._id === dataUser.groupAdmin?._id && member._id !== dataUser.groupAdmin?._id && (
                    <button
                      onClick={() => handleToggleDeputyAdmin(member._id, member.name, isDeputyAdmin(member))}
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100"
                      title={isDeputyAdmin(member) ? "Hủy quyền phó nhóm" : "Thêm làm phó nhóm"}
                    >
                      <FontAwesomeIcon
                        icon={isDeputyAdmin(member) ? faUserMinus : faUserPlus}
                        width={14}
                        className={isDeputyAdmin(member) ? "text-red-500" : "text-blue-500"}
                      />
                    </button>
                  )}

                  {/* Remove member button */}
                  {(user._id === dataUser.groupAdmin?._id ||
                    (isDeputyAdmin({ _id: user._id }) && !isDeputyAdmin(member))) && (
                    <button
                      onClick={() =>
                        handleRemoveMember({
                          socketConnection,
                          setConfirmModal,
                          params,
                          user,
                          dataUser,
                          memberId: member._id,
                          memberName: member.name,
                        })
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:bg-red-100"
                      title="Xóa thành viên"
                      disabled={member._id === dataUser.groupAdmin?._id} // Can't remove the main admin
                    >
                      <FontAwesomeIcon
                        icon={faTrash}
                        width={14}
                        className={member._id === dataUser.groupAdmin?._id ? "text-gray-300" : ""}
                      />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Show context stock */}
      {showContextMenu === "Kho lưu trữ" && (
        <div className="h-[calc(100vh_-_68px)] w-full overflow-hidden bg-white">
          <div className="flex w-full items-center justify-between px-4">
            {["Anh/Video", "Files", "Link"].map((tab) => (
              <button
                key={tab}
                className={`flex h-11 flex-1 items-center justify-center gap-x-1 border-b-2 ${
                  activeTab === tab ? "border-[#005ae0] text-[#005ae0]" : ""
                } text-[15px] font-bold`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Render */}
          {renderTabContent()}
        </div>
      )}

      {showImageModal && <ImageViewerModal fileUrl={selectedImage} onClose={() => setShowImageModal(false)} />}

      {showEditGroupModal && (
        <EditGroupModal
          isOpen={showEditGroupModal}
          onClose={() => setShowEditGroupModal(false)}
          group={dataUser}
          user={user}
        />
      )}
    </div>
  );
}

RightSidebar.propTypes = {
  socketConnection: PropTypes.object,
  params: PropTypes.object,
  user: PropTypes.object.isRequired,
  dataUser: PropTypes.object.isRequired,
  photoVideoMessages: PropTypes.array.isRequired,
  fileMessages: PropTypes.array.isRequired,
  linkMessages: PropTypes.array.isRequired,
  handleAddMember: PropTypes.func,
  showContextMenu: PropTypes.string.isRequired,
  setShowContextMenu: PropTypes.func.isRequired,
  setConfirmModal: PropTypes.func,
};
