import { useState, useRef, useEffect } from "react";
import PropTypes from "prop-types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark, faImage, faCheck } from "@fortawesome/free-solid-svg-icons";
import { toast } from "sonner";
import uploadFileToCloud from "../helpers/uploadFileToClound";
import { useGlobalContext } from "../context/GlobalProvider";

export default function EditGroupModal({ isOpen, onClose, group, user }) {
  const { socketConnection } = useGlobalContext();
  const [groupName, setGroupName] = useState(group?.name || "");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  const modalRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // When group data changes or modal opens, update the form
    setGroupName(group?.name || "");
    // Use the actual group profile pic if available, otherwise use UI Avatars
    setPreviewImage(
      group?.profilePic ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(group?.name || "Group")}&background=random`,
    );
    setSelectedImage(null);
  }, [group, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith("image/")) {
      toast.error("Vui lòng chọn tệp hình ảnh");
      return;
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Kích thước ảnh không được vượt quá 5MB");
      return;
    }

    setSelectedImage(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!groupName.trim()) {
      toast.error("Vui lòng nhập tên nhóm");
      return;
    }

    // Check if anything changed
    if (groupName === group.name && !selectedImage) {
      onClose();
      return;
    }

    // Check if user is admin
    if (user._id !== group.groupAdmin?._id) {
      toast.error("Chỉ quản trị viên mới có thể chỉnh sửa thông tin nhóm");
      return;
    }

    setIsLoading(true);

    try {
      let profilePicUrl = group?.profilePic || "";

      // Upload image if selected
      if (selectedImage) {
        console.log("Uploading new profile picture...");
        const uploadResponse = await uploadFileToCloud(selectedImage);
        if (uploadResponse?.secure_url) {
          profilePicUrl = uploadResponse.secure_url;
          console.log("New profile picture URL:", profilePicUrl);
        } else {
          throw new Error("Failed to upload image");
        }
      }

      // Emit socket event to update group
      socketConnection.emit("updateGroupDetails", {
        groupId: group._id,
        adminId: user._id,
        name: groupName,
        profilePic: profilePicUrl,
      });

      // Listen for response
      socketConnection.once("groupDetailsUpdated", (response) => {
        if (response.success) {
          toast.success(response.message);
          onClose();
        } else {
          toast.error(response.message);
        }
        setIsLoading(false);
      });
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Có lỗi xảy ra khi cập nhật thông tin nhóm");
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div ref={modalRef} className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium">Chỉnh sửa thông tin nhóm</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <FontAwesomeIcon icon={faXmark} width={18} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Group image */}
          <div className="flex flex-col items-center">
            <div className="group relative mb-2 h-24 w-24 cursor-pointer overflow-hidden rounded-full border border-gray-300">
              <img
                src={previewImage}
                alt="Group"
                className="h-full w-full object-cover"
                onError={(e) => {
                  // If image fails to load, use a fallback
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(groupName || "Group")}&background=random`;
                }}
              />
              <div
                className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-50 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => fileInputRef.current?.click()}
              >
                <FontAwesomeIcon icon={faImage} className="text-2xl text-white" />
                <span className="mt-1 text-xs text-white">Thay đổi</span>
              </div>
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect} />
            <button
              type="button"
              className="mt-1 text-sm text-blue-500 hover:text-blue-700"
              onClick={() => fileInputRef.current?.click()}
            >
              Thay đổi ảnh nhóm
            </button>
          </div>

          {/* Group name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Tên nhóm</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none"
              placeholder="Nhập tên nhóm"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
                  Đang cập nhật...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faCheck} className="mr-2" />
                  Cập nhật
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

EditGroupModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  group: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired,
};
