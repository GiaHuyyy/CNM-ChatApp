import { faXmark } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import PropTypes from "prop-types";

// Image viewer
export default function ImageViewerModal({ fileUrl, onClose }) {
  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
      onClick={handleBackgroundClick}
    >
      <div className="relative mx-4 flex h-full w-full items-center justify-center">
        <button
          className="absolute right-3 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg"
          onClick={onClose}
        >
          <FontAwesomeIcon icon={faXmark} />
        </button>
        {fileUrl?.endsWith(".mp4") ? (
          <video controls autoPlay className="h-[94vh] rounded object-contain">
            <source src={fileUrl} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <img src={fileUrl} alt="Enlarged view" className="h-[94vh] rounded object-contain" />
        )}
      </div>
    </div>
  );
}

ImageViewerModal.propTypes = {
  fileUrl: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
