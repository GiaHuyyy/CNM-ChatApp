import { useState } from "react";
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
} from "@fortawesome/free-solid-svg-icons";
import commingSoon from "../helpers/commingSoon";
import { format } from "date-fns";

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
const MediaItem = ({ message, type }) => {
  if (type === "photo") {
    return (
      <button key={message._id} className="h-[72px] overflow-hidden hover:opacity-80">
        {message.imageUrl && <img src={message.imageUrl} alt="image" className="rounded-[3px] object-contain" />}
        {message.fileUrl &&
          (message.fileUrl.endsWith(".mp4") ||
            message.fileUrl.endsWith(".webm") ||
            message.fileUrl.endsWith(".ogg")) && (
            <video controls className="rounded-[3px] object-contain">
              <source src={message.fileUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          )}
      </button>
    );
  } else if (type === "file") {
    return (
      <a
        href={message.fileUrl}
        target="_blank"
        rel="noreferrer"
        key={message._id}
        className="flex h-16 items-center justify-center px-4 hover:bg-[#f1f2f4]"
      >
        <FontAwesomeIcon icon={faFilePen} width={20} className="text-[#ccc]" />

        <div className="flex flex-1 flex-col items-start pl-3">
          <span className="break-words text-sm">{message.fileName}</span>
          <div className="flex w-full items-center justify-between text-xs font-bold text-[#42414180]">
            <span>100.00 KB</span>
            <span>{format(new Date(message.createdAt), "dd/MM/yyyy")}</span>
          </div>
        </div>
      </a>
    );
  } else if (type === "link") {
    return (
      <a
        href={message.text}
        target="_blank"
        rel="noreferrer"
        key={message._id}
        className="flex h-16 items-center justify-center px-4 hover:bg-[#f1f2f4]"
      >
        <FontAwesomeIcon icon={faLink} width={20} className="text-[#ccc]" />

        <div className="flex flex-1 flex-col items-start pl-3">
          <span className="break-words text-sm">{message.text}</span>
          <div className="flex w-full items-center justify-between text-xs font-bold text-[#42414180]">
            <span className="font-medium text-blue-500">{message.text.slice(8)}</span>
            <span>{format(new Date(message.createdAt), "dd/MM/yyyy")}</span>
          </div>
        </div>
      </a>
    );
  }
  return null;
};

MediaItem.propTypes = {
  message: PropTypes.object.isRequired,
  type: PropTypes.string.isRequired,
};

export default function RightSidebar({
  isVisible,
  dataUser,
  user,
  photoVideoMessages,
  fileMessages,
  linkMessages,
  onAddMember,
  onLeaveGroup,
  onDeleteConversation,
  onRemoveMember,
  showContextMenu,
  setShowContextMenu,
}) {
  const [activeTab, setActiveTab] = useState("Anh/Video");

  const handleContextMenuChange = (menu) => {
    setShowContextMenu(menu);
  };

  const handleOpenArchive = (tab) => {
    setShowContextMenu("Kho lưu trữ");
    setActiveTab(tab);
  };

  // Render content for Anh/Video, Files, Links
  const renderTabContent = () => {
    switch (activeTab) {
      case "Anh/Video":
        return (
          <div className="grid grid-cols-4 gap-2 px-4">
            {photoVideoMessages.map((message) => (
              <MediaItem key={message._id} message={message} type="photo" />
            ))}
          </div>
        );
      case "Files":
        return (
          <div className="flex flex-col">
            {fileMessages.map((message) => (
              <MediaItem key={message._id} message={message} type="file" />
            ))}
          </div>
        );
      case "Link":
        return (
          <div className="flex flex-col">
            {linkMessages.map((message) => (
              <MediaItem key={message._id} message={message} type="link" />
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="w-[344px] overflow-auto border-l border-[#c8c9cc] bg-[#ebecf0]">
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
              <button>
                <FontAwesomeIcon icon={faEdit} width={20} />
              </button>
            </div>
            <div className="mt-3 flex w-full items-center justify-between">
              <ActionGroupButton icon={faBell} title="Tăt thông báo" handleOnClick={commingSoon} />
              <ActionGroupButton icon={faThumbTack} title="Ghim hội thoại" handleOnClick={commingSoon} />
              <ActionGroupButton icon={faUsers} title="Thêm thành viên" handleOnClick={onAddMember} />
              <ActionGroupButton icon={faGear} title="Quản lý nhóm" handleOnClick={commingSoon} />
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
            {photoVideoMessages.slice(0, 8).map((message) => (
              <MediaItem key={message._id} message={message} type="photo" />
            ))}
          </SidebarSection>

          {/* Show 3 File lastest */}
          <SidebarSection
            title="File"
            emptyMessage="Chưa có file nào được chia sẻ"
            onViewAll={handleOpenArchive}
            activeTab="Files"
          >
            {fileMessages.slice(0, 3).map((message) => (
              <MediaItem key={message._id} message={message} type="file" />
            ))}
          </SidebarSection>

          {/* Show 3 Link lastest */}
          <SidebarSection
            title="Link"
            emptyMessage="Chưa có link nào được chia sẻ"
            onViewAll={handleOpenArchive}
            activeTab="Link"
          >
            {linkMessages.slice(0, 3).map((message) => (
              <MediaItem key={message._id} message={message} type="link" />
            ))}
          </SidebarSection>
          <div className="mt-2 flex flex-col items-center bg-white">
            <button
              className="flex h-12 w-full items-center justify-start px-4 text-sm text-red-600 hover:bg-[#f1f2f4]"
              onClick={() => {
                if (dataUser.isGroup && user._id !== dataUser.groupAdmin?._id) {
                  onLeaveGroup();
                } else {
                  onDeleteConversation();
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
              onClick={onAddMember}
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
                </div>
              </div>

              {/* Button for admin delete member */}
              {user._id === dataUser.groupAdmin?._id && member._id !== user._id && (
                <button
                  onClick={() => onRemoveMember(member._id, member.name)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-red-500 hover:bg-red-100"
                  title="Xóa thành viên"
                >
                  <FontAwesomeIcon icon={faTrash} width={14} />
                </button>
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
    </div>
  );
}

RightSidebar.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  dataUser: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired,
  photoVideoMessages: PropTypes.array.isRequired,
  fileMessages: PropTypes.array.isRequired,
  linkMessages: PropTypes.array.isRequired,
  onAddMember: PropTypes.func.isRequired,
  onLeaveGroup: PropTypes.func.isRequired,
  onDeleteConversation: PropTypes.func.isRequired,
  onRemoveMember: PropTypes.func.isRequired,
  showContextMenu: PropTypes.string.isRequired,
  setShowContextMenu: PropTypes.func.isRequired,
};
