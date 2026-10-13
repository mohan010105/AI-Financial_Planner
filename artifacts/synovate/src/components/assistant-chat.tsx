import { useState, useRef, useEffect, type FormEvent } from 'react';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronDown,
  Info,
  MessageSquare,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react';
import {
  useAskAssistantChat,
  type ChatMessage,
} from '@workspace/api-client-react';

const suggestedQuestions = [
  'Explain my spending this month.',
  'Why did my savings change?',
  'Can I reach my financial goal?',
  'What if I save ₹3,000 more?',
  'Where could I reduce expenses?',
];

export interface AssistantChatProps {
  initialMessage?: string;
  embedded?: boolean;
}

export function AssistantChat({ initialMessage, embedded = false }: AssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const defaultGreeting: ChatMessage = {
    role: 'assistant',
    content:
      initialMessage ??
      "Hello! I'm your SYNOVATE AI Financial Assistant. I analyze your verified account data to explain your spending trends, goal timelines, and what-if simulation results.\n\nHow can I help you today?",
  };

  const [messages, setMessages] = useState<ChatMessage[]>([defaultGreeting]);
  const [inputValue, setInputValue] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatMutation = useAskAssistantChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen || embedded) {
      scrollToBottom();
    }
  }, [messages, isOpen, embedded]);

  const handleSend = (userText: string) => {
    const text = userText.trim();
    if (!text || chatMutation.isPending) return;

    setLastFailedMessage(null);
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInputValue('');

    chatMutation.mutate(
      {
        data: {
          message: text,
          history: newMessages.slice(-6),
        },
      },
      {
        onSuccess: (data) => {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: data.reply,
            },
          ]);
        },
        onError: (err: any) => {
          setLastFailedMessage(text);
          const isUpgrade =
            err?.code === 'UPGRADE_REQUIRED' ||
            (err?.message && err.message.toLowerCase().includes('premium')) ||
            err?.status === 403;
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: isUpgrade
                ? `👑 **SYNOVATE AI Planning Copilot requires a Premium subscription.**\n\nUpgrade your account to unlock unlimited interactive financial explanations and decision intelligence.\n\n👉 [**View Pricing & Upgrade Plans**](/pricing)`
                : `⚠️ Could not generate verified explanation: ${err.message || 'Server connection error.'}. Please try again.`,
            },
          ]);
        },
      },
    );
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    handleSend(inputValue);
  };

  const handleResetConversation = () => {
    setMessages([defaultGreeting]);
    setInputValue('');
    setLastFailedMessage(null);
  };

  const renderMessageContent = (content: string) => {
    // Simple clean markdown-friendly renderer for assistant responses
    const paragraphs = content.split('\n\n');
    return (
      <div className="space-y-2">
        {paragraphs.map((p, pIdx) => {
          if (p.startsWith('### ')) {
            return (
              <h4 key={pIdx} className="font-bold text-slate-900 dark:text-slate-100 text-xs border-b border-slate-200 dark:border-slate-700/60 pb-1 mt-1">
                {p.replace('### ', '')}
              </h4>
            );
          }
          if (p.startsWith('- ') || p.includes('\n- ')) {
            const items = p.split('\n- ');
            return (
              <ul key={pIdx} className="space-y-1 list-disc list-inside">
                {items.map((item, iIdx) => {
                  const cleaned = item.replace(/^- /, '');
                  return (
                    <li key={iIdx} className="leading-relaxed">
                      {renderBoldText(cleaned)}
                    </li>
                  );
                })}
              </ul>
            );
          }
          return (
            <p key={pIdx} className="leading-relaxed whitespace-pre-line">
              {renderBoldText(p)}
            </p>
          );
        })}
      </div>
    );
  };

  const renderBoldText = (text: string) => {
    // Splits **text** into strong elements
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-semibold text-slate-900 dark:text-slate-100">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const contentUI = (
    <div className={`flex flex-col ${embedded ? 'h-[680px]' : 'h-[520px]'}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
            <Sparkles size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              SYNOVATE Assistant
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 font-mono font-medium">
                Verified Engine
              </span>
            </h3>
            <p className="text-[10px] text-slate-500">Explains deterministic financial data</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={handleResetConversation}
            title="Reset conversation"
          >
            <RotateCcw size={15} />
          </button>
          {!embedded && (
            <button
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={() => setIsOpen(false)}
              aria-label="Close Assistant"
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>

      {/* Verified Data Banner */}
      <div className="px-4 py-2 bg-emerald-50/70 border-b border-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300 text-[11px] flex items-center justify-between shrink-0">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-emerald-600" />
          Backed by calculated account metrics
        </span>
        <span className="font-mono text-[9px] opacity-75">NO FABRICATED DATA</span>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} />
              </div>
            )}

            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-teal-700 text-white rounded-br-none'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 rounded-bl-none'
              }`}
            >
              {msg.role === 'assistant' ? renderMessageContent(msg.content) : msg.content}
            </div>

            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5">
                <User size={14} />
              </div>
            )}
          </div>
        ))}

        {chatMutation.isPending && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
              <Bot size={14} />
            </div>
            <div className="p-3.5 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw size={14} className="animate-spin text-teal-600" />
              Retrieving verified metrics & generating explanation...
            </div>
          </div>
        )}

        {lastFailedMessage && !chatMutation.isPending && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <AlertCircle size={14} />
              Failed to receive explanation.
            </span>
            <button
              onClick={() => handleSend(lastFailedMessage)}
              className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-semibold hover:bg-rose-700"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Pills */}
      <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 shrink-0 overflow-x-auto whitespace-nowrap scrollbar-none">
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-slate-400 shrink-0 font-medium flex items-center gap-1">
            <Zap size={12} className="text-amber-500" /> Ask:
          </span>
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 transition-colors text-[11px]"
              onClick={() => handleSend(q)}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Form Input */}
      <form
        onSubmit={handleFormSubmit}
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          className="field-input flex-1 text-xs"
          placeholder="Ask about spending, goals, or what-if projections..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={chatMutation.isPending}
        />
        <button
          type="submit"
          className="btn btn-primary btn-sm h-10 px-3"
          disabled={!inputValue.trim() || chatMutation.isPending}
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );

  if (embedded) {
    return <div className="surface-card overflow-hidden">{contentUI}</div>;
  }

  return (
    <>
      {/* Floating Trigger Button */}
      <button
        className="fixed bottom-6 right-6 z-50 p-3.5 rounded-full bg-teal-700 text-white shadow-lg hover:bg-teal-800 transition-transform active:scale-95 flex items-center gap-2 font-semibold text-xs"
        data-testid="button-floating-assistant"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <Sparkles size={18} />
        <span>Ask SYNOVATE AI</span>
      </button>

      {/* Floating Dialog Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 z-50 w-[410px] max-w-[calc(100vw-32px)] surface-card shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-5 duration-200">
          {contentUI}
        </div>
      )}
    </>
  );
}
