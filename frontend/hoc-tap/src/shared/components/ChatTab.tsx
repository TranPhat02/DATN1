/**
 * ChatTab — Messenger-style chat for classroom
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { chatApi, type ChatMessage } from '../../api/chatApi';
import { useAuth } from '../contexts/AuthContext';
import {
  HiOutlinePaperAirplane,
  HiOutlineChatBubbleLeftRight,
} from 'react-icons/hi2';
import './ChatTab.css';

interface ChatTabProps {
  maLopMon: string;
}

export default function ChatTab({ maLopMon }: ChatTabProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    try {
      const data = await chatApi.getMessages(maLopMon, 'class');
      setMessages(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [maLopMon]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Poll for new messages every 5s
  useEffect(() => {
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    // Optimistic add to correct channel
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      maLopMon,
      sender: user?.username || '',
      senderName: user?.username,
      content,
      timestamp: new Date().toISOString(),
      isAI: false,
      channel: 'class',
    };

    setMessages((prev) => [...prev, tempMsg]);

    try {
      await chatApi.sendMessage(maLopMon, content);
    } catch {
      toast.error('Gửi tin nhắn thất bại');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return <div className="loading-overlay"><div className="spinner" /><span>Đang tải...</span></div>;
  }

  return (
    <div className="chat-container animate-fade-in" style={{ borderTop: '1px solid var(--gray-200)' }}>
      {/* Messages */}
      <div className="chat-messages" style={{ height: 'calc(100vh - 200px)' }}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <HiOutlineChatBubbleLeftRight />
            <p>Chưa có tin nhắn</p>
            <span>Bắt đầu cuộc trò chuyện</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === user?.username;
            return (
              <div key={msg.id} className={`chat-msg ${isMe ? 'chat-msg--me' : ''}`}>
                {!isMe && (
                  <div className="chat-msg-avatar">
                    {msg.senderName?.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div className="chat-msg-content">
                  {!isMe && (
                    <div className="chat-msg-sender">{msg.senderName || msg.sender}</div>
                  )}
                  <div className="chat-msg-bubble">{msg.content}</div>
                  <div className="chat-msg-time">
                    {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <input
          ref={inputRef}
          className="input chat-input"
          placeholder="Nhập tin nhắn với lớp..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
        <button className="btn btn-primary btn-icon" onClick={handleSend} disabled={sending || !input.trim()}>
          {sending ? <div className="spinner" style={{ width: 18, height: 18 }} /> : <HiOutlinePaperAirplane />}
        </button>
      </div>
    </div>
  );
}
