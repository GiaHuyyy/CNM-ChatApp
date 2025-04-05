import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import PropTypes from "prop-types";

export default function Protected({ children }) {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user);

  useEffect(() => {
    // Check if there's a token in localStorage
    const token = localStorage.getItem("token");

    // If no token or no user data, redirect to login
    if (!token || !user._id) {
      navigate("/auth", { replace: true });
    }
  }, [user, navigate]);

  // If there's a user with ID, render the children components
  return user._id ? children : null;
}

Protected.propTypes = {
  children: PropTypes.node.isRequired,
};
