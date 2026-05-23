import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { chatApi, type ChatMessage } from '../../api/chatApi';
import { useAuth } from '../contexts/AuthContext';
import {
  HiOutlinePaperAirplane,
  HiOutlineSparkles,
  HiOutlineXMark,
  HiOutlineChevronDown
} from 'react-icons/hi2';
import './AIBubble.css';

interface AIBubbleProps {
  maLopMon: string;
}

export default function AIBubble({ maLopMon }: AIBubbleProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = useCallback(async () => {
    if (!isOpen) return;
    try {
      setLoading(true);
      const data = await chatApi.getMessages(maLopMon, 'ai');
      setMessages(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [maLopMon, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen, fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);

    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      maLopMon,
      sender: user?.username || '',
      senderName: user?.username,
      content,
      timestamp: new Date().toISOString(),
      isAI: false,
      channel: 'ai',
    };

    setMessages((prev) => [...prev, tempMsg]);

    try {
      const aiMsg = await chatApi.askAI(maLopMon, content);
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      toast.error('AI không phản hồi');
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button className="ai-bubble-fab" onClick={() => setIsOpen(true)}>
        <HiOutlineSparkles size={24} />
      </button>
    );
  }

  return (
    <div className="ai-bubble-window animate-slide-up">
      <div className="ai-bubble-header">
        <div className="ai-bubble-title">
          <HiOutlineSparkles />
          <span>AI Trợ giảng</span>
        </div>
        <button className="btn-icon ai-bubble-close" onClick={() => setIsOpen(false)}>
          <HiOutlineChevronDown />
        </button>
      </div>

      <div className="ai-bubble-messages">
        {loading ? (
          <div className="ai-loading">Đang tải lịch sử...</div>
        ) : messages.length === 0 ? (
          <div className="ai-empty">
            <HiOutlineSparkles size={32} style={{ marginBottom: '8px', color: 'var(--primary-300)' }}/>
            <p>Xin chào {user?.username}!</p>
            <span>Hãy hỏi AI Trợ giảng bất cứ điều gì về lớp học này.</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === user?.username;
            return (
              <div key={msg.id} className={`ai-msg ${isMe ? 'ai-msg-me' : 'ai-msg-bot'}`}>
                <div className="ai-msg-content">{msg.content}</div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="ai-bubble-input">
        <input
          ref={inputRef}
          type="text"
          placeholder="Bạn cần hỏi gì?"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending || loading}
        />
        <button onClick={handleSend} disabled={!input.trim() || sending || loading}>
          {sending ? <div className="spinner-small" /> : <HiOutlinePaperAirplane />}
        </button>
      </div>
    </div>
  );
}
