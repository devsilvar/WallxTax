import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Plus } from 'lucide-react';
import { useBusinessStore } from '@/stores/business.store';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import NoBusinessPrompt from '@/components/NoBusinessPrompt';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  error?: string;
}

const SUGGESTED_QUESTIONS = [
  "How is my business performing this month?",
  "What are my biggest expenses?",
  "When is my next tax due?",
];

export default function AIAssistant() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load messages from localStorage
  useEffect(() => {
    if (!biz) return;
    const key = `ai_chat_${biz.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMessages(parsed.slice(-50));
      } catch (e) {
        console.error('Failed to load chat history', e);
      }
    }
  }, [biz?.id]);

  // Save messages to localStorage
  useEffect(() => {
    if (!biz || messages.length === 0) return;
    const key = `ai_chat_${biz.id}`;
    localStorage.setItem(key, JSON.stringify(messages.slice(-50)));
  }, [messages, biz?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [input]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !biz) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post(`/businesses/${biz.id}/ai/chat`, {
        message: text.trim(),
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: err.response?.data?.error?.message || 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
        error: 'true',
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    sendMessage(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startNewChat = () => {
    if (confirm('Start a new conversation? Current chat will be saved.')) {
      setMessages([]);
      setInput('');
    }
  };

  if (!biz) return <NoBusinessPrompt />;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between bg-white sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 p-2">
            <img src="/logo.png" alt="AI" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
            <p className="text-xs text-gray-500">{biz.businessName}</p>
          </div>
        </div>
        <button
          onClick={startNewChat}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Chat</span>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
              <div className="mb-8">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 mb-4 mx-auto p-4">
                  <img src="/logo.png" alt="AI" className="h-full w-full object-contain" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  How can I help you today?
                </h2>
                <p className="text-gray-500 max-w-md mx-auto">
                  I can help you understand your business finances, taxes, and provide insights based on your data.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 w-full max-w-2xl">
                {SUGGESTED_QUESTIONS.map((question, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(question)}
                    className="px-6 py-4 bg-gray-50 hover:bg-gray-100 text-gray-900 rounded-2xl text-left transition-all border border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  >
                    <span className="text-sm">{question}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className="group">
                  {msg.role === 'user' ? (
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white font-semibold text-sm">
                        {biz.businessName[0].toUpperCase()}
                      </div>
                      <div className="flex-1 pt-1">
                        <div className="inline-block bg-gray-100 px-5 py-3 rounded-3xl">
                          <p className="text-gray-900 whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 p-1.5">
                        <img src="/logo.png" alt="AI" className="h-full w-full object-contain" />
                      </div>
                      <div className="flex-1 pt-1">
                        <p className={`whitespace-pre-wrap ${msg.error ? 'text-red-600' : 'text-gray-900'}`}>
                          {msg.content}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 p-1.5">
                    <img src="/logo.png" alt="AI" className="h-full w-full object-contain" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white sticky bottom-0">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="relative flex items-end gap-2 bg-white border border-gray-300 rounded-full shadow-sm focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              disabled={loading}
              rows={1}
              className="flex-1 px-5 py-3 bg-transparent border-0 focus:outline-none focus:ring-0 resize-none max-h-32 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all mr-1.5 mb-1.5"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-3">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}
