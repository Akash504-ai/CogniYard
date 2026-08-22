import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { aiAPI } from '../services/api';
import { Bot, Send, X, Sparkles, CheckCircle } from 'lucide-react';

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
    'I need 500 safety helmets for our warehouse',
    'Find the best supplier for industrial safety gear',
    'What is the status of PO-1001?',
    'Show delayed shipments and trucks in yard',
    'Show pending invoices and 3-way match status'
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
        text: 'Sorry, I encountered an issue processing that request.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col h-full shadow-2xl transition-colors">
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-900 dark:text-zinc-100">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                CogniYard AI Assistant
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-mono border border-zinc-200 dark:border-zinc-700">
                  Grok
                </span>
              </h3>
              <p className="text-[10px] text-zinc-500">Natural Language Procurement Actions</p>
            </div>
          </div>
          <button
            onClick={() => setIsAiOpen(false)}
            className="p-1 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 font-medium rounded-br-none shadow-sm'
                    : 'bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-bl-none'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>

                {/* Structured Tool Action Cards */}
                {msg.toolResult && msg.toolResult.success && (
                  <div className="mt-2.5 p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] space-y-1.5">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-500">
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Database Action Executed ({msg.toolResult.action})</span>
                    </div>

                    {msg.toolResult.prNumber && (
                      <div className="font-mono">
                        PR Ref: <strong className="text-zinc-900 dark:text-zinc-100">{msg.toolResult.prNumber}</strong>
                      </div>
                    )}

                    {msg.toolResult.poNumber && (
                      <div className="font-mono">
                        PO Ref: <strong className="text-zinc-900 dark:text-zinc-100">{msg.toolResult.poNumber}</strong>
                      </div>
                    )}

                    {msg.toolResult.suppliers && (
                      <div className="space-y-1 mt-1">
                        <div className="font-medium">Recommended Suppliers:</div>
                        {msg.toolResult.suppliers.map((sup, i) => (
                          <div key={i} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded border border-zinc-200 dark:border-zinc-800 text-[10px]">
                            <span className="font-medium text-zinc-900 dark:text-zinc-200">{sup.name}</span>
                            <span className="text-zinc-500 dark:text-zinc-400">Rating: {sup.rating} | OTD: {sup.otdScore}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {msg.toolResult.trucks && (
                      <div className="space-y-1 mt-1">
                        <div className="font-medium text-amber-600 dark:text-amber-500">Delayed Shipments:</div>
                        {msg.toolResult.trucks.map((trk, i) => (
                          <div key={i} className="flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded border border-zinc-200 dark:border-zinc-800 text-[10px]">
                            <span>{trk.truckId} ({trk.poNumber})</span>
                            <span className="text-amber-600 dark:text-amber-500 font-medium">{trk.eta}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1 block">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 p-2.5 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg max-w-[80%] animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
              <span>Grok is parsing request & executing action...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Quick Prompts */}
        <div className="p-2.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 overflow-x-auto whitespace-nowrap space-x-1.5">
          <span className="text-[9px] uppercase font-medium text-zinc-500 block mb-1">Suggested Prompts:</span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(prompt)}
              className="inline-block text-[10px] px-2.5 py-1 rounded-md bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 transition-colors cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Grok AI assistant..."
              className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3 py-2 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 rounded-md bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
