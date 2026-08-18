import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, X, Sparkles, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export default function NewsAssistant({ activeArticle, onClose, onSearchTrigger }) {
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: activeArticle 
        ? `I have loaded "${activeArticle.title}". Would you like a 3-point brief, key takeaways, or fact-checking context?`
        : 'Hello! I can summarize any news headline, find updates on ARY/BBC/international channels, or explain complex stories. What would you like to know?'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (activeArticle) {
      handleAutoSummarize(activeArticle);
    }
  }, [activeArticle]);

  const handleAutoSummarize = async (article) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/assistant/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          description: article.description,
          content: article.content,
          url: article.url,
        }),
      });
      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { sender: 'assistant', text: `**Summary of: ${article.title}**\n\n${data.summary || data.error || 'Summary unavailable.'}` }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { sender: 'assistant', text: 'Error connecting to the intelligence backend.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return;

    const userQuery = input.trim();
    setMessages(prev => [...prev, { sender: 'user', text: userQuery }]);
    setInput('');
    setLoading(true);

    if (userQuery.toLowerCase().startsWith('search ') || userQuery.toLowerCase().startsWith('find ')) {
      const queryTerm = userQuery.replace(/^(search|find)\s+/i, '');
      if (onSearchTrigger) onSearchTrigger(queryTerm);
    }

    try {
      const res = await fetch(`${API_BASE}/api/assistant/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'User Direct Query',
          description: userQuery,
          content: activeArticle ? `Context Article: ${activeArticle.title} - ${activeArticle.description}` : '',
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { sender: 'assistant', text: data.summary || data.error || 'Unable to process request.' }]);
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'assistant', text: 'Connection error. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end md:items-center justify-end md:justify-center p-4 md:p-0">
      <div className="w-full md:w-96 h-[600px] bg-slate-900 border border-slate-800 rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-500" />
            <span className="font-bold text-sm text-slate-100">AI News Assistant</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded transition">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs px-3 py-2 rounded text-xs whitespace-pre-line ${
                msg.sender === 'user'
                  ? 'bg-cyan-600 text-white font-medium'
                  : 'bg-slate-800 text-slate-100 border border-slate-700'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start items-center gap-2 text-cyan-400 text-xs py-1">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing feed...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about news or type 'search tech'..."
            className="flex-1 bg-slate-800 text-slate-100 px-3 py-2 text-xs rounded border border-slate-700 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="p-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

