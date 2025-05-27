import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faMagnifyingGlass, faUserShield } from '@fortawesome/free-solid-svg-icons';
import SelectNewAdminModal from './SelectNewAdminModal';
import { toast } from 'sonner';

export default function GroupInfoModal({
  isOpen,
  onClose,
  group,
  currentUser,
  socketConnection,
  onLeaveGroup
}) {
  const [showSelectAdminModal, setShowSelectAdminModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Reset state when modal opens
    if (isOpen) {
      setShowSelectAdminModal(false);
      setIsProcessing(false);
    }
  }, [isOpen]);

  const handleLeaveGroup = () => {
    // Check if the user is the admin
    const isAdmin = currentUser._id === group.groupAdmin?._id;

    if (isAdmin) {
      // If admin, show the select admin modal
      setShowSelectAdminModal(true);
    } else {
      // If not admin, proceed with leaving the group
      if (onLeaveGroup) {
        onLeaveGroup(group._id);
      }
    }
  };

  const handleSelectNewAdmin = (newAdminId, callback) => {
    if (!socketConnection || !newAdminId) {
      toast.error("Không thể chuyển quyền quản trị. Vui lòng thử lại.");
      callback && callback();
      return;
    }

    setIsProcessing(true);

    // Transfer admin and leave group
    socketConnection.emit("transferAdminAndLeave", {
      groupId: group._id,
      currentAdminId: currentUser._id,
      newAdminId: newAdminId,
    });

    // Listen for response
    socketConnection.once("adminTransferred", (response) => {
      setIsProcessing(false);
      
      if (response.success) {
        toast.success(response.message || "Đã chuyển quyền quản trị và rời nhóm thành công");
        setShowSelectAdminModal(false);
        onClose();
        // Additional navigation or state updates can be handled by the parent component
      } else {
        toast.error(response.message || "Không thể chuyển quyền quản trị");
      }
      
      callback && callback();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-[600px] max-h-[80vh] overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h3 className="text-lg font-semibold">Thông tin nhóm</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-gray-100">
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Group info and actions */}
        <div className="p-6">
          {/* Your existing group info UI */}
          
          {/* Leave group button */}
          <div className="mt-8 pt-4 border-t border-gray-200">
            <button
              onClick={handleLeaveGroup}
              disabled={isProcessing}
              className="w-full rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600 disabled:bg-red-300"
            >
              {isProcessing ? "Đang xử lý..." : "Rời nhóm"}
            </button>
          </div>
        </div>
      </div>
      
      {/* Admin selection modal */}
      {showSelectAdminModal && (
        <SelectNewAdminModal
          isOpen={showSelectAdminModal}
          onClose={() => setShowSelectAdminModal(false)}
          members={group.members}
          currentAdmin={currentUser._id}
          onSelectNewAdmin={handleSelectNewAdmin}
        />
      )}
    </div>
  );
}
