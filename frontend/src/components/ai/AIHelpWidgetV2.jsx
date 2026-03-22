import React, { useState } from "react";
import api from "../../lib/api";

export default function AIHelpWidgetV2({ context = {} }) {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  const send = async () => {
    const res = await api.post("/api/ai-assistant-v2/chat", { message, context });
    setReply(res.data.reply);
  };

  return (
    <div className="fixed bottom-4 right-4 w-[340px] rounded-2xl border bg-white shadow-lg p-4 z-50">
      <div className="font-bold text-[#20364D]">Konekt Assistant</div>
      <div className="text-sm text-slate-500 mt-1">24/7 help for ordering, payments, and progress.</div>
      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="w-full border rounded-xl px-3 py-2 mt-3"
        placeholder="Ask about ordering or progress..."
      />
      <button onClick={send} className="mt-3 rounded-xl bg-[#20364D] text-white px-4 py-2 font-semibold">
        Send
      </button>
      {reply ? <div className="mt-3 text-sm text-slate-700 leading-6">{reply}</div> : null}
    </div>
  );
}
