import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { qrService } from '../services/qrService.js';

export const downloadRouter = Router();

// POST /api/download/create - Create QR code and secure token for a session
downloadRouter.post('/create', async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      res.status(400).json({ success: false, message: 'sessionId is required' });
      return;
    }

    const tokenInfo = await qrService.createDownloadToken(sessionId);
    res.json({
      success: true,
      data: tokenInfo
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/download/info/:token - API endpoint to validate token and return download details
downloadRouter.get('/info/:token', (req, res, next) => {
  try {
    const { token } = req.params;
    const result = qrService.validateToken(token);

    if (!result.valid) {
      res.status(404).json({ success: false, message: result.message });
      return;
    }

    res.json({
      success: true,
      data: {
        sessionId: result.sessionId,
        expiresAt: result.expiresAt,
        hasJpg: !!(result.finalPhoto && fs.existsSync(result.finalPhoto.jpgPath)),
        hasPng: !!(result.finalPhoto && fs.existsSync(result.finalPhoto.pngPath)),
        width: result.finalPhoto?.width,
        height: result.finalPhoto?.height
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/download/:token/file/:type - Secure file streaming (type: 'jpg', 'png', or 'gif')
downloadRouter.get('/:token/file/:type', (req, res, next) => {
  try {
    const { token, type } = req.params;
    const result = qrService.validateToken(token);

    if (!result.valid || !result.finalPhoto) {
      res.status(404).send('Invalid or expired download link');
      return;
    }

    const tLower = type.toLowerCase();
    let filePath = result.finalPhoto.jpgPath;
    let contentType = 'image/jpeg';
    let extension = 'jpg';

    if (tLower === 'png') {
      filePath = result.finalPhoto.pngPath;
      contentType = 'image/png';
      extension = 'png';
    } else if (tLower === 'gif') {
      if (!result.finalPhoto.gifPath || !fs.existsSync(result.finalPhoto.gifPath)) {
        res.status(404).send('GIF animation not available for this session');
        return;
      }
      filePath = result.finalPhoto.gifPath;
      contentType = 'image/gif';
      extension = 'gif';
    }

    if (!fs.existsSync(filePath)) {
      res.status(404).send('Photo file not found on kiosk server');
      return;
    }

    const sid = result.sessionId || 'session';
    const downloadFilename = `Haru_Photobooth_${sid.substring(0, 8)}.${extension}`;
    const isDownload = req.query.download === '1';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${downloadFilename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    next(err);
  }
});

// GET /download/:token - Mobile-friendly HTML landing page for phone QR scan
downloadRouter.get('/:token', (req, res) => {
  const { token } = req.params;
  const result = qrService.validateToken(token);

  if (!result.valid || !result.finalPhoto) {
    res.status(404).send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Photo Not Available - Haru Photo Booth</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #FAF9F6; color: #2D2D2D; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center; }
          .card { background: white; padding: 32px 24px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); max-width: 400px; width: 100%; }
          h2 { margin-top: 0; color: #E53E3E; font-size: 22px; }
          p { color: #666; font-size: 15px; line-height: 1.5; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Expired or Invalid Link</h2>
          <p>${result.message || 'This photo download session is no longer available.'}</p>
        </div>
      </body>
      </html>
    `);
    return;
  }

  const jpgDownloadUrl = `/api/download/${token}/file/jpg`;
  const pngDownloadUrl = `/api/download/${token}/file/png`;
  const gifDownloadUrl = `/api/download/${token}/file/gif`;
  const hasGif = !!(result.finalPhoto.gifPath && fs.existsSync(result.finalPhoto.gifPath));

  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Download Your Photo & GIF - Haru Photo Booth</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Prompt:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 24px 16px;
          background: #FAF9F6;
          color: #1A1A1A;
          font-family: 'Plus Jakarta Sans', 'Prompt', -apple-system, sans-serif;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .container {
          max-width: 440px;
          width: 100%;
          background: #FFFFFF;
          border-radius: 24px;
          padding: 24px 20px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.06);
          border: 1px solid #F0EEE9;
          text-align: center;
        }
        .brand {
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 3px;
          color: #8C827A;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        h1 {
          font-size: 24px;
          font-weight: 800;
          margin: 0 0 6px 0;
          color: #1A1A1A;
        }
        .subtitle {
          font-size: 14px;
          color: #71717A;
          margin-bottom: 16px;
        }
        .tab-bar {
          display: flex;
          background: #F4F2EC;
          padding: 4px;
          border-radius: 14px;
          margin-bottom: 16px;
          gap: 4px;
        }
        .tab-btn {
          flex: 1;
          padding: 10px;
          border: none;
          background: transparent;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          color: #71717A;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .tab-btn.active {
          background: #FFFFFF;
          color: #1A1A1A;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .preview-wrapper {
          background: #F4F2EC;
          border-radius: 16px;
          padding: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 280px;
          overflow: hidden;
        }
        .preview-img {
          max-width: 100%;
          max-height: 440px;
          border-radius: 10px;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
          object-fit: contain;
        }
        .actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 16px;
          border-radius: 16px;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          transition: all 0.2s ease;
          border: none;
          cursor: pointer;
        }
        .btn-primary {
          background: #1A1A1A;
          color: #FFFFFF;
        }
        .btn-primary:active {
          background: #333333;
          transform: scale(0.98);
        }
        .btn-gif {
          background: #7C3AED;
          color: #FFFFFF;
        }
        .btn-gif:active {
          background: #6D28D9;
          transform: scale(0.98);
        }
        .btn-secondary {
          background: #F5F3ED;
          color: #2D2D2D;
          border: 1px solid #EBE7DE;
        }
        .btn-secondary:active {
          background: #EBE7DE;
          transform: scale(0.98);
        }
        .footer-note {
          margin-top: 20px;
          font-size: 12px;
          color: #A1A1AA;
          line-height: 1.6;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="brand">HARU MOMENTS</div>
        <h1>ดาวน์โหลดผลงานของคุณ</h1>
        <div class="subtitle">Download Your Photos & Boomerang GIF</div>

        ${hasGif ? `
        <div class="tab-bar">
          <button class="tab-btn active" onclick="switchTab('photo')">📷 รูปถ่าย (Photo)</button>
          <button class="tab-btn" onclick="switchTab('gif')">🎬 ภาพเคลื่อนไหว (GIF)</button>
        </div>
        ` : ''}

        <div class="preview-wrapper">
          <img id="main-preview" class="preview-img" src="${jpgDownloadUrl}" alt="Photobooth Picture">
        </div>

        <div class="actions">
          <a href="${jpgDownloadUrl}?download=1" download class="btn btn-primary">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ดาวน์โหลดรูปภาพ (JPG)
          </a>

          ${hasGif ? `
          <a href="${gifDownloadUrl}?download=1" download class="btn btn-gif">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            ดาวน์โหลดภาพเคลื่อนไหว (Boomerang GIF)
          </a>
          ` : ''}

          <a href="${pngDownloadUrl}?download=1" download class="btn btn-secondary">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            ดาวน์โหลดไฟล์ PNG (Lossless)
          </a>
        </div>

        <div class="footer-note">
          💡 ทริค: แตะค้างที่ภาพเพื่อกด "บันทึกรูปภาพ" ลงอัลบั้มมือถือได้เลย<br>
          🔒 ภาพถ่ายของท่านจะถูกลบอัตโนมัติตามนโยบายความเป็นส่วนตัว
      </div>

      <script>
        function switchTab(type) {
          const preview = document.getElementById('main-preview');
          const btns = document.querySelectorAll('.tab-btn');
          btns.forEach(b => b.classList.remove('active'));

          if (type === 'gif') {
            btns[1].classList.add('active');
            preview.src = '${gifDownloadUrl}';
          } else {
            btns[0].classList.add('active');
            preview.src = '${jpgDownloadUrl}';
          }
        }
      </script>
    </body>
    </html>
  `);
});
