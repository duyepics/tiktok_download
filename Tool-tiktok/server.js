const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint to fetch TikTok video data
app.post('/api/download', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Validate TikTok URL
    const tiktokRegex = /tiktok\.com/i;
    if (!tiktokRegex.test(url)) {
      return res.status(400).json({ error: 'Please provide a valid TikTok URL' });
    }

    // Call TikWM API
    const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const data = await response.json();

    if (data.code !== 0) {
      return res.status(400).json({ error: data.msg || 'Failed to fetch video data' });
    }

    res.json({ success: true, data: data.data });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// Proxy endpoint for downloading files (to avoid CORS issues)
app.get('/api/proxy', async (req, res) => {
  try {
    const { url, filename } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.tiktok.com/'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to download file' });
    }

    const contentType = response.headers.get('content-type');

    // Set appropriate headers for download
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'download'}"`);

    // Pipe the response
    response.body.pipe(res);
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Download failed' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 TikTok Downloader is running at http://localhost:${PORT}\n`);
});
