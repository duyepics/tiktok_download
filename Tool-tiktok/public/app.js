// ===== DOM Elements =====
const urlInput = document.getElementById('urlInput');
const pasteBtn = document.getElementById('pasteBtn');
const fetchBtn = document.getElementById('fetchBtn');
const btnLoader = document.getElementById('btnLoader');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const resultSection = document.getElementById('resultSection');
const resultCard = document.getElementById('resultCard');
const previewImage = document.getElementById('previewImage');
const resultAuthor = document.getElementById('resultAuthor');
const resultDesc = document.getElementById('resultDesc');
const statLikes = document.getElementById('statLikes');
const statComments = document.getElementById('statComments');
const statShares = document.getElementById('statShares');
const statPlays = document.getElementById('statPlays');
const optionsGrid = document.getElementById('optionsGrid');
const slideshowSection = document.getElementById('slideshowSection');
const slideshowGrid = document.getElementById('slideshowGrid');
const downloadAllImages = document.getElementById('downloadAllImages');
const toast = document.getElementById('toast');
const toastText = document.getElementById('toastText');

// ===== Helpers =====
function formatNumber(num) {
  if (!num) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function showError(msg) {
  errorText.textContent = msg;
  errorMessage.classList.add('show');
  setTimeout(() => errorMessage.classList.remove('show'), 5000);
}

function showToast(msg) {
  toastText.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function setLoading(loading) {
  fetchBtn.classList.toggle('loading', loading);
  fetchBtn.disabled = loading;
}

function triggerDownload(url, filename) {
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;
  const a = document.createElement('a');
  a.href = proxyUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast('Đang tải xuống: ' + filename);
}

function createDlButton(iconClass, iconSvg, title, subtitle, onClick) {
  const btn = document.createElement('button');
  btn.className = 'dl-btn';
  btn.innerHTML = `
    <div class="dl-btn-icon ${iconClass}">${iconSvg}</div>
    <div class="dl-btn-info">
      <div class="dl-btn-title">${title}</div>
      <div class="dl-btn-sub">${subtitle}</div>
    </div>
  `;
  btn.addEventListener('click', onClick);
  return btn;
}

// ===== SVG Icons =====
const videoSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
const audioSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
const imageSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
const dlIconSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

// ===== Paste Button =====
pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    urlInput.value = text;
    urlInput.focus();
    showToast('Đã dán link từ clipboard!');
  } catch {
    showToast('Không thể truy cập clipboard');
  }
});

// ===== Fetch Data =====
async function fetchTikTokData() {
  const url = urlInput.value.trim();
  if (!url) { showError('Vui lòng nhập link TikTok'); return; }
  if (!/tiktok\.com/i.test(url)) { showError('Link không hợp lệ. Vui lòng nhập link TikTok.'); return; }

  errorMessage.classList.remove('show');
  resultSection.classList.remove('show');
  setLoading(true);

  try {
    const res = await fetch('/api/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const json = await res.json();

    if (!res.ok || !json.success) {
      showError(json.error || 'Không thể lấy dữ liệu. Vui lòng thử lại.');
      return;
    }

    renderResult(json.data);
  } catch (err) {
    showError('Lỗi kết nối. Vui lòng kiểm tra server.');
  } finally {
    setLoading(false);
  }
}

fetchBtn.addEventListener('click', fetchTikTokData);
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchTikTokData(); });

// ===== Render Result =====
function renderResult(data) {
  // Preview
  const cover = data.cover || data.origin_cover;
  previewImage.src = cover ? `https://www.tikwm.com${cover}` : '';
  
  // Info
  resultAuthor.textContent = `@${data.author?.unique_id || data.author?.nickname || 'unknown'}`;
  resultDesc.textContent = data.title || 'Không có mô tả';
  statLikes.textContent = formatNumber(data.digg_count);
  statComments.textContent = formatNumber(data.comment_count);
  statShares.textContent = formatNumber(data.share_count);
  statPlays.textContent = formatNumber(data.play_count);

  // Clear previous options
  optionsGrid.innerHTML = '';
  slideshowSection.style.display = 'none';
  slideshowGrid.innerHTML = '';

  const isSlideshow = data.images && data.images.length > 0;
  const baseUrl = 'https://www.tikwm.com';

  if (!isSlideshow) {
    // === Video Downloads ===
    if (data.play) {
      optionsGrid.appendChild(createDlButton('video', videoSvg,
        'Video không logo', 'MP4 • Chất lượng gốc',
        () => triggerDownload(baseUrl + data.play, `tiktok_${data.id}.mp4`)
      ));
    }
    if (data.hdplay) {
      optionsGrid.appendChild(createDlButton('video', videoSvg,
        'Video HD không logo', 'MP4 • Chất lượng cao',
        () => triggerDownload(baseUrl + data.hdplay, `tiktok_hd_${data.id}.mp4`)
      ));
    }
    if (data.wmplay) {
      optionsGrid.appendChild(createDlButton('video', videoSvg,
        'Video có logo', 'MP4 • Có watermark',
        () => triggerDownload(baseUrl + data.wmplay, `tiktok_wm_${data.id}.mp4`)
      ));
    }
  } else {
    // === Slideshow Images ===
    slideshowSection.style.display = 'block';
    data.images.forEach((imgUrl, i) => {
      const fullUrl = imgUrl.startsWith('http') ? imgUrl : baseUrl + imgUrl;
      const item = document.createElement('div');
      item.className = 'slide-item';
      item.innerHTML = `
        <img src="${fullUrl}" alt="Slide ${i + 1}" loading="lazy">
        <div class="slide-overlay" title="Tải ảnh ${i + 1}">
          ${dlIconSvg}
        </div>
      `;
      item.querySelector('.slide-overlay').addEventListener('click', () => {
        triggerDownload(fullUrl, `tiktok_slide_${data.id}_${i + 1}.jpg`);
      });
      slideshowGrid.appendChild(item);
    });

    downloadAllImages.onclick = () => {
      data.images.forEach((imgUrl, i) => {
        const fullUrl = imgUrl.startsWith('http') ? imgUrl : baseUrl + imgUrl;
        setTimeout(() => triggerDownload(fullUrl, `tiktok_slide_${data.id}_${i + 1}.jpg`), i * 500);
      });
    };
  }

  // === Audio Download ===
  if (data.music) {
    const musicUrl = data.music.startsWith('http') ? data.music : baseUrl + data.music;
    optionsGrid.appendChild(createDlButton('audio', audioSvg,
      'Âm thanh gốc', `MP3 • ${data.music_info?.title || 'Original Sound'}`,
      () => triggerDownload(musicUrl, `tiktok_audio_${data.id}.mp3`)
    ));
  }

  // Show result
  resultSection.classList.add('show');
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
