const express = require('express');
const cors = require('cors');
const path = require('path');

const fetch = global.fetch || require('node-fetch'); // nếu Node < 18 thì dùng node-fetch@2

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// === API LẤY INFO VIDEO ===
app.post('/api/download', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) return res.status(400).json({ error: 'URL is required' });

    if (!/tiktok\.com/i.test(url)) {
      return res.status(400).json({ error: 'Please provide a valid TikTok URL' });
    }

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.tikwm.com/'
    };

    let data = null;

    // 1. Thử GET request tới TikWM API
    try {
      const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`;
      const response = await fetch(apiUrl, { method: 'GET', headers });
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        if (json.code === 0) data = json.data;
      } catch (e) {
        console.warn('GET TikWM returned non-JSON (possibly Cloudflare block)');
      }
    } catch (e) {
      console.warn('GET TikWM fetch failed:', e.message);
    }

    // 2. Fallback sang POST nếu GET chưa lấy được dữ liệu
    if (!data) {
      try {
        const postRes = await fetch('https://www.tikwm.com/api/', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
          },
          body: `url=${encodeURIComponent(url)}&hd=1`
        });
        const postText = await postRes.text();
        const postJson = JSON.parse(postText);
        if (postJson.code === 0) data = postJson.data;
      } catch (e) {
        console.warn('POST TikWM fetch failed:', e.message);
      }
    }

    if (!data) {
      return res.status(502).json({ error: 'Failed to fetch video data from TikTok service' });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error in /api/download:', error.message);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// === API PROXY TẢI VIDEO (ĐÃ ĐƯỢC SỬA LỖI CHO RENDER) ===
app.get('/api/proxy', async (req, res) => {
  try {
    const { url, filename } = req.query;

    if (!url) return res.status(400).json({ error: 'URL is required' });

    console.log('🔗 Bắt đầu tải URL qua Proxy:', url);

    const response = await fetch(url, {
      headers: {
        // Cập nhật User-Agent chuẩn để không bị TikTok chặn
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://www.tiktok.com/'
      }
    });

    if (!response.ok) {
      console.error('❌ Proxy bị từ chối với mã lỗi:', response.status);
      return res.status(response.status).json({ error: 'Failed to download file' });
    }

    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename || 'download'}"`);

    // SỬA LỖI Ở ĐÂY: Dùng arrayBuffer thay cho pipe() để tương thích 100% với Node 18+ trên Render
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.send(buffer);
    console.log(`✅ Tải xong và gửi về client: ${filename}`);

  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ error: 'Download failed' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Running on port ${PORT}`);
});
