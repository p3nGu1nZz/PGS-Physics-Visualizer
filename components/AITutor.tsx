import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, MessageRole } from '../types';
import { sendMessageToGemini } from '../services/gemini';
import { Send, Terminal, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SUGGESTIONS = [
  "INIT_PROTOCOL: PGS_EXPLAIN",
  "QUERY: WARM_STARTING",
  "QUERY: JACOBIAN_MATRIX",
  "QUERY: BAUMGARTE_STABILIZATION",
];

const AITutor: React.FC = () => {
  const [history, setHistory] = useState<ChatMessage[]>([
    { role: MessageRole.MODEL, text: "NET_RUNNER CONNECTED. READY FOR PHYSICS INQUIRIES." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleSend = async (text: string = input) => {
    if (!text.trim() || loading) return;
    
    const userMsg = { role: MessageRole.USER, text };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const response = await sendMessageToGemini([...history, userMsg], text);
    
    setHistory(prev => [...prev, { role: MessageRole.MODEL, text: response }]);
    setLoading(false);
  };

  return (
    <div className="cp-border flex flex-col h-full bg-[var(--cp-panel)] overflow-hidden relative">
      <div className="absolute top-0 right-0 bg-[var(--cp-cyan)] text-black text-xs px-2 py-0.5 font-bold z-10">
        AI_NET_LINK
      </div>

      <div className="bg-black/50 p-3 border-b border-[var(--cp-cyan)] flex items-center gap-2">
        <Terminal className="text-[var(--cp-yellow)]" size={18} />
        <h3 className="font-bold text-[var(--cp-yellow)] text-sm tracking-widest">TUTOR_DAEMON</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 font-mono text-sm" ref={scrollRef}>
        {history.map((msg, idx) => (
          <div key={idx} className={`flex flex-col ${msg.role === MessageRole.USER ? 'items-end' : 'items-start'}`}>
            <span className={`text-[10px] mb-1 ${msg.role === MessageRole.USER ? 'text-[var(--cp-red)]' : 'text-[var(--cp-cyan)]'}`}>
                {msg.role === MessageRole.USER ? '>> OPERATOR' : '>> DAEMON'}
            </span>
            <div className={`p-2 border-l-2 max-w-[90%] ${
              msg.role === MessageRole.USER 
                ? 'border-[var(--cp-red)] bg-[rgba(255,0,60,0.1)] text-[var(--cp-red)]' 
                : 'border-[var(--cp-cyan)] bg-[rgba(0,240,255,0.05)] text-[var(--cp-cyan)]'
            }`}>
               <ReactMarkdown>{msg.text}</ReactMarkdown>
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-[var(--cp-yellow)] text-xs animate-pulse">
            >> PROCESSING_REQUEST...
          </div>
        )}
      </div>

      <div className="p-3 bg-black border-t border-[var(--cp-cyan)]">
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 no-scrollbar opacity-70 hover:opacity-100 transition-opacity">
            {SUGGESTIONS.map((s, i) => (
                <button 
                    key={i} 
                    onClick={() => handleSend(s)}
                    className="whitespace-nowrap px-2 py-1 border border-gray-600 text-[10px] text-gray-400 hover:text-[var(--cp-yellow)] hover:border-[var(--cp-yellow)] transition-colors"
                >
                    {s}
                </button>
            ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="ENTER COMMAND..."
            className="flex-1 bg-black border border-gray-700 p-2 text-sm text-[var(--cp-cyan)] focus:outline-none focus:border-[var(--cp-yellow)] placeholder-gray-800"
          />
          <button 
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="bg-[var(--cp-cyan)] hover:bg-[var(--cp-yellow)] text-black p-2 transition-colors disabled:opacity-20"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AITutor;
