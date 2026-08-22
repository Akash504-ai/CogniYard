import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { aiAPI } from '../services/api';
import {
  Bot,
  Send,
  X,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Truck,
  FileText,
  Building2,
  Layers,
  Clock,
  ArrowUpRight
} from 'lucide-react';

export default function AIAssistantModal() {
  const { isAiOpen, setIsAiOpen, showNotification } = useAuth();
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your CogniYard AI Assistant. Ask me to create Purchase Requisitions, compare suppliers, check PO statuses, track trucks, or inspect invoices.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isAiOpen) return null;

  const quickPrompts = [
    { label: 'Safety Gear PR', text: 'I need 500 safety helmets for our warehouse', icon: Layers },
    { label: 'Find Suppliers', text: 'Find the best supplier for industrial safety gear', icon: Building2 },
    { label: 'Check PO', text: 'What is the status of PO-1001?', icon: FileText },
    { label: 'Track Shipments', text: 'Show delayed shipments and trucks in yard', icon: Truck },
    { label: '3-Way Match', text: 'Show pending invoices and 3-way match status', icon: TrendingUp }
  ];

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg = {
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await aiAPI.chat(text);
      const data = res.data;

      const botMsg = {
        sender: 'bot',
        text: data.reply,
        intent: data.intent,
        tool: data.tool,
        toolResult: data.toolResult,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);

      if (data.toolResult?.success) {
        showNotification(data.toolResult.details || 'AI Action executed on database.', 'success');
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Sorry, I encountered an issue processing that request. Please try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-md z-50 flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-zinc-50 dark:bg-zinc-950 border-l border-zinc-200/80 dark:border-zinc-800 flex flex-col h-full shadow-2xl transition-all duration-300">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 p-[1px] shadow-sm">
                <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-[11px] flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Bot className="w-4 h-4" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">
                  CogniYard Assistant
                </h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60 font-mono tracking-wide">
                  GROK-4
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Autonomous Yard & Procurement Ops</p>
            </div>
          </div>

          <button
            onClick={() => setIsAiOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
            aria-label="Close Assistant"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 p-5 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] text-[13px] leading-relaxed transition-all shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 rounded-2xl rounded-tr-xs px-4 py-3 font-normal'
                    : 'bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 border border-zinc-200/70 dark:border-zinc-800/80 rounded-2xl rounded-tl-xs px-4 py-3.5'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Structured Tool Action Cards */}
                {msg.toolResult && msg.toolResult.success && (
                  <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2.5">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Action Confirmed: {msg.toolResult.action}</span>
                    </div>

                    {/* Reference Badges */}
                    <div className="flex flex-wrap gap-2">
                      {msg.toolResult.prNumber && (
                        <div className="bg-zinc-50 dark:bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                          PR Ref: <span className="font-bold text-zinc-900 dark:text-zinc-100">{msg.toolResult.prNumber}</span>
                        </div>
                      )}
                      {msg.toolResult.poNumber && (
                        <div className="bg-zinc-50 dark:bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-200 dark:border-zinc-800 font-mono text-[11px] text-zinc-600 dark:text-zinc-400">
                          PO Ref: <span className="font-bold text-zinc-900 dark:text-zinc-100">{msg.toolResult.poNumber}</span>
                        </div>
                      )}
                    </div>

                    {/* Suppliers Data */}
                    {msg.toolResult.suppliers && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">
                          Recommended Vendors
                        </span>
                        <div className="space-y-1">
                          {msg.toolResult.suppliers.map((sup, i) => (
                            <div
                              key={i}
                              className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/70 p-2 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60 text-[11px]"
                            >
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{sup.name}</span>
                              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-mono text-[10px]">
                                <span>★ {sup.rating}</span>
                                <span>•</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-medium">OTD: {sup.otdScore}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delay Warnings */}
                    {msg.toolResult.trucks && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500">
                          Delayed Inbound Shipments
                        </span>
                        <div className="space-y-1">
                          {msg.toolResult.trucks.map((trk, i) => (
                            <div
                              key={i}
                              className="flex justify-between items-center bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/60 dark:border-amber-900/40 text-[11px]"
                            >
                              <div className="font-mono text-zinc-800 dark:text-zinc-200">
                                <strong>{trk.truckId}</strong> <span className="text-zinc-400">({trk.poNumber})</span>
                              </div>
                              <span className="text-amber-700 dark:text-amber-400 font-semibold text-[10px] bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded">
                                ETA {trk.eta}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 px-1 mt-1 font-mono">
                <Clock className="w-2.5 h-2.5" />
                <span>{msg.timestamp}</span>
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 p-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl rounded-tl-xs max-w-[80%] shadow-sm">
              <Sparkles className="w-4 h-4 text-indigo-500 animate-spin" />
              <span className="font-medium tracking-tight">Processing pipeline instructions...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-3 border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/50 dark:bg-zinc-900/30">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
            {quickPrompts.map((prompt, idx) => {
              const Icon = prompt.icon;
              return (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt.text)}
                  className="group flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800/80 hover:border-zinc-400 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-2xs whitespace-nowrap transition-all cursor-pointer"
                >
                  <Icon className="w-3 h-3 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                  <span>{prompt.label}</span>
                  <ArrowUpRight className="w-2.5 h-2.5 text-zinc-400 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Input Area */}
        <div className="p-4 border-t border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Grok to run procurement operations..."
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-4 pr-11 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 dark:focus:ring-indigo-400 dark:focus:border-indigo-400 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-1.5 p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
          <div className="mt-2 text-center">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-600">
              CogniYard Engine • Type commands or select prompts above
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}