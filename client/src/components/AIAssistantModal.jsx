import React, { useState, useRef, useEffect } from 'react';
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
  Layers,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Boxes,
  Check,
  AlertTriangle,
  Activity,
  Mic,
  MicOff
} from 'lucide-react';

export default function AIAssistantModal() {
  const { isAiOpen, setIsAiOpen, showNotification } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I'm your CogniYard Supply-Chain Copilot. I can analyze procurement, suppliers, trucks, yard operations, inventory, invoices, payments, exceptions, and end-to-end PO lifecycles. I can also execute approved actions when your role permits.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Clean up active recognition on unmount or modal close
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  if (!isAiOpen) return null;

  const getWorkspaceContext = () => {
    const path = location?.pathname || '';
    if (path.startsWith('/logistics') || path.startsWith('/yard-simulation')) return 'logistics';
    if (path.startsWith('/finance')) return 'finance';
    if (path.startsWith('/procurement')) return 'procurement';
    return 'general';
  };

  const currentContext = getWorkspaceContext();

  const getQuickPrompts = () => {
    if (currentContext === 'logistics') {
      return [
        { label: 'Where is TRK-1007?', text: 'Where is TRK-1007?', icon: Truck },
        { label: 'Show Delayed Trucks', text: 'Show delayed trucks', icon: AlertTriangle },
        { label: 'Which Trucks Waiting?', text: 'Which trucks are waiting?', icon: Clock },
        { label: 'Recommend Dock (TRK-1007)', text: 'Recommend a dock for TRK-1007', icon: Boxes },
        { label: 'What Is Blocking Receiving?', text: 'What is blocking receiving?', icon: ShieldAlert }
      ];
    }
    if (currentContext === 'finance') {
      return [
        { label: 'Why Payments On Hold?', text: 'Why are payments on hold?', icon: TrendingUp },
        { label: 'Show Mismatched Invoices', text: 'Show mismatched invoices', icon: AlertTriangle },
        { label: 'Why INV-8802 On Hold?', text: 'Why is INV-8802 on hold?', icon: FileText },
        { label: 'Trace INV-8802', text: 'Trace INV-8802', icon: Activity },
        { label: 'Invoices Ready For Payment', text: 'Which invoices are ready for payment?', icon: CheckCircle2 }
      ];
    }
    return [
      { label: 'Executive Summary', text: 'Give me an executive summary of the supply chain', icon: Activity },
      { label: 'What Needs Attention?', text: 'What needs my attention right now?', icon: ShieldAlert },
      { label: 'Show Delayed Trucks', text: 'Show delayed trucks', icon: Truck },
      { label: 'Why Payments On Hold?', text: 'Why are payments on hold?', icon: TrendingUp },
      { label: 'Trace PO-1003', text: 'Trace PO-1003', icon: FileText },
      { label: 'Top Suppliers', text: 'Which suppliers are performing best?', icon: Building2 },
      { label: 'Available Docks', text: 'Which docks are available?', icon: Boxes }
    ];
  };

  const quickPrompts = getQuickPrompts();

  const getBusinessActionLabel = (action) => {
    switch (action) {
      case 'CONTROL_TOWER_SUMMARY':
        return 'Supply chain telemetry analyzed';
      case 'TRACE_PO_LIFECYCLE':
        return 'PO lifecycle analyzed';
      case 'DOCK_RECOMMENDATION':
        return 'Smart dock recommendation computed';
      case 'EXCEPTION_CENTER':
        return 'Operational exceptions audited';
      case 'CREATED_PR':
        return 'Purchase Requisition created';
      case 'APPROVED_PR':
        return 'Purchase Requisition approved';
      case 'SUPPLIER_EVALUATION':
        return 'Supplier performance evaluated';
      case 'PO_STATUS':
        return 'Purchase Order retrieved';
      case 'TRUCK_STATUS':
        return 'Yard fleet status retrieved';
      case 'DELAYED_TRUCKS':
        return 'Delayed trucks audited';
      case 'RECEIVING_LOG':
        return 'Goods receipt log analyzed';
      case 'INVENTORY_STATUS':
        return 'Stock inventory checked';
      case 'INVOICE_STATUS':
        return '3-Way Match invoices audited';
      case 'PAYMENTS_ON_HOLD':
        return 'AP payments on hold reviewed';
      default:
        return 'Supply chain action completed';
    }
  };

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showNotification('Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.', 'warning');
      return;
    }

    // If currently listening, stop the active session
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        try { recognitionRef.current.abort(); } catch (err) {}
      }
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    // Start a fresh SpeechRecognition session
    try {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
        recognitionRef.current = null;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      let finalTranscript = '';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimText += result[0].transcript;
          }
        }
        const fullText = (finalTranscript + ' ' + interimText).trim();
        if (fullText) {
          setInput(fullText);
        }
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        recognitionRef.current = null;

        if (event.error === 'network') {
          showNotification("Chrome's speech recognition service is currently unavailable. Please check your internet connection and try again.", 'warning');
        } else if (event.error === 'not-allowed') {
          showNotification('Microphone access was denied. Please allow microphone access in your browser settings.', 'warning');
        } else if (event.error === 'audio-capture') {
          showNotification('No microphone was detected on your system.', 'warning');
        } else if (event.error === 'no-speech') {
          // Silence timeout, quiet stop
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setIsListening(false);
      recognitionRef.current = null;
      showNotification('Failed to start voice input. Please try again.', 'warning');
    }
  };

  const handleSend = async (textToSend, confirmed = false, pendingParams = null) => {
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
      setIsListening(false);
    }

    const text = textToSend || input;
    if (!text.trim() && !confirmed) return;
    if (loading) return;

    if (!confirmed) {
      const userMsg = {
        sender: 'user',
        text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, userMsg]);
      if (!textToSend) setInput('');
    }

    setLoading(true);

    try {
      const chatHistory = messages.slice(-6).map(m => `${m.sender}: ${m.text}`);
      const res = await aiAPI.chat(text, confirmed, pendingParams, chatHistory);
      const data = res.data;

      const botMsg = {
        sender: 'bot',
        text: data.reply,
        intent: data.intent,
        tool: data.tool,
        toolResult: data.toolResult,
        requiresConfirmation: data.requiresConfirmation,
        actionType: data.actionType,
        params: data.params,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMsg]);

      if (data.toolResult?.success && !data.requiresConfirmation) {
        showNotification(data.toolResult.details || 'Copilot action executed.', 'success');
      }
    } catch (err) {
      console.error('Copilot Chat Error:', err);
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
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-purple-500 to-sky-400 p-[1px] shadow-sm">
                <div className="w-full h-full bg-white dark:bg-zinc-900 rounded-[11px] flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Bot className="w-4 h-4" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">
                  CogniYard Supply-Chain Copilot
                </h3>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/60 font-mono tracking-wide">
                  GROQ AI
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Autonomous Operations & Voice Decision Support</p>
            </div>
          </div>

          <button
            onClick={() => setIsAiOpen(false)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors cursor-pointer"
            aria-label="Close Copilot"
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
                <p className="whitespace-pre-wrap font-sans">{msg.text}</p>

                {/* HUMAN CONFIRMATION CARD */}
                {msg.requiresConfirmation && (
                  <div className="mt-3.5 pt-3 border-t border-amber-200/60 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/30 p-3.5 rounded-xl space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span>Human Approval Required</span>
                    </div>
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 font-mono leading-relaxed">
                      {msg.text}
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => {
                          setMessages(prev => [...prev, { sender: 'bot', text: 'Action cancelled by user.', timestamp: new Date().toLocaleTimeString() }]);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 font-semibold text-xs border border-zinc-200 dark:border-zinc-800 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSend('Confirm Action', true, { ...msg.params, __tool: msg.tool })}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs cursor-pointer inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Action</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Structured Tool Result Renderers */}
                {msg.toolResult && msg.toolResult.success && (
                  <div className="mt-3.5 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-2.5">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>✓ {getBusinessActionLabel(msg.toolResult.action)}</span>
                    </div>

                    {/* Smart Dock Recommendation */}
                    {msg.toolResult.recommendedDock && (
                      <div className="bg-purple-50/70 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200/60 dark:border-purple-900/50 space-y-1">
                        <div className="flex justify-between items-center text-xs font-bold text-purple-900 dark:text-purple-200">
                          <span>Recommended Dock Bay: {msg.toolResult.recommendedDock}</span>
                          <span className="font-mono bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-md">
                            Score: {msg.toolResult.score}/100
                          </span>
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

          {/* Contextual Loading Activity Indicator */}
          {loading && (
            <div className="flex items-center gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 p-3 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl rounded-tl-xs max-w-[80%] shadow-sm">
              <Sparkles className="w-4 h-4 text-purple-500 animate-spin" />
              <span className="font-medium tracking-tight">Analyzing supply chain operations...</span>
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
                  <Icon className="w-3 h-3 text-zinc-400 group-hover:text-purple-500 transition-colors" />
                  <span>{prompt.label}</span>
                  <ArrowUpRight className="w-2.5 h-2.5 text-zinc-400 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Input Area with Microphone Toggle */}
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
              placeholder={isListening ? "Listening... Speak your operational prompt..." : "Ask Copilot or use voice input..."}
              className={`w-full bg-zinc-50 dark:bg-zinc-950 border rounded-xl pl-4 pr-20 py-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all font-sans ${
                isListening ? 'border-rose-500 ring-1 ring-rose-500/50 bg-rose-50/10 dark:bg-rose-950/20' : 'border-zinc-200 dark:border-zinc-800'
              }`}
            />

            <div className="absolute right-1.5 flex items-center gap-1">
              <button
                type="button"
                onClick={toggleListening}
                title={isListening ? "Stop listening" : "Use voice input"}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                    : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>

              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
          <div className="mt-2 text-center">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-600 font-mono">
              {isListening ? "Recording active — speech transcription is live." : "CogniYard Copilot · Voice transcription · Role-based access"}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
