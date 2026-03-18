"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, MessageSquare, X, ChevronRight } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function Chatbot() {
  const { selectedCompany } = useCompany();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      role: "assistant",
      content: "Hello! I am your Debtor Assistant. I've already scanned SimPRO for you. How can I assist you with your collections today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isTyping, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMsg.content,
          companyId: selectedCompany.id,
          companyName: selectedCompany.name
        }),
      });

      if (!response.ok) throw new Error("API response error");

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: data.reply },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, I had trouble reaching my brain. Is the local API running?" },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: '50%',
          right: 0,
          transform: 'translateY(-50%)',
          width: '40px',
          height: '140px',
          borderTopLeftRadius: '0.75rem',
          borderBottomLeftRadius: '0.75rem',
          backgroundColor: 'var(--primary)',
          color: 'white',
          boxShadow: '-4px 0 16px rgba(153, 27, 27, 0.2)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: 'none',
          cursor: 'pointer',
          zIndex: 9999,
          gap: '0.75rem',
          transition: 'padding-right 0.2s, background-color 0.2s',
        }}
        onMouseOver={e => (e.currentTarget.style.paddingRight = '10px')}
        onMouseOut={e => (e.currentTarget.style.paddingRight = '0px')}
        title="Open Debtor Assistant"
      >
        <MessageSquare size={20} />
        <span style={{ 
          writingMode: 'vertical-rl', 
          textOrientation: 'mixed', 
          fontWeight: 'bold', 
          fontSize: '0.85rem',
          letterSpacing: '0.05em'
        }}>DEBTOR ASSISTANT</span>
      </button>
    );
  }

  return (
    <div className="panel chat-container animate-slide-in-right" style={{ 
      position: 'fixed',
      top: '4rem', /* Below navbar */
      right: 0,
      width: '400px',
      height: 'calc(100vh - 4rem)',
      margin: 0, 
      zIndex: 9999,
      boxShadow: '-4px 0 20px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '1px solid var(--border)',
      borderTop: 'none',
      borderRight: 'none',
      borderBottom: 'none',
      borderRadius: 0,
    }}>
      <div className="chat-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', background: 'var(--surface)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Bot size={24} style={{ color: 'var(--primary)' }} />
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>Debtor Assistant</h3>
            <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--success)' }}>Online & Connected</p>
          </div>
        </div>
        <button 
          onClick={() => setIsOpen(false)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Close Drawer"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="chat-messages" style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.role}`}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              {msg.role === 'assistant' ? <Bot size={16} color="var(--primary)" style={{marginTop: '4px'}}/> : <User size={16} color="white" style={{marginTop: '4px'}} />}
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="message assistant">
            <div className="typing-indicator">
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
              <div className="typing-dot"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="chat-input-area" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="input-field"
            style={{ borderRadius: '0.5rem', border: '1px solid var(--border)', fontSize: '0.95rem' }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about an invoice..."
          />
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={isTyping}
            style={{ borderRadius: '0.5rem', padding: '0 1rem' }}
          >
            {isTyping ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </form>
    </div>
  );
}
