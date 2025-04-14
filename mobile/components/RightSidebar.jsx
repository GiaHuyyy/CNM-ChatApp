import { useState } from "react";
import PropTypes from "prop-types";
import { View, Text, Image, TouchableOpacity, ScrollView, Pressable } from "react-native";
import { FontAwesomeIcon } from "@fortawesome/react-native-fontawesome";
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
    <View className="flex flex-col items-center justify-center gap-y-1">
      <TouchableOpacity
        onPress={handleOnClick}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ebe7eb]"
        activeOpacity={0.7}
      >
        <FontAwesomeIcon icon={icon} width={20} />
      </TouchableOpacity>
      <Text className="w-16 text-center text-xs">{title}</Text>
    </View>
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
    <View className="mt-2 flex flex-col items-center bg-white">
      <TouchableOpacity className="flex h-12 w-full items-center justify-between px-4">
        <Text className="text-base font-semibold">{title}</Text>
        <FontAwesomeIcon icon={faCaretDown} width={20} />
      </TouchableOpacity>

      {children.length > 0 ? (
        <View className="w-full">
          {title === "File" || title === "Link" ? (
            <View className="flex flex-col">{children}</View>
          ) : (
            <View className="flex-row flex-wrap px-4">{children}</View>
          )}
          <View className="p-4">
            <TouchableOpacity
              className="flex h-8 w-full items-center justify-center flex-row rounded-sm bg-[#ebe7eb]"
              onPress={() => onViewAll(activeTab)}
              activeOpacity={0.7}
            >
              <Text className="text-sm font-semibold">Xem tất cả</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <Text className="h-10 text-[13px] text-[#888]">{emptyMessage}</Text>
      )}
    </View>
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
      <TouchableOpacity key={message._id} className="h-[72px] overflow-hidden" activeOpacity={0.8}>
        {message.imageUrl && <Image source={{ uri: message.imageUrl }} className="rounded-[3px] h-full w-full" resizeMode="contain" />}
        {message.fileUrl &&
          (message.fileUrl.endsWith(".mp4") ||
            message.fileUrl.endsWith(".webm") ||
            message.fileUrl.endsWith(".ogg")) && (
            // Note: Video handling in React Native requires a different approach
            <View className="rounded-[3px] h-full w-full bg-gray-200 items-center justify-center">
              <Text>Video</Text>
            </View>
          )}
      </TouchableOpacity>
    );
  } else if (type === "file") {
    return (
      <TouchableOpacity
        key={message._id}
        className="flex h-16 items-center justify-center px-4"
        activeOpacity={0.7}
        // For React Native, we'd need to handle file opening differently
        onPress={() => console.log("Open file:", message.fileUrl)}
      >
        <FontAwesomeIcon icon={faFilePen} width={20} className="text-[#ccc]" />

        <View className="flex flex-1 flex-col items-start pl-3">
          <Text className="text-sm" numberOfLines={1}>{message.fileName}</Text>
          <View className="flex w-full flex-row items-center justify-between">
            <Text className="text-xs font-bold text-[#42414180]">100.00 KB</Text>
            <Text className="text-xs font-bold text-[#42414180]">{format(new Date(message.createdAt), "dd/MM/yyyy")}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  } else if (type === "link") {
    return (
      <TouchableOpacity
        key={message._id}
        className="flex h-16 items-center justify-center px-4"
        activeOpacity={0.7}
        // For React Native, we'd need to handle link opening differently
        onPress={() => console.log("Open link:", message.text)}
      >
        <FontAwesomeIcon icon={faLink} width={20} className="text-[#ccc]" />

        <View className="flex flex-1 flex-col items-start pl-3">
          <Text className="text-sm" numberOfLines={1}>{message.text}</Text>
          <View className="flex w-full flex-row items-center justify-between">
            <Text className="font-medium text-blue-500 text-xs" numberOfLines={1}>{message.text.slice(8)}</Text>
            <Text className="text-xs font-bold text-[#42414180]">{format(new Date(message.createdAt), "dd/MM/yyyy")}</Text>
          </View>
        </View>
      </TouchableOpacity>
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
          <View className="flex-row flex-wrap px-4">
            {photoVideoMessages.map((message) => (
              <MediaItem key={message._id} message={message} type="photo" />
            ))}
          </View>
        );
      case "Files":
        return (
          <View className="flex flex-col">
            {fileMessages.map((message) => (
              <MediaItem key={message._id} message={message} type="file" />
            ))}
          </View>
        );
      case "Link":
        return (
          <View className="flex flex-col">
            {linkMessages.map((message) => (
              <MediaItem key={message._id} message={message} type="link" />
            ))}
          </View>
        );
      default:
        return null;
    }
  };

  if (!isVisible) return null;

  return (
    <View className="w-full border-l border-[#c8c9cc] bg-[#ebecf0]">
      {/* Header */}
      <View className="z-10 flex h-[68px] items-center justify-center border-b border-[#c8c9cc] bg-white">
        {showContextMenu !== "Thông tin hội thoại" && (
          <TouchableOpacity
            className="absolute left-2 flex h-8 w-8 items-center justify-center rounded-full"
            onPress={() => handleContextMenuChange("Thông tin hội thoại")}
            activeOpacity={0.7}
          >
            <FontAwesomeIcon icon={faChevronLeft} width={20} />
          </TouchableOpacity>
        )}
        <Text className="text-lg font-bold">{showContextMenu}</Text>
      </View>

      <ScrollView>
        {/* Show context main */}
        {showContextMenu === "Thông tin hội thoại" && (
          <View>
            <View className="flex flex-col items-center bg-white px-4 py-3">
              <TouchableOpacity className="my-3">
                <Image
                  source={{ uri: dataUser?.profilePic }}
                  className="h-12 w-12 rounded-full border border-[rgba(0,0,0,0.15)]"
                />
              </TouchableOpacity>
              <View className="flex flex-row items-center space-x-1">
                <Text className="text-base font-semibold">{dataUser.name}</Text>
                <TouchableOpacity>
                  <FontAwesomeIcon icon={faEdit} width={20} />
                </TouchableOpacity>
              </View>
              <View className="mt-3 flex w-full flex-row items-center justify-between">
                <ActionGroupButton icon={faBell} title="Tăt thông báo" handleOnClick={commingSoon} />
                <ActionGroupButton icon={faThumbTack} title="Ghim hội thoại" handleOnClick={commingSoon} />
                <ActionGroupButton icon={faUsers} title="Thêm thành viên" handleOnClick={onAddMember} />
                <ActionGroupButton icon={faGear} title="Quản lý nhóm" handleOnClick={commingSoon} />
              </View>
            </View>
            {dataUser.isGroup && (
              <View className="mt-2 flex flex-col items-center bg-white">
                <TouchableOpacity className="flex h-12 w-full items-center justify-between px-4">
                  <Text className="text-base font-semibold">Thành viên nhóm</Text>
                  <FontAwesomeIcon icon={faCaretDown} width={20} />
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex h-12 w-full items-center justify-start px-4"
                  onPress={() => handleContextMenuChange("Thành viên")}
                  activeOpacity={0.7}
                >
                  <FontAwesomeIcon icon={faUser} width={20} />
                  <Text className="text-sm ml-2">{dataUser.members?.length || 0} thành viên</Text>
                </TouchableOpacity>
              </View>
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
            <View className="mt-2 flex flex-col items-center bg-white">
              <TouchableOpacity
                className="flex h-12 w-full items-center justify-start px-4"
                onPress={() => {
                  if (dataUser.isGroup && user._id !== dataUser.groupAdmin?._id) {
                    onLeaveGroup();
                  } else {
                    onDeleteConversation();
                  }
                }}
                activeOpacity={0.7}
              >
                {user._id !== dataUser.groupAdmin?._id && dataUser.isGroup ? (
                  <View className="flex-row items-center">
                    <FontAwesomeIcon icon={faSignOut} width={20} color="#EF4444" />
                    <Text className="text-sm text-red-600 ml-2">Rời nhóm</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <FontAwesomeIcon icon={faTrash} width={20} color="#EF4444" />
                    <Text className="text-sm text-red-600 ml-2">
                      {dataUser.isGroup ? "Xóa nhóm chat" : "Xóa lịch sử trò chuyện"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* Show context members */}
        {showContextMenu === "Thành viên" && (
          <View className="w-full bg-white pt-4">
            <View className="mx-4">
              <TouchableOpacity
                className="flex h-8 w-full items-center justify-center flex-row rounded-sm bg-[#ebe7eb]"
                onPress={onAddMember}
                activeOpacity={0.7}
              >
                <FontAwesomeIcon icon={faUsers} width={20} />
                <Text className="text-sm ml-2">Thêm thành viên</Text>
              </TouchableOpacity>
            </View>
            <Text className="mb-3 mt-4 px-4 text-sm">Danh sách thành viên ({dataUser.members?.length || 0})</Text>
            {dataUser.members?.map((member) => (
              <View key={member._id} className="flex h-16 w-full flex-row items-center justify-between px-4">
                <View className="flex flex-row items-center">
                  <Image source={{ uri: member.profilePic }} className="h-10 w-10 rounded-full" />
                  <View className="flex flex-col items-start pl-3">
                    {member._id === user._id ? (
                      <Text className="text-[15px] text-pink-600">Bạn</Text>
                    ) : (
                      <Text className="text-[15px]">{member.name}</Text>
                    )}
                    {dataUser.groupAdmin?._id === member._id && (
                      <Text className="text-xs text-blue-500">Quản trị viên</Text>
                    )}
                  </View>
                </View>

                {/* Button for admin delete member */}
                {user._id === dataUser.groupAdmin?._id && member._id !== user._id && (
                  <TouchableOpacity
                    onPress={() => onRemoveMember(member._id, member.name)}
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    activeOpacity={0.7}
                  >
                    <FontAwesomeIcon icon={faTrash} width={14} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Show context stock */}
        {showContextMenu === "Kho lưu trữ" && (
          <View className="w-full bg-white">
            <View className="flex w-full flex-row items-center justify-between px-4">
              {["Anh/Video", "Files", "Link"].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  className={`flex h-11 flex-1 items-center justify-center border-b-2 ${
                    activeTab === tab ? "border-[#005ae0]" : "border-transparent"
                  }`}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.7}
                >
                  <Text className={`text-[15px] font-bold ${activeTab === tab ? "text-[#005ae0]" : ""}`}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Render */}
            {renderTabContent()}
          </View>
        )}
      </ScrollView>
    </View>
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
