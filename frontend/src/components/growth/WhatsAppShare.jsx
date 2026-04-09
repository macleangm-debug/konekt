import React from "react";
import { MessageCircle, Share2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

/**
 * WhatsApp Share Button - Primary growth driver for Tanzania market
 */
export function WhatsAppShareButton({ 
  message, 
  url, 
  phoneNumber = null, // For direct messaging
  className = "",
  variant = "primary", // primary, outline, icon
  size = "md" // sm, md, lg
}) {
  const handleShare = () => {
    const fullMessage = url ? `${message} ${url}` : message;
    const encodedMessage = encodeURIComponent(fullMessage);
    
    let whatsappUrl;
    if (phoneNumber) {
      // Direct message to specific number
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    } else {
      // General share
      whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    }
    
    window.open(whatsappUrl, '_blank');
  };

  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg"
  };

  const variantClasses = {
    primary: "bg-[#25D366] text-white hover:bg-[#20BA5A]",
    outline: "border-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white",
    icon: "p-2 bg-[#25D366] text-white hover:bg-[#20BA5A] rounded-full"
  };

  if (variant === "icon") {
    return (
      <button 
        onClick={handleShare}
        className={`${variantClasses.icon} transition ${className}`}
        title="Share on WhatsApp"
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button 
      onClick={handleShare}
      className={`flex items-center justify-center gap-2 rounded-xl font-semibold transition ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      <MessageCircle className="w-5 h-5" />
      Share on WhatsApp
    </button>
  );
}

/**
 * Referral Share Card - Complete sharing UI for affiliates
 */
export function ReferralShareCard({ referralCode, referralUrl, commission = "10%" }) {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const shareMessages = {
    whatsapp: `🎉 Get office supplies and promotional materials at amazing prices! Use my code ${referralCode} for a special discount. Order here: ${referralUrl}`,
    general: `Check out this platform for all your business branding needs! Use code ${referralCode} for a discount.`
  };

  return (
    <div className="bg-gradient-to-br from-[#20364D] to-[#2a4563] text-white rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <Share2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-lg">Share & Earn {commission}</h3>
          <p className="text-slate-200 text-sm">Every successful referral earns you commission</p>
        </div>
      </div>

      {/* Referral Code */}
      <div className="bg-white/10 rounded-xl p-4">
        <div className="text-sm text-slate-300 mb-1">Your Referral Code</div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold tracking-wider">{referralCode}</span>
          <button 
            onClick={() => copyToClipboard(referralCode)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
            title="Copy code"
          >
            <Copy className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Referral URL */}
      <div className="bg-white/10 rounded-xl p-4">
        <div className="text-sm text-slate-300 mb-1">Your Referral Link</div>
        <div className="flex items-center gap-2">
          <input 
            type="text" 
            value={referralUrl}
            readOnly
            className="flex-1 bg-transparent border-none text-sm text-white/80 truncate"
          />
          <button 
            onClick={() => copyToClipboard(referralUrl)}
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <Copy className="w-4 h-4" />
          </button>
          <a 
            href={referralUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/10 rounded-lg transition"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Share Buttons */}
      <div className="flex gap-3">
        <WhatsAppShareButton 
          message={shareMessages.whatsapp}
          variant="primary"
          size="md"
          className="flex-1"
        />
        <button 
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: "Join Konekt",
                text: shareMessages.general,
                url: referralUrl
              });
            } else {
              copyToClipboard(referralUrl);
            }
          }}
          className="flex-1 flex items-center justify-center gap-2 bg-white text-[#20364D] px-4 py-3 rounded-xl font-semibold hover:bg-slate-100 transition"
        >
          <Share2 className="w-5 h-5" />
          Share Link
        </button>
      </div>
    </div>
  );
}

/**
 * Quick Share Button - Floating action for easy sharing
 */
export function QuickShareFAB({ referralUrl, referralCode }) {
  const message = `Get amazing deals on promotional materials! Use my code ${referralCode}: ${referralUrl}`;
  
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <WhatsAppShareButton 
        message={message}
        variant="icon"
        className="w-14 h-14 shadow-lg"
      />
    </div>
  );
}

export default WhatsAppShareButton;
