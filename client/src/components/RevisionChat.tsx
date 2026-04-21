import { useState, useRef, useEffect } from 'react';
import { api, RevisionMessage } from '../lib/api';
import {
  MessageSquare, Send, Bot, User, Loader2,
  Sparkles, ChevronUp, ChevronDown,
} from 'lucide-react';

interface RevisionChatProps {
  leadId: string;
  solutionType: 'AI_AGENT' | 'WEBSITE' | null;
  isCompleted: boolean;
  onRevisionApplied: () => void;
  defaultExpanded?: boolean;
}

export default function RevisionChat({ leadId, solutionType, isCompleted, onRevisionApplied, defaultExpanded = false }: RevisionChatProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [messages, setMessages] = useState<RevisionMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTarget, setActiveTarget] = useState<string>(
    solutionType === 'AI_AGENT' ? 'AI_AGENT_SPEC' : 'WEBSITE_PROPOSAL'
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const targets = [
    ...(solutionType === 'AI_AGENT'
      ? [{ key: 'AI_AGENT_SPEC', label: 'AI Agent' }]
      : [{ key: 'WEBSITE_PROPOSAL', label: 'Website' }]),
    { key: 'OUTREACH', label: 'Outreach' },
  ];

  useEffect(() => {
    if (expanded && isCompleted) {
      loadHistory();
    }
  }, [expanded, activeTarget]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (expanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [expanded]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { messages: history } = await api.getChatHistory(leadId, activeTarget);
      setMessages(history);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    // Optimistically add user message
    const tempMsg: RevisionMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      target: activeTarget,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setInput('');
    setSending(true);

    try {
      const { reply, updated } = await api.sendChatMessage(leadId, text, activeTarget);

      // Add assistant reply
      const assistantMsg: RevisionMessage = {
        id: `resp-${Date.now()}`,
        role: 'assistant',
        content: reply,
        target: activeTarget,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // If solution was updated, refresh parent data
      if (updated) {
        onRevisionApplied();
      }
    } catch (err: any) {
      const errorMsg: RevisionMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, something went wrong: ${err.message || 'Unknown error'}. Please try again.`,
        target: activeTarget,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isCompleted) return null;

  const suggestions = solutionType === 'AI_AGENT'
    ? [
        'Make the agent more conversational and friendly',
        'Add a booking/scheduling capability',
        'Focus more on lead qualification',
        'Change the agent name and tone',
      ]
    : [
        'Make the design more modern and minimal',
        'Add an online booking section',
        'Improve the SEO strategy',
        'Add more conversion elements',
      ];

  return (
    <div className="glass-card overflow-hidden">
      {/* Collapsible Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white flex items-center gap-2">
              Revise Solution
              <Sparkles className="w-3.5 h-3.5 text-indigo-400/60" />
            </p>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">
              Chat with AI to refine the design, features, or outreach email
            </p>
          </div>
        </div>
        <div className="p-1.5 rounded-lg text-[var(--color-text-muted)]">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded Chat Area */}
      {expanded && (
        <div className="border-t border-[var(--color-border)] animate-fade-in">
          {/* Target Selector */}
          <div className="flex gap-1 px-4 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-surface-overlay)]">
            <span className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider font-medium self-center mr-2">Revising:</span>
            {targets.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTarget(t.key)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  activeTarget === t.key
                    ? 'bg-indigo-500/15 text-indigo-400'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-white/[0.03]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: '380px' }}>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <p className="text-xs text-[var(--color-text-secondary)] mb-1">What would you like to change?</p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Describe any changes to the {activeTarget === 'AI_AGENT_SPEC' ? 'AI agent spec' : activeTarget === 'WEBSITE_PROPOSAL' ? 'website proposal' : 'outreach email'} and I'll update it instantly
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(s); inputRef.current?.focus(); }}
                      className="text-left px-3 py-2.5 rounded-xl bg-[var(--color-surface-overlay)] border border-[var(--color-border)] text-[11px] text-[var(--color-text-secondary)] hover:text-white hover:bg-white/[0.04] hover:border-indigo-500/30 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                      msg.role === 'user'
                        ? 'bg-indigo-500/20'
                        : 'bg-emerald-500/20'
                    }`}>
                      {msg.role === 'user'
                        ? <User className="w-3.5 h-3.5 text-indigo-400" />
                        : <Bot className="w-3.5 h-3.5 text-emerald-400" />
                      }
                    </div>
                    <div className={`max-w-[75%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600/80 text-white rounded-br-sm'
                        : 'bg-[var(--color-surface-overlay)] border border-[var(--color-border)] text-[var(--color-text-secondary)] rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex gap-2.5">
                    <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-emerald-500/20">
                      <Bot className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="px-3.5 py-2.5 rounded-xl rounded-bl-sm bg-[var(--color-surface-overlay)] border border-[var(--color-border)]">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3 h-3 text-indigo-400 animate-spin" />
                        <span className="text-[11px] text-[var(--color-text-muted)]">Revising solution...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[var(--color-border)] px-4 py-3 bg-[var(--color-surface-overlay)]">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe what to change..."
                rows={1}
                className="flex-1 resize-none bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                style={{ maxHeight: '80px' }}
                onInput={(e) => {
                  const t = e.target as HTMLTextAreaElement;
                  t.style.height = 'auto';
                  t.style.height = Math.min(t.scrollHeight, 80) + 'px';
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="shrink-0 p-2.5 rounded-xl gradient-primary text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/20 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-[var(--color-text-muted)] mt-1.5 px-0.5">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
