import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


// Helper function to call Gemini AI with candidate models & fallback
async function generateSummaryWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in environment variables.');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Allow custom model from ENV or try supported Gemini models sequentially (defaulting to Gemini 3.6 Flash)
  const modelsToTry = process.env.GEMINI_MODEL
    ? [process.env.GEMINI_MODEL]
    : ['gemini-3.6-flash', 'gemini-3.6-pro', 'gemini-2.0-flash', 'gemini-1.5-flash'];


  let lastError = null;
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      if (text) return text;
    } catch (err) {
      console.warn(`Model '${modelName}' failed:`, err.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All candidate Gemini models failed to generate content.');
}

// Channel Domain Map for exact channel filtering
const CHANNEL_SITE_MAP = {
  'ARY News': 'arynews.tv',
  'ARY': 'arynews.tv',
  'Geo News': 'geo.tv',
  'Geo': 'geo.tv',
  'Dawn News': 'dawn.com',
  'Dawn': 'dawn.com',
  'BBC News': 'bbc.com',
  'BBC': 'bbc.com',
  'CNN': 'cnn.com',
  'Al Jazeera': 'aljazeera.com',
  'Express Tribune': 'tribune.com.pk',
  'Reuters': 'reuters.com'
};

// Helper function to parse XML RSS feeds
async function fetchNewsFromRssFeed(feedUrl, channelName) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) return [];

    const xml = await response.text();
    const items = [];
    const itemBlocks = xml.split(/<item>/i);

    for (let i = 1; i < itemBlocks.length && items.length < 15; i++) {
      const block = itemBlocks[i].split(/<\/item>/i)[0];
      const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
      const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
      const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const descMatch = block.match(/<description>([\s\S]*?)<\/description>/i);
      const sourceMatch = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i);
      const imgMatch = block.match(/url=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|gif))["']/i) ||
                       block.match(/src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|gif))["']/i) ||
                       block.match(/<media:content[^>]+url=["']([^"']+)["']/i);

      let cleanTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim() : '';
      let cleanDesc = descMatch ? descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim() : '';
      let cleanLink = linkMatch ? linkMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : '';
      let cleanSource = sourceMatch ? sourceMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : channelName;

      // Safe date parsing to avoid 'Invalid time value' RangeError
      let safeDate = new Date().toISOString();
      if (dateMatch && dateMatch[1]) {
        const parsed = new Date(dateMatch[1]);
        if (!isNaN(parsed.getTime())) {
          safeDate = parsed.toISOString();
        }
      }

      if (cleanTitle) {
        items.push({
          title: cleanTitle,
          description: cleanDesc || `${cleanTitle} - Live coverage from ${cleanSource || channelName}`,
          url: cleanLink || '#',
          image: imgMatch ? imgMatch[1] : null,
          publishedAt: safeDate,
          source: { name: cleanSource || channelName, url: cleanLink }
        });
      }
    }

    return items;
  } catch (err) {
    console.warn(`RSS parse failed for ${channelName} (${feedUrl}):`, err.message);
    return [];
  }
}

// GET /api/news
app.get('/api/news', async (req, res) => {
  try {
    const { query = '', channel = '', country = '' } = req.query;
    
    // Check if user selected a specific channel
    const targetSite = CHANNEL_SITE_MAP[channel];
    if (channel && targetSite) {
      const siteRssUrl = `https://news.google.com/rss/search?q=site:${encodeURIComponent(targetSite)}+${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
      const siteArticles = await fetchNewsFromRssFeed(siteRssUrl, channel);
      if (siteArticles.length > 0) {
        return res.json({ articles: siteArticles, source: 'site-rss' });
      }
    }

    // Try GNews API if NEWS_API_KEY is available
    const apiKey = process.env.NEWS_API_KEY;
    let searchQuery = (channel ? `${channel} ${query}` : query || 'latest news').trim();

    if (apiKey) {
      try {
        let url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(searchQuery)}&lang=en&max=12&apikey=${apiKey}`;
        if (country) url += `&country=${country}`;

        const newsResponse = await fetch(url);
        const data = await newsResponse.json();

        if (newsResponse.ok && data.articles && data.articles.length > 0) {
          return res.json({ articles: data.articles, source: 'gnews' });
        }
      } catch (gnewsErr) {
        console.warn('GNews API call error:', gnewsErr.message);
      }
    }

    // Fallback: Google News RSS Search
    const gnewsRssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;
    const fallbackRssArticles = await fetchNewsFromRssFeed(gnewsRssUrl, channel || 'Google News');

    if (fallbackRssArticles.length > 0) {
      return res.json({ articles: fallbackRssArticles, source: 'google-rss' });
    }

    res.json({ articles: [] });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ error: 'Internal server error while fetching news' });
  }
});



// POST /api/assistant/summarize
app.post('/api/assistant/summarize', async (req, res) => {
  try {
    const { title, description, content, url } = req.body;

    if (!title && !description) {
      return res.status(400).json({ error: 'News content or title is required.' });
    }

    const prompt = `
You are an expert news intelligence assistant. Provide a clear, unbiased summary of the following news story in 3 concise bullet points and 1 key takeaway sentence.

Article Title: ${title}
Context: ${description || ''}
Content Snippet: ${content || ''}
Source URL: ${url || ''}
`;

    const summary = await generateSummaryWithGemini(prompt);
    res.json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI summary', 
      details: error.message || 'Check GEMINI_API_KEY or model compatibility.' 
    });
  }
});

// Serve frontend static build if available (production mode / Render deployment)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Private News Backend running on port ${PORT}`);
});