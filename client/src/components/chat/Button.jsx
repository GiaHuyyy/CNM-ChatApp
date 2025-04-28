import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import PropTypes from "prop-types";

export default function Button({ icon, width, title, styleIcon, isUpload, id, handleOnClick, disabled }) {
  return isUpload ? (
    <label
      htmlFor={disabled ? "" : id}
      title={title}
      onClick={disabled ? null : handleOnClick}
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-[3px] ${
        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-[#ebe7eb]"
      }`}
    >
      <FontAwesomeIcon icon={icon} width={width} className={`${styleIcon}`} />
    </label>
  ) : (
    <button
      title={title}
      onClick={disabled ? null : handleOnClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-[3px] ${
        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-[#ebe7eb]"
      }`}
    >
      <FontAwesomeIcon icon={icon} width={width} className={`${styleIcon}`} />
    </button>
  );
}

Button.propTypes = {
  icon: PropTypes.object,
  width: PropTypes.number,
  title: PropTypes.string,
  styleIcon: PropTypes.string,
  isUpload: PropTypes.bool,
  id: PropTypes.string,
  handleOnClick: PropTypes.func,
  disabled: PropTypes.bool,
};
