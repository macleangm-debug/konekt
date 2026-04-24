import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, X, Send, Bot, User, Loader2, UserCheck, Sparkles } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DEFAULT_ACTIONS = [
  { label: "How to order products?", value: "how to order products" },
  { label: "Request a quote", value: "request service quote" },
  { label: "Track my order", value: "track order" },
  { label: "Payment help", value: "payment help" },
];

function getUserRole() {
  try {
    const admin = localStorage.getItem("admin_token") || localStorage.getItem("adminToken");
    if (admin) {
      const payload = JSON.parse(atob(admin.split(".")[1]));
      return payload.role || "admin";
    }
    const token = localStorage.getItem("token");
    if (token) {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.role || "customer";
    }
  } catch { /* ignore */ }
  return "customer";
}

export default function AIChatWidget({ controlled = false, isOpen: externalOpen, onOpenChange, hideTrigger = false }) {
  const location = useLocation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlled ? !!externalOpen : internalOpen;
  const setIsOpen = (next) => {
    const value = typeof next === "function" ? next(isOpen) : next;
    if (controlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };
  const [cartOpen, setCartOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hello! I'm Mr. Konekt, your smart assistant for navigating, selling, and operating on Konekt. How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showHandoffOption, setShowHandoffOption] = useState(false);
  const [handoffRequested, setHandoffRequested] = useState(false);
  const [quickActions, setQuickActions] = useState(DEFAULT_ACTIONS);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handler = (e) => setCartOpen(e.detail?.open ?? false);
    window.addEventListener("konekt-cart-state", handler);
    return () => window.removeEventListener("konekt-cart-state", handler);
  }, []);

  // Load role-specific quick actions
  useEffect(() => {
    const role = getUserRole();
    fetch(`${API_URL}/api/ai-assistant/quick-actions?role=${role}`)
      .then(r => r.json())
      .then(d => { if (d.actions?.length) setQuickActions(d.actions); })
      .catch(() => {});
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const sendMessage = async (text = input) => {
    if (!text.trim()) return;
    const userMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const role = getUserRole();
      const res = await fetch(`${API_URL}/api/ai-assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          page: location.pathname,
          role,
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.reply }]);

      if (messages.length >= 3 && !handoffRequested) {
        setShowHandoffOption(true);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I'm having trouble connecting. Please try again or contact support@konekt.co.tz."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleHandoffRequest = async () => {
    setHandoffRequested(true);
    setShowHandoffOption(false);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/ai-assistant/request-handoff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: messages.map(m => `${m.role}: ${m.content}`).join("\n") }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.message || "I've notified our team. A human advisor will reach out shortly!" }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "I've noted your request. Our team will reach out soon." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Hide on transaction pages, admin, and partner portals
  const txPages = ["/account/invoices", "/account/orders", "/account/quotes", "/customer/invoices", "/customer/orders"];
  const onTxPage = txPages.some(p => location.pathname.startsWith(p));
  if (cartOpen || onTxPage || location.pathname.startsWith("/admin") || location.pathname.startsWith("/partner")) {
    // When controlled, still let parent decide; otherwise hide entirely
    if (!controlled) return null;
  }

  if (!isOpen) {
    if (hideTrigger) return null;
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-[#20364D] text-white shadow-lg hover:bg-[#2a4a66] transition flex items-center justify-center z-50 group"
        data-testid="ai-chat-trigger"
      >
        <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-24 right-6 w-[380px] h-[520px] bg-white rounded-2xl shadow-2xl border flex flex-col z-50"
      data-testid="ai-chat-widget"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b bg-[#20364D] rounded-t-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#D4A843]/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[#D4A843]" />
          </div>
          <div>
            <div className="font-semibold text-white">Mr. Konekt</div>
            <div className="text-xs text-slate-300">Your smart assistant</div>
          </div>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-lg transition">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === "user" ? "bg-[#D4A843]" : "bg-slate-100"
            }`}>
              {msg.role === "user" ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Sparkles className="w-4 h-4 text-[#D4A843]" />
              )}
            </div>
            <div className={`rounded-2xl px-4 py-3 max-w-[75%] text-sm whitespace-pre-line ${
              msg.role === "user" ? "bg-[#20364D] text-white" : "bg-slate-100 text-slate-800"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#D4A843]" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-slate-100">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <div className="text-xs text-slate-500 mb-2">Quick actions:</div>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.value}
                onClick={() => sendMessage(action.value)}
                className="text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-[#D4A843]/10 hover:text-[#20364D] border border-transparent hover:border-[#D4A843]/30 transition"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Human Handoff Option */}
      {showHandoffOption && !handoffRequested && (
        <div className="px-4 pb-2">
          <button
            onClick={handleHandoffRequest}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4A843]/10 hover:bg-[#D4A843]/20 border border-[#D4A843]/30 text-[#20364D] transition"
            data-testid="ai-handoff-button"
          >
            <UserCheck className="w-4 h-4 text-[#D4A843]" />
            <span className="text-sm font-medium">Talk to a sales advisor</span>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Mr. Konekt..."
            className="flex-1 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4A843]/30"
            data-testid="ai-chat-input"
          />
          <button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="w-12 h-12 rounded-xl bg-[#20364D] text-white flex items-center justify-center hover:bg-[#2a4a66] transition disabled:opacity-50"
            data-testid="ai-chat-send"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
