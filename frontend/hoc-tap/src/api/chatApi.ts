/**
 * Chat API service
 * Handles classroom chat and AI chatbot messages with separate channels.
 */
import axiosClient from './axiosClient';

export interface ChatMessage {
  id: string;
  maLopMon: string;
  sender: string;
  senderName?: string;
  content: string;
  timestamp: string;
  isAI?: boolean;
  channel?: string;
}

export const chatApi = {
  /** Get messages for a classroom filtered by channel */
  getMessages: async (maLopMon: string, channel: string = 'class'): Promise<ChatMessage[]> => {
    const { data } = await axiosClient.get<ChatMessage[]>(`/chat/${maLopMon}`, {
      params: { channel },
    });
    return data;
  },

  getCount: async (maLopMon: string, channel: string = 'class'): Promise<{count: number}> => {
    const { data } = await axiosClient.get<{count: number}>(`/chat/${maLopMon}/count`, {
      params: { channel },
    });
    return data;
  },

  /** Send a message (class channel) */
  sendMessage: async (maLopMon: string, content: string): Promise<ChatMessage> => {
    const { data } = await axiosClient.post<ChatMessage>('/chat/send', {
      ma_lop_mon: maLopMon,
      content,
    });
    return data;
  },

  /** Ask AI chatbot (ai channel) */
  askAI: async (maLopMon: string, question: string): Promise<ChatMessage> => {
    const { data } = await axiosClient.post<ChatMessage>('/chat/ai', {
      ma_lop_mon: maLopMon,
      question,
    });
    return data;
  },
};
