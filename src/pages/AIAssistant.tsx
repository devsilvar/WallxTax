import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Loader2,
  Plus,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ShieldCheck,
  Bot,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { useBusinessStore } from '@/stores/business.store';
import api from '@/lib/axios';
import toast from 'react-hot-toast';
import NoBusinessPrompt from '@/components/NoBusinessPrompt';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  error?: boolean;
}

interface QuestionCategory {
  title: string;
  icon: typeof TrendingUp;
  badgeClass: string;
  questions: string[];
}

const QUESTION_CATEGORIES: QuestionCategory[] = [
  {
    title: 'Business Health & Profit',
    icon: TrendingUp,
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    questions: [
      'How is my business performing this month?',
      'Is my profit margin healthy compared to target?',
    ],
  },
  {
    title: 'Diagnostics: What is Going Wrong?',
    icon: AlertTriangle,
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    questions: [
      'What is going wrong about my business right now?',
      'Where am I spending or losing the most money?',
    ],
  },
  {
    title: 'Strategic Growth & Improvements',
    icon: Lightbulb,
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    questions: [
      'What can I improve to increase my profits?',
      'Which expenses should I reduce first?',
    ],
  },
  {
    title: 'Tax & Compliance Status',
    icon: ShieldCheck,
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    questions: [
      'What is my tax payable and next FIRS deadline?',
      'How much uncollected revenue is tied up in unpaid invoices?',
    ],
  },
];

const FOLLOW_UP_SUGGESTIONS = [
  'What is going wrong about my business?',
  'What can I improve to increase my profits?',
  'Where am I spending the most money?',
  'What is my tax payable and next FIRS deadline?',
];

// ── Lightweight Markdown Formatter (Zero Dependency, React 19 safe) ──
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-2 text-sm leading-relaxed text-gray-900">
      {lines.map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={index} className="h-1" />;
        }

        // Heading 3: ### Heading
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={index} className="text-sm sm:text-base font-bold text-purple-950 mt-3 mb-1.5 flex items-center gap-1.5 border-b border-purple-100 pb-1">
              {renderFormattedInline(trimmed.replace('### ', ''))}
            </h3>
          );
        }

        // Heading 4: #### Heading
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={index} className="text-xs sm:text-sm font-bold text-gray-900 mt-2 mb-1">
              {renderFormattedInline(trimmed.replace('#### ', ''))}
            </h4>
          );
        }

        // Bullet point: •, -, or *
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const bulletText = trimmed.replace(/^[•\-*]\s+/, '');
          return (
            <div key={index} className="flex items-start gap-2 pl-1 sm:pl-2">
              <span className="text-purple-600 font-bold mt-0.5">•</span>
              <span className="flex-1 text-gray-800">{renderFormattedInline(bulletText)}</span>
            </div>
          );
        }

        // Numbered list: 1. Item
        const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numberedMatch) {
          return (
            <div key={index} className="flex items-start gap-2 pl-1 sm:pl-2">
              <span className="text-purple-600 font-bold shrink-0 mt-0.5">{numberedMatch[1]}.</span>
              <span className="flex-1 text-gray-800">{renderFormattedInline(numberedMatch[2])}</span>
            </div>
          );
        }

        return <p key={index} className="text-gray-800">{renderFormattedInline(trimmed)}</p>;
      })}
    </div>
  );
}

