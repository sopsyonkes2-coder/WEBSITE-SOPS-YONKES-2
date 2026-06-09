'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ 
          message: userMsg,
          history: messages.map(m => ({ role: m.role, parts: [{ text: m.text }] }))
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'model', text: data.text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "Maaf, terjadi gangguan koneksi." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-6 z-[999]">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[350px] h-[500px] glass border border-white/20 rounded-3xl flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="p-4 bg-emerald-500 flex justify-between items-center text-slate-950">
              <div className="flex items-center gap-2 font-bold">
                <Bot size={20} /> AI ASISTEN YONKES
              </div>
              <button onClick={() => setIsOpen(false)}><X size={20} /></button>
            </div>

            <div ref={scrollRef} className="flex-grow overflow-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-slate-400 text-sm mt-10">
                  Halo! Saya AI Yonkes. Tanya saya tentang jadwal latihan atau info umum lainnya.
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' ? 'bg-emerald-500 text-slate-950 rounded-tr-none' : 'bg-slate-800 text-white rounded-tl-none border border-white/10'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 p-3 rounded-2xl"><Loader2 className="animate-spin text-emerald-400" size={16} /></div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900/50 border-t border-white/10 flex gap-2">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Tanya sesuatu..."
                className="flex-grow bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-emerald-500"
              />
              <button 
                onClick={handleSend}
                className="bg-emerald-500 p-2 rounded-xl text-slate-950 hover:bg-emerald-400 transition-colors"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-slate-950 shadow-lg hover:scale-110 transition-transform active:scale-95"
      >
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
      </button>
    </div>
  );
}