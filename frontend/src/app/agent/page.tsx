"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, MessageSquare, ChevronRight, Search, FileText, TrendingUp } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useCompany } from "@/context/CompanyContext";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function AgentPage() {
  const { selectedCompany } = useCompany();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId] = useState(() => `session-${Date.now()}`);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSubmit = async (e?: React.FormEvent, customInput?: string) => {
    const textToSend = customInput || input;
    if (e) e.preventDefault();
    if (!textToSend.trim() || isTyping) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: textToSend };
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
          companyName: selectedCompany.name,
          sessionId: sessionId
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

  const suggestedPrompts = [
    { 
      title: "Analyze Overuse Balance", 
      text: "Which customers have the highest overdue balance across all companies?",
      icon: <TrendingUp size={20} style={{ color: 'var(--nav-bg)' }} />
    },
    { 
      title: "Invoice Audit Trail", 
      text: "Give me a summary of the latest logs for invoice 1500054029",
      icon: <FileText size={20} style={{ color: 'var(--nav-bg)' }} />
    },
    { 
      title: "Collection Strategy", 
      text: "Generate a collection strategy for GUILDFORD RUGBY LEAGUE",
      icon: <Sparkles size={20} style={{ color: 'var(--nav-bg)' }} />
    }
  ];

  return (
    <div className="main-content" style={{ maxWidth: '1000px', height: 'calc(100vh - 4rem)', padding: '2rem 1rem' }}>
      
      {messages.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
          <div style={{ background: 'var(--nav-bg)', padding: '1.5rem', borderRadius: '1.5rem', boxShadow: 'var(--shadow-lg)' }}>
            <Sparkles size={48} color="white" />
          </div>
          
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Hi Marc, I'm your Debtor Agent 👋
            </h1>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
                I can help you analyze debtor behavior, track invoice history, and generate collection strategies based on real-time SimPRO data.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', maxWidth: '600px' }}>
            {suggestedPrompts.map((prompt, idx) => (
              <button 
                key={idx}
                onClick={() => handleSubmit(undefined, prompt.text)}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '1rem', 
                    padding: '1.25rem 1.5rem', 
                    background: 'white', 
                    border: '1px solid var(--border)', 
                    borderRadius: '1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: 'var(--shadow-sm)'
                }}
                onMouseOver={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    e.currentTarget.style.borderColor = 'var(--nav-bg)';
                }}
                onMouseOut={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div style={{ background: '#eff6ff', padding: '0.6rem', borderRadius: '0.75rem' }}>
                    {prompt.icon}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: '500', color: 'var(--text-primary)' }}>{prompt.text}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', paddingBottom: '2rem' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                style={{ 
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '1.25rem 1.5rem',
                    borderRadius: '1rem',
                    background: msg.role === 'user' ? 'var(--nav-bg)' : 'white',
                    color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                    boxShadow: 'var(--shadow-sm)',
                    border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                    lineHeight: '1.6'
                }}
              >
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {msg.role === 'assistant' ? <Bot size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '4px' }} /> : <User size={20} color="white" style={{ flexShrink: 0, marginTop: '4px' }} />}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      {msg.role === 'assistant' ? (
                        <div className="prose-chat">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                      )}
                    </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', background: 'white', padding: '1.25rem 1.5rem', borderRadius: '1rem', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* FIXED BOTTOM INPUT */}
      <div style={{ position: 'sticky', bottom: '2rem', width: '100%', maxWidth: '1000px', padding: '0 1rem' }}>
        <form onSubmit={handleSubmit} style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            className="input-field"
            style={{ 
                width: '100%', 
                padding: '1.25rem 4rem 1.25rem 1.5rem', 
                borderRadius: '1.5rem', 
                fontSize: '1.1rem', 
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                border: '1px solid var(--border)',
                background: 'white'
            }}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a customer, invoice, or strategy..."
          />
          <button 
            type="submit" 
            style={{ 
                position: 'absolute', 
                right: '0.75rem', 
                top: '50%', 
                transform: 'translateY(-50%)',
                background: 'var(--nav-bg)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '50%', 
                width: '3rem', 
                height: '3rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
            disabled={isTyping}
          >
            {isTyping ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} />}
          </button>
        </form>
        <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
            Debtor Agent can make mistakes. Please check your responses.
        </p>
      </div>
    </div>
  );
}
