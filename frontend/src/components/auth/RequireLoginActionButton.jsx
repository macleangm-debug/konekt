import React from "react";
import { useNavigate } from "react-router-dom";

export default function RequireLoginActionButton({
  isLoggedIn,
  nextPath,
  children,
  className = "",
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (isLoggedIn) {
      navigate(nextPath);
      return;
    }
    navigate(`/login/customer?next=${encodeURIComponent(nextPath)}`);
  };

  return (
    <button type="button" onClick={handleClick} className={className} data-testid="require-login-btn">
      {children}
    </button>
  );
}
