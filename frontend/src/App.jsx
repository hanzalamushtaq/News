import React, { useState, useEffect } from 'react';
import { 
  Search, Moon, Sun, Globe2, Sparkles, ExternalLink, 
  Clock, Tv, X, Bot, RefreshCw, Github, Linkedin, Mail 
} from 'lucide-react';
import NewsAssistant from './components/NewsAssistant';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const CHANNELS = [
  { label: 'All Channels', value: '' },
  { label: 'ARY News', value: 'ARY News' },
  { label: 'Geo News', value: 'Geo News' },
  { label: 'Dawn News', value: 'Dawn News' },
  { label: 'BBC News', value: 'BBC News' },
  { label: 'CNN', value: 'CNN' },
  { label: 'Al Jazeera', value: 'Al Jazeera' },
  { label: 'Express Tribune', value: 'Express Tribune' },
  { label: 'Reuters', value: 'Reuters' },
];


export default function App() {
  const [theme, setTheme] = useState('dark');
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  
  // AI Assistant Modal State
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [summary, setSummary] = useState('');
  const [summarizing, setSummarizing] = useState(false);
  const [showAssistant, setShowAssistant] = useState(false);

  useEffect(() => {
    fetchNews();
  }, [selectedChannel]);

  const fetchNews = async (customQuery = searchQuery) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (customQuery) params.append('query', customQuery);
      if (selectedChannel) params.append('channel', selectedChannel);

      const res = await fetch(`${API_BASE}/api/news?${params.toString()}`);
      const data = await res.json();
      setNews(data.articles || []);
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchNews(searchQuery);
  };

  const handleSummarize = async (article) => {
    setSelectedArticle(article);
    setSummary('');
    setSummarizing(true);

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
      setSummary(data.summary || data.details || data.error || 'Summary could not be generated.');
    } catch (err) {
      setSummary('Failed to connect to AI Assistant.');
    } finally {
      setSummarizing(false);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <div className={theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}>
      <div className="min-h-screen flex flex-col font-sans transition-colors duration-200">
        
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur">
          <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="bg-cyan-500 text-slate-950 p-1.5 font-black text-sm tracking-wider uppercase">
                NP
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                NEWS<span className="text-cyan-500">PULSE</span> AI
              </span>
            </div>

            {/* Global Search Bar */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md min-w-[260px] relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search keywords, headlines, topics..."
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3.5 py-1.5 pl-9 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            </form>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAssistant(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-cyan-500 text-slate-950 hover:bg-cyan-400 transition"
              >
                <Bot className="w-4 h-4" /> AI Assistant
              </button>
              <button 
                onClick={toggleTheme} 
                className="p-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Toggle Theme"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>


        {/* Channel & Outlet Selector Strip */}
        <nav className="border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/50">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mr-2">
              <Tv className="w-3.5 h-3.5" /> Channels:
            </span>
            {CHANNELS.map((ch) => (
              <button
                key={ch.value}
                onClick={() => setSelectedChannel(ch.value)}
                className={`whitespace-nowrap px-3 py-1 text-xs font-semibold uppercase tracking-wider transition ${
                  selectedChannel === ch.value
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-cyan-500'
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Main Feed Content */}
        <main className="max-w-7xl mx-auto px-4 py-8 flex-1 w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-500" />
              <p className="text-xs uppercase tracking-widest text-slate-400">Fetching Dispatch Feed...</p>
            </div>
          ) : news.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-slate-300 dark:border-slate-800 p-8">
              <p className="text-slate-500 text-sm">No live stories match the selected query or channel.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {news.map((item, index) => (
                <article 
                  key={index}
                  className="flex flex-col justify-between border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-cyan-500/50 transition-all duration-150 group"
                >
                  <div>
                    {item.image && (
                      <div className="w-full h-44 overflow-hidden bg-slate-200 dark:bg-slate-800">
                        <img 
                          src={item.image} 
                          alt={item.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-cyan-600 dark:text-cyan-400 mb-2">
                        <span className="uppercase font-bold">{item.source?.name || selectedChannel || 'General'}</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3" />
                          {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Live'}
                        </span>
                      </div>
                      <h2 className="font-bold text-base line-clamp-2 text-slate-900 dark:text-slate-100 mb-2 leading-snug group-hover:text-cyan-500 transition">
                        {item.title}
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-4">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions Area */}
                  <div className="p-5 pt-0 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/80">
                    <button
                      onClick={() => handleSummarize(item)}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-3 py-1.5 border border-cyan-500/20 hover:bg-cyan-500 hover:text-slate-950 transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> AI Summary
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition"
                    >
                      Source <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>

        {/* AI Assistant Modal */}
        {selectedArticle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 shadow-2xl p-6 relative">
              <button 
                onClick={() => setSelectedArticle(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  News Intelligence Brief
                </h3>
              </div>

              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 border-l-2 border-cyan-500 pl-3">
                {selectedArticle.title}
              </h4>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 text-sm text-slate-700 dark:text-slate-300 min-h-[120px] whitespace-pre-line leading-relaxed">
                {summarizing ? (
                  <div className="flex items-center gap-2 text-cyan-500 py-4 justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs uppercase tracking-wider">Generating summary...</span>
                  </div>
                ) : (
                  summary
                )}
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setSelectedArticle(null)}
                  className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider hover:bg-slate-300 dark:hover:bg-slate-700 transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AI Assistant Drawer */}
        {showAssistant && (
          <NewsAssistant
            activeArticle={selectedArticle}
            onClose={() => setShowAssistant(false)}
            onSearchTrigger={(term) => {
              setSearchQuery(term);
              fetchNews(term);
            }}
          />
        )}


        {/* Footer with Details */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-8 px-4 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                Muhammad Hanzala Mushtaq
              </p>
              <p className="mt-0.5">Software Engineering & AI Developer</p>
            </div>

            <div className="flex items-center gap-4">
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 flex items-center gap-1">
                <Linkedin className="w-4 h-4" /> LinkedIn
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-cyan-500 flex items-center gap-1">
                <Github className="w-4 h-4" /> GitHub
              </a>
              <a href="mailto:contact@example.com" className="hover:text-cyan-500 flex items-center gap-1">
                <Mail className="w-4 h-4" /> Contact
              </a>
            </div>

            <p>© 2026 NewsPulse Dispatch. All rights reserved.</p>
          </div>
        </footer>

      </div>
    </div>
  );
}