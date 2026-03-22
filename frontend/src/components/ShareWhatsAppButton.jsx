import React from "react";
import { MessageCircle } from "lucide-react";

export default function ShareWhatsAppButton({ 
  link, 
  message = "Check this out!",
  className = "",
  variant = "default" 
}) {
  const shareOnWhatsApp = () => {
    const text = encodeURIComponent(`${message}\n${link}`);
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const baseClasses = "inline-flex items-center gap-2 font-semibold transition";
  const variants = {
    default: "rounded-xl bg-green-500 text-white px-4 py-2.5 hover:bg-green-600",
    outline: "rounded-xl border-2 border-green-500 text-green-600 px-4 py-2.5 hover:bg-green-50",
    ghost: "text-green-600 hover:text-green-700 hover:underline",
    icon: "w-10 h-10 rounded-full bg-green-500 text-white justify-center hover:bg-green-600",
  };

  return (
    <button
      onClick={shareOnWhatsApp}
      className={`${baseClasses} ${variants[variant]} ${className}`}
      data-testid="share-whatsapp-btn"
    >
      <MessageCircle className={variant === "icon" ? "w-5 h-5" : "w-4 h-4"} />
      {variant !== "icon" && <span>Share on WhatsApp</span>}
    </button>
  );
}
