import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
  Clock,
  ShieldAlert,
  Boxes,
  AlertTriangle,
  Activity,
  Mic,
  MicOff,
  RotateCcw,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  ArrowDown
} from 'lucide-react';

export default function AIAssistantModal() {
  const { isAiOpen, setIsAiOpen, showNotification } = useAuth();
  const location = useLocation();

  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('cogniyard_copilot_messages');

    return saved
      ? JSON.parse(saved)
      : [
          {
            sender: 'bot',
            text: "Hello! I'm your CogniYard Copilot. How can I assist with your procurement, yard operations, or invoice audits today?",
            timestamp: new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })
          }
        ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [expandedView, setExpandedView] = useState(false);

  const chatContainerRef = useRef(null);
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Smooth scroll handler
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // 1. Auto-scroll to bottom immediately when the modal opens
  useEffect(() => {
    if (isAiOpen) {
      const timer = setTimeout(() => {
        scrollToBottom();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAiOpen, scrollToBottom]);

  // 2. Auto-scroll on new messages or loading states
  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  // Save messages to local storage
  useEffect(() => {
    localStorage.setItem(
      'cogniyard_copilot_messages',
      JSON.stringify(messages)
    );
  }, [messages]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // Ignore abort errors
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  // Detect if user has scrolled away from the bottom
  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isDistanceFar = scrollHeight - scrollTop - clientHeight > 100;
    setShowScrollBottom(isDistanceFar);
  };

  if (!isAiOpen) return null;

  const getWorkspaceContext = () => {
    const path = location?.pathname || '';
    if (path.startsWith('/logistics') || path.startsWith('/yard-simulation')) {
      return { id: 'logistics', name: 'Logistics & Yard Operations' };
    }
    if (path.startsWith('/finance')) {
      return { id: 'finance', name: 'Financial & AP Audit' };
    }
    if (path.startsWith('/procurement')) {
      return { id: 'procurement', name: 'Procurement Lifecycle' };
    }
    return { id: 'general', name: 'Global Supply Chain' };
  };

  const currentContext = getWorkspaceContext();

  const getQuickPrompts = () => {
    switch (currentContext.id) {
      case 'logistics':
        return [
          { label: 'TRK-1007 Status', text: 'Where is TRK-1007?', icon: Truck },
          { label: 'Delayed Fleet', text: 'Show delayed trucks', icon: AlertTriangle },
          { label: 'Recommend Dock', text: 'Recommend a dock for TRK-1007', icon: Boxes },
        ];
      case 'finance':
        return [
          { label: 'Payment Holds', text: 'Why are payments on hold?', icon: TrendingUp },
          { label: 'Mismatched Invoices', text: 'Show mismatched invoices', icon: AlertTriangle },
          { label: 'Trace Invoice', text: 'Trace INV-8802', icon: Activity },
        ];
      default:
        return [
          { label: 'Executive Brief', text: 'Give me an executive summary', icon: Activity },
          { label: 'Priority Alerts', text: 'What needs my attention right now?', icon: ShieldAlert },
          { label: 'Delayed Fleet', text: 'Show delayed trucks', icon: Truck },
          { label: 'Trace PO-1003', text: 'Trace PO-1003', icon: FileText },
        ];
    }
  };

  const quickPrompts = getQuickPrompts();

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showNotification('Voice input is not supported in this browser.', 'warning');
      return;
    }

    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { }
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) finalTranscript += result[0].transcript;
          else interimText += result[0].transcript;
        }
        const fullText = (finalTranscript + ' ' + interimText).trim();
        if (fullText) setInput(fullText);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      showNotification('Failed to initialize speech input.', 'warning');
    }
  };

  const handleSend = async (textToSend, confirmed = false, pendingParams = null) => {
    const text = textToSend || input;
    if (!text.trim() && !confirmed) return;
    if (loading) return;

    if (!confirmed) {
      setMessages(prev => [...prev, {
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      if (!textToSend) setInput('');
    }

    setLoading(true);

    try {
      const chatHistory = messages.slice(-6).map(m => `${m.sender}: ${m.text}`);
      const res = await aiAPI.chat(text, confirmed, pendingParams, chatHistory);
      const data = res.data;

      setMessages(prev => [...prev, {
        sender: 'bot',
        text: data.reply,
        tool: data.tool,
        actionType: data.actionType,
        toolResult: data.toolResult,
        requiresConfirmation: data.requiresConfirmation,
        params: data.params,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      }]);
    } catch (err) {
      console.error('Copilot frontend error:', err);

      setMessages(prev => [...prev, {
        sender: 'bot',
        text:
          err.response?.data?.message ||
          err.message ||
          'Sorry, I encountered an issue processing that request.',
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit'
        })
      }]);
    } fontinally: {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Custom CSS for Animations */}
      <style>{`
        @keyframes customFadeIn {
          from { opacity: 0; backdrop-filter: blur(0px); }
          to { opacity: 1; backdrop-filter: blur(8px); }
        }
        @keyframes customSlideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes messagePopIn {
          0% { opacity: 0; transform: translateY(12px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .anim-fade-in { animation: customFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-slide-in { animation: customSlideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .anim-message { animation: messagePopIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="fixed inset-0 bg-slate-900/40 z-50 flex justify-end anim-fade-in">
        {/* Main Panel Surface */}
        <div
          className={`flex flex-col h-full bg-slate-50 border-l border-slate-200/60 shadow-[0_0_40px_rgba(0,0,0,0.1)] relative transition-all duration-500 ease-in-out anim-slide-in ${
            expandedView ? 'w-full max-w-4xl' : 'w-full max-w-md'
          }`}
        >
          {/* Header */}
          <div className="px-6 py-5 bg-white/90 backdrop-blur-md border-b border-slate-100 flex items-center justify-between z-20 shadow-sm">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center shadow-lg shadow-emerald-700/20">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-semibold text-[15px] text-slate-800 tracking-tight">
                  CogniYard Copilot
                </h2>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium uppercase tracking-wider mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Intelligence Engine Active</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <button
                onClick={() =>
                  setMessages([
                    {
                      sender: 'bot',
                      text: 'Session reset. How can I assist?',
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ])
                }
                title="Reset Chat"
                className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setExpandedView(!expandedView)}
                className="p-2 rounded-lg hover:bg-slate-100 hover:text-slate-700 transition-colors hidden md:flex"
              >
                {expandedView ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <button
                onClick={() => setIsAiOpen(false)}
                className="p-2 rounded-lg hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Active Domain Indicator */}
          <div className="px-6 py-2 bg-slate-100/50 border-b border-slate-200/50 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Current Scope: <strong className="text-slate-700 font-medium">{currentContext.name}</strong>
              </span>
            </div>
          </div>

          {/* Chat Feed Container */}
          <div
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 p-6 overflow-y-auto space-y-6 bg-slate-50/50 scroll-smooth relative"
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex flex-col anim-message ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                style={{ animationDelay: `${Math.min(idx * 0.05, 0.2)}s` }}
              >
                <div
                  className={`max-w-[88%] text-[13px] leading-relaxed p-4 shadow-sm border ${
                    msg.sender === 'user'
                      ? 'bg-emerald-700 text-white border-emerald-800 rounded-2xl rounded-tr-sm shadow-emerald-900/10'
                      : 'bg-white text-slate-700 border-slate-200 rounded-2xl rounded-tl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>

                  {/* Procurement Intelligence Preview */}
                  {msg.sender === 'bot' && msg.toolResult?.procurementPreview && (
                    <div className="mt-5 space-y-3">
                      {/* Requirement Card */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                        <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-3">
                          Procurement Recommendation
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                            <span className="text-slate-500">Product</span>
                            <span className="font-medium text-slate-800">
                              {msg.toolResult.procurementPreview.requirement.productName}
                            </span>
                          </div>
                          <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                            <span className="text-slate-500">Quantity</span>
                            <span className="font-medium text-slate-800">
                              {msg.toolResult.procurementPreview.requirement.quantity.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pb-1">
                            <span className="text-slate-500">Unit Price</span>
                            <span className="font-medium text-slate-800">
                              ₹{msg.toolResult.procurementPreview.requirement.unitPrice.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t-2 border-slate-200">
                          <div className="text-[10px] text-slate-500 font-medium">Estimated Total</div>
                          <div className="text-xl font-bold text-emerald-700 tracking-tight mt-0.5">
                            ₹{msg.toolResult.procurementPreview.requirement.estimatedTotalValue.toLocaleString('en-IN')}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">
                            {msg.toolResult.procurementPreview.requirement.quantity.toLocaleString('en-IN')} × ₹
                            {msg.toolResult.procurementPreview.requirement.unitPrice.toLocaleString('en-IN')}
                          </div>
                        </div>
                      </div>

                      {/* Recommended Supplier Card */}
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4 text-emerald-600" />
                          <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-700">
                            Recommended Supplier
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-slate-800">
                          {msg.toolResult.procurementPreview.supplierIntelligence.topSupplier.name}
                        </div>
                        <div className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          {msg.toolResult.procurementPreview.supplierIntelligence.rationale}
                        </div>
                      </div>

                      {/* EOQ / Planning Card */}
                      {msg.toolResult.procurementPreview.planningValidation?.available && (
                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                          <div className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 mb-3">
                            Planning Validation
                          </div>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-slate-500">EOQ (Economic Order Qty)</span>
                            <span className="font-semibold text-indigo-900">
                              {msg.toolResult.procurementPreview.planningValidation.eoq.toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Requested Quantity</span>
                            <span className="font-semibold text-indigo-900">
                              {msg.toolResult.procurementPreview.planningValidation.requestedQuantity.toLocaleString(
                                'en-IN'
                              )}
                            </span>
                          </div>
                          <div className="text-[11px] text-indigo-700 mt-3 pt-2 border-t border-indigo-100/50">
                            {msg.toolResult.procurementPreview.planningValidation.recommendation}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Human Approval Action Button */}
                  {msg.sender === 'bot' && msg.requiresConfirmation && msg.params && (
                    <div className="mt-5 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-3 text-[11px] font-medium text-amber-600 bg-amber-50 px-3 py-2 rounded-lg border border-amber-100/50">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Human authorization required to proceed</span>
                      </div>

                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => {
                          handleSend('Approve Procurement Recommendation', true, {
                            ...msg.params,
                            __tool: msg.tool
                          });
                        }}
                        className="w-full group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-900 hover:bg-emerald-700 text-white font-medium text-[13px] transition-all duration-300 disabled:opacity-50 overflow-hidden shadow-md hover:shadow-xl hover:shadow-emerald-900/20 transform hover:-translate-y-0.5"
                      >
                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                        <CheckCircle2 className="w-4 h-4 relative z-10" />
                        <span className="relative z-10">
                          {msg.actionType === 'APPROVE_PROCUREMENT_RECOMMENDATION'
                            ? 'Authorize Recommendation'
                            : msg.actionType === 'CREATE_PO_FROM_APPROVED_RECOMMENDATION'
                            ? 'Authorize & Generate PO'
                            : msg.actionType === 'CREATE_PR'
                            ? 'Authorize & Generate PR'
                            : msg.actionType === 'APPROVE_PR'
                            ? 'Authorize PR'
                            : msg.actionType === 'CONTROL_SIMULATION'
                            ? 'Confirm Simulation Action'
                            : 'Confirm Action'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 px-1 mt-1.5 font-medium">
                  <Clock className="w-3 h-3" />
                  <span>{msg.timestamp}</span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-3 text-xs text-slate-600 p-4 bg-white border border-slate-200 rounded-2xl rounded-tl-sm max-w-[75%] shadow-sm anim-message">
                <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span className="animate-pulse">Processing request...</span>
              </div>
            )}

            {/* Scroll anchor target */}
            <div ref={chatEndRef} />

            {/* Floating Scroll-to-Bottom Button */}
            {showScrollBottom && (
              <div className="sticky bottom-4 right-2 flex justify-end z-30 pointer-events-none">
                <button
                  type="button"
                  onClick={scrollToBottom}
                  className="pointer-events-auto p-2.5 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white shadow-lg backdrop-blur-md transition-all duration-200 transform hover:scale-110 flex items-center justify-center border border-slate-700/50 anim-fade-in"
                  title="Scroll to latest message"
                >
                  <ArrowDown className="w-4 h-4 animate-bounce" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Prompts Bar */}
          <div className="px-5 py-3 border-t border-slate-200 bg-white/80 backdrop-blur-sm z-10">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt.text)}
                  className="group flex items-center gap-1.5 text-[11px] font-medium px-3.5 py-2 rounded-full bg-slate-50 text-slate-600 border border-slate-200 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 whitespace-nowrap transition-all duration-200"
                >
                  <prompt.icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                  <span>{prompt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar Area */}
          <div className="p-4 bg-white border-t border-slate-100 z-10 pb-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="relative flex items-center group"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? 'Listening...' : 'Ask Copilot anything...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-5 pr-24 py-3.5 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all duration-300"
              />

              <div className="absolute right-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2 rounded-xl transition-all duration-200 ${
                    isListening
                      ? 'bg-rose-100 text-rose-600 animate-pulse'
                      : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 disabled:hover:bg-emerald-600 transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-emerald-600/20 transform active:scale-95"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </form>
            <div className="text-center mt-3">
              <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">
                AI can make mistakes. Verify critical actions.
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}