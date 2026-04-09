import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Sparkles, Loader2, User, Bot } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import axios from 'axios';
import { useBranding } from '../contexts/BrandingContext';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const { brand_name } = useBranding();

  useEffect(() => {
    // Generate or retrieve session ID
    let storedSession = localStorage.getItem('konekt_chat_session');
    if (!storedSession) {
      storedSession = `session-${Date.now()}`;
      localStorage.setItem('konekt_chat_session', storedSession);
    }
    setSessionId(storedSession);
    
    // Load chat history
    if (storedSession) {
      loadHistory(storedSession);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadHistory = async (session) => {
    try {
      const response = await axios.get(`${API_URL}/api/chat/history/${session}`);
      if (response.data.messages?.length > 0) {
        setMessages(response.data.messages);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/chat`, {
        message: input,
        session_id: sessionId
      });
      
      const assistantMessage = {
        role: 'assistant',
        content: response.data.response,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update session ID if returned
      if (response.data.session_id) {
        setSessionId(response.data.session_id);
        localStorage.setItem('konekt_chat_session', response.data.session_id);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "What products do you offer?",
    "Help me choose a printing method",
    "How does bulk pricing work?",
    "What's the order process?"
  ];

  return (
    <div className="chat-widget" style={{ zIndex: 9999 }} data-testid="chat-widget">
      {/* Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="chat-bubble group"
            onClick={() => setIsOpen(true)}
            data-testid="open-chat-btn"
          >
            <MessageCircle className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-[100px] right-6 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-2xl shadow-2xl border-2 border-border flex flex-col overflow-hidden z-[10000]"
            data-testid="chat-window"
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">{brand_name} Assistant</h3>
                  <p className="text-xs text-primary-foreground/70">AI-powered help</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                data-testid="close-chat-btn"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Sparkles className="w-12 h-12 text-primary/30 mx-auto mb-4" />
                  <h4 className="font-bold mb-2">Hi! I'm your {brand_name} Assistant</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    I can help you choose products, printing methods, and guide you through ordering.
                  </p>
                  
                  {/* Quick Prompts */}
                  <div className="space-y-2">
                    {quickPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInput(prompt);
                          setTimeout(() => sendMessage(), 0);
                        }}
                        className="block w-full text-left text-sm p-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors"
                        data-testid={`quick-prompt-${i}`}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex items-start gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                    }`}>
                      {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`p-3 rounded-2xl ${
                      msg.role === 'user' 
                        ? 'bg-primary text-primary-foreground rounded-tr-none' 
                        : 'bg-muted rounded-tl-none'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="flex items-center gap-2 bg-muted p-3 rounded-2xl rounded-tl-none">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask me anything..."
                  disabled={loading}
                  className="flex-1"
                  data-testid="chat-input"
                />
                <Button 
                  type="submit" 
                  disabled={loading || !input.trim()}
                  className="px-4"
                  data-testid="send-chat-btn"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