function renderFormattedInline(text: string) {
  // Split on **bold text**
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-gray-950">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

export default function AIAssistant() {
  const biz = useBusinessStore((s) => s.activeBusiness);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history from localStorage
  useEffect(() => {
    if (!biz) return;
    const key = `ai_chat_${biz.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMessages(parsed.slice(-40));
      } catch (e) {
        console.error('Failed to load chat history', e);
      }
    }
  }, [biz?.id]);

  // Save chat history to localStorage
  useEffect(() => {
    if (!biz || messages.length === 0) return;
    const key = `ai_chat_${biz.id}`;
    localStorage.setItem(key, JSON.stringify(messages.slice(-40)));
  }, [messages, biz?.id]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !biz || loading) return;

    const userQuery = text.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userQuery,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Send conversation history for contextual follow-ups
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await api.post(`/businesses/${biz.id}/ai/chat`, {
        message: userQuery,
        history: historyPayload,
      });

      const replyContent =
        response.data.data?.reply ||
        response.data.reply ||
        'I processed your business data, but no response was generated. Please try asking again.';

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyContent,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error?.message ||
        'I encountered an issue connecting to the financial analysis service. Please try again.';

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorMsg,
        timestamp: Date.now(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast.error('Failed to get answer. Please retry.');
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
    if (confirm('Start a fresh conversation? Your past messages will be cleared.')) {
      setMessages([]);
      setInput('');
      if (biz) {
        localStorage.removeItem(`ai_chat_${biz.id}`);
      }
    }
  };

  if (!biz) return <NoBusinessPrompt />;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50/50">
      {/* ── Top Header Bar ────────────────────────────────────────── */}
      <div className="border-b border-gray-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between bg-white shadow-xs sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 text-white shadow-xs">
            <Bot className="h-5 w-5 text-purple-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-gray-900">
                AI Business Financial Copilot
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Live Data
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Personalized for <span className="font-medium text-gray-800">{biz.businessName}</span>
            </p>
          </div>
        </div>

        <button
          onClick={startNewChat}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
          title="Clear current conversation"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Session</span>
        </button>
      </div>

      {/* ── Scrollable Chat Content ───────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {messages.length === 0 ? (
            /* ── Welcome & Categorized Intelligence Prompts ─────────── */
            <div className="flex flex-col items-center justify-center min-h-[55vh] text-center max-w-3xl mx-auto">
              <div className="mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 mx-auto p-3.5 shadow-md text-white mb-3">
                  <Bot className="h-8 w-8 text-purple-200" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  How is your business performing today?
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 max-w-lg mx-auto mt-1.5">
                  I analyze your live sales, deductible expenses, profit margins, and FIRS tax obligations to give you actionable financial diagnostics.
                </p>
              </div>

              {/* 4 Categorized Intelligence Question Decks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full text-left">
                {QUESTION_CATEGORIES.map((cat, idx) => {
                  const Icon = cat.icon;
                  return (
                    <div
                      key={idx}
                      className="bg-white rounded-xl p-4 border border-gray-200 shadow-2xs hover:border-purple-300 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${cat.badgeClass}`}>
                          <Icon className="h-3 w-3" />
                          {cat.title}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {cat.questions.map((q, qIdx) => (
                          <button
                            key={qIdx}
                            onClick={() => sendMessage(q)}
                            className="w-full text-left text-xs font-medium text-gray-700 hover:text-purple-900 hover:bg-purple-50/60 px-2.5 py-2 rounded-lg transition-colors flex items-center justify-between group border border-transparent hover:border-purple-100"
                          >
                            <span>{q}</span>
                            <span className="text-purple-400 group-hover:translate-x-0.5 transition-transform text-[11px]">
                              &rarr;
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ── Conversation Message History ───────────────────────── */
            <div className="space-y-5">
              {messages.map((msg) => (
                <div key={msg.id} className="group">
                  {msg.role === 'user' ? (
                    <div className="flex justify-end gap-3">
                      <div className="max-w-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-xs">
                        <p className="text-xs sm:text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-900 font-bold text-xs">
                        {biz.businessName[0].toUpperCase()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3 items-start">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 text-white shadow-2xs mt-0.5">
                        <Bot className="h-4 w-4 text-purple-200" />
                      </div>
                      <div className="flex-1 max-w-3xl bg-white border border-gray-200/90 rounded-2xl rounded-tl-xs p-4 sm:p-5 shadow-xs">
                        {msg.error ? (
                          <div className="flex items-start gap-2 text-rose-700 text-xs sm:text-sm">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                            <p>{msg.content}</p>
                          </div>
                        ) : (
                          <FormattedMessage content={msg.content} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {loading && (
                <div className="flex gap-3 items-start">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-900 to-indigo-900 text-white shadow-2xs">
                    <Bot className="h-4 w-4 text-purple-200" />
                  </div>
                  <div className="bg-white border border-gray-200/90 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                    <span className="text-xs text-gray-500 font-medium">
                      Analyzing {biz.businessName} finances and computing diagnostics...
                    </span>
                  </div>
                </div>
              )}

              {/* Follow-up Quick Chips */}
              {!loading && messages.length > 0 && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Suggested Next Questions:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {FOLLOW_UP_SUGGESTIONS.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => sendMessage(sug)}
                        className="text-xs text-gray-600 hover:text-purple-900 bg-white hover:bg-purple-50 px-3 py-1.5 rounded-full border border-gray-200 hover:border-purple-200 transition-colors shadow-2xs"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Input Console ──────────────────────────────────── */}
      <div className="border-t border-gray-200/80 bg-white sticky bottom-0 z-10 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end gap-2 bg-white border border-gray-300 rounded-2xl shadow-xs focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-100 transition-all p-1.5">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask anything about your business performance, profit, costs, or tax..."
              disabled={loading}
              rows={1}
              className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent border-0 focus:outline-hidden resize-none max-h-32 disabled:opacity-50 text-gray-900 placeholder:text-gray-400"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-purple-900 hover:bg-purple-950 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Send message"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-purple-200" />
              ) : (
                <Send className="h-4 w-4 text-white" />
              )}
            </button>
          </div>
          <p className="text-[11px] text-gray-400 text-center mt-2">
            Grounded in your business records. Financial diagnostics are advisory; verify statutory filings with your tax consultant.
          </p>
        </div>
      </div>
    </div>
  );
}
