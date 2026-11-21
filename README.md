# 📸 SMART PHOTO BOOTH KIOSK SYSTEM (HARU MOMENTS)

A complete, production-grade self-service Photo Booth Kiosk system built specifically for touchscreen Windows PCs and Mini PCs, connected to USB webcams / DSLRs and dye-sub photo printers.

Designed with an aesthetic, modern **Korean-style Photo Booth** visual identity (black, white, cream, and pastel accents, large touch-friendly buttons, and bilingual Thai / English support).

---

## 🌟 Key Features

### A. Customer Kiosk Touchscreen Interface
1. **Screen 1: Home Screen**
   - High-contrast branding & touch instruction.
   - Live hardware readiness monitor (Camera & Windows Printer).
   - One-touch language switch (🇹🇭 ไทย / 🇬🇧 English).
   - Discreet, PIN/password-protected Admin portal button.
2. **Screen 2: Photo Mode Selection**
   - **Photo Strip (4-Cut)**: Classic vertical 4-cut layout (Life4Cuts / Photoism style).
   - **Single Photo**: Signature beauty portrait with aesthetic framing.
   - **Photo Collage (2x2)**: 4-slot aesthetic grid layout.
   - **Group Photo**: 3-shot wide-angle layout with group-friendly countdown.
3. **Screen 3: Template Selection**
   - Live card previews with categories: Minimal, Pastel, Cute, Birthday, Anniversary, Seasonal, Custom.
   - Background colors, custom borders, and layout slots.
4. **Screen 4: Camera Preview & Capture**
   - Real-time WebRTC webcam preview.
   - Configurable countdown timer (3, 5, or 10 seconds).
   - Audio countdown beeps and mechanical camera shutter click (Web Audio API).
   - Visual screen flash effect (`animate-flash`).
   - Picture-in-picture thumbnail preview of each shot taken.
   - Built-in live studio test pattern simulator for headless/hardware testing without a webcam.
5. **Screen 5: Photo Selection & Reordering**
   - Review captured shots.
   - Reorder shots with left/right touch arrows.
   - Retake single shot or retake entire session.
6. **Screen 6: Photo Editor**
   - **Filters**: Original, B&W (Monochrome), Warm (Golden Sun), Cool (Studio Pastel), Vintage (Retro Film).
   - **Tone Sliders**: Brightness, Contrast, Saturation.
   - **Rotation**: 90° incremental steps.
   - **Stickers**: Cute Korean photo booth stickers (hearts, sparkles, ribbons, crown, bunny, cat, etc.).
   - **Custom Text**: Multi-color custom captions with font size adjustment.
   - *Non-destructive*: Original captured photos remain preserved on disk.
7. **Screen 7: Final Preview**
   - 300 DPI high-resolution composition preview rendered via server-side Sharp engine.
   - Back to edit or confirm to print.
8. **Screen 8: Print and QR Download**
   - **Physical Print**: Copies selector (1-4), paper size (4x6, 2x6 strip, A4), Windows spooler status tracking, and duplicate click prevention.
   - **Mobile QR Download**: Scan QR code with any smartphone to open mobile landing page and download high-res JPG and PNG files without installing any app. Automatically uses the Kiosk PC's local Wi-Fi LAN IP (or configured cloud URL) so phones can connect directly.
9. **Screen 9: Session Complete**
   - Celebratory confetti explosion (`canvas-confetti`) & chime.
   - Thank you message in Thai & English.
   - Auto-return countdown timer (30s) returning to Home.
   - Complete cleanup of customer memory state before next session.

---

### B. Admin Dashboard (Management Interface)
- **Protected Access**: Secure bcrypt password authentication (`admin` / `admin123`) with JWT.
- **Overview Dashboard**: Total sessions, today's sessions, monthly sessions, total photos captured, total prints dispatched, top photo mode, camera health, printer health, storage usage.
- **Session History**: Search by session ID/code, filter by mode, view final image composition, authorized reprint, and safe deletion.
- **Template Manager**: Add, edit, toggle enable/disable, customize background and border colors, and delete templates.
- **Package Manager**: Organize available service modes and photo shot counts (Zero payment workflows).
- **Device Management**: Live camera feed test, webcam switcher, Windows printer list, test print dispatch, and storage health.
- **Settings**: Business name, tagline, countdown defaults, session timeout, local image retention policy (e.g. 7 days), QR expiration, sound toggles, and LAN IP.
- **Reports & Analytics**: Mode distribution chart, 14-day trend analysis, template popularity, and CSV export.

---

## 🏗️ System Architecture

```
        Touchscreen Monitor (1080p / 4K)
                       │
             Windows Touch Input
                       │
     Frontend Application (React + Vite + Tailwind)
                       │
                       │  HTTP REST / WebSocket ws://
                       ▼
       Local Backend API (Node.js + Express + TS)
         ├── Camera Service (WebRTC + Modular DSLR Hook)
         ├── Composition Engine (Sharp 300 DPI Rendering)
         ├── Windows Printer Service (Registry + Spooler)
         ├── QR Download Service (LAN IP + Mobile Web App)
         └── Retention Cleanup Service (Auto Disk Purge)
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
Local SQLite Database         Structured Storage Directory
 (Node 26 node:sqlite)        (storage/sessions, templates, exports)
```

---

## 💻 Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React, Canvas Confetti.
- **Backend**: Node.js v26+, Express, TypeScript, tsx.
- **Database**: SQLite (Node.js native built-in `node:sqlite` DatabaseSync with WAL mode).
- **Image Processing**:
  - Client-side HTML Canvas API for immediate responsive interactive preview.
  - Server-side Sharp for pristine 300 DPI high-resolution rendering, center-crop without stretching, rounded corners, filter color matrix, stickers, and typography.
- **Printing**: Windows spooler integration via PowerShell and Windows print APIs, supporting standard Windows photo printer drivers (DNP DS620, Citizen CY-02, HiTi, Canon SELPHY, Microsoft Print to PDF).
- **QR Codes**: `qrcode` library with LAN Wi-Fi auto-discovery and mobile-friendly HTML5 download page.

---

## 📁 Storage Directory Structure

```
PHOTOBOOTH/
  ├── backend/               # Node.js Express REST API & Hardware Services
  │   ├── src/
  │   │   ├── config/        # Database & Path configurations
  │   │   ├── database/      # Migrations & Seed data
  │   │   ├── middleware/    # Auth, Validation, Error Handler
  │   │   ├── routes/        # Session, Photo, Print, Template, Admin routes
  │   │   └── services/      # Sharp composition, Camera, Printer, QR services
  ├── frontend/              # React 19 Touchscreen Kiosk UI & Admin Portal
  │   ├── src/
  │   │   ├── components/
  │   │   │   ├── common/    # TouchButton, Header, LanguageToggle
  │   │   │   ├── kiosk/     # Screens 1 to 9
  │   │   │   └── admin/     # Admin Dashboard, Sessions, Devices, Settings
  │   │   ├── context/       # KioskContext, AdminContext, LanguageContext
  │   │   ├── locales/       # Bilingual dictionaries (Thai / English)
  │   │   └── services/      # Camera adapter, WebSockets, Audio synth, API client
  ├── database/              # SQLite database (photobooth.sqlite)
  ├── storage/               # Structured local file storage
  │   ├── sessions/
  │   │   └── {SESSION_ID}/
  │   │       ├── captured/  # Pristine captured shots
  │   │       ├── edited/    # Filtered / transformed assets
  │   │       └── final/     # High-res 300 DPI JPG & PNG outputs + Thumbnails
  │   ├── templates/         # Template SVGs and frame overlays
  │   ├── logos/             # Business branding logos
  │   └── exports/           # CSV reports
  └── scripts/               # Windows Kiosk launchers, Autostart, Power policies
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **OS**: Windows 10 / Windows 11 (PC or Mini PC).
- **Node.js**: v20 or newer (v26 recommended).
- **Hardware**: Touchscreen monitor, USB Webcam (or DSLR), Photo printer (or Microsoft Print to PDF for virtual testing).

### 2. Installation
```powershell
# Navigate to project directory
cd D:\Smart-Photo-Booth

# Install backend dependencies
cd backend
npm.cmd install

# Initialize and seed database
npm.cmd run seed

# Install frontend dependencies
cd ..\frontend
npm.cmd install
```

### 3. Running the System
You can start both Backend and Frontend with a single click:
```powershell
# Double-click or run:
d:\Smart-Photo-Booth\scripts\start-all.bat
```
Or start individually:
```powershell
# Terminal 1 - Backend Server
cd D:\Smart-Photo-Booth\backend
npm.cmd run dev

# Terminal 2 - Frontend Kiosk
cd D:\Smart-Photo-Booth\frontend
npm.cmd run dev
```

- **Customer Kiosk UI**: `http://localhost:5173`
- **Admin Dashboard**: Click the Shield icon at top-right of the Kiosk screen (or press `Ctrl+A`).
  - **Username**: `admin`
  - **Password**: `admin123`

---

## 🖥️ Windows Kiosk Mode Deployment

### Running Fullscreen Touch Kiosk
Run the provided launcher:
```powershell
d:\Smart-Photo-Booth\scripts\start-kiosk.bat
```
This launches Microsoft Edge or Google Chrome with:
- `--kiosk`: Fullscreen display without URL bar or window frames.
- `--disable-pinch`: Disables unwanted browser zooming on touchscreen.
- `--overscroll-history-navigation=0`: Prevents swipe-to-go-back gesture.

### Automatic Startup on Windows Boot
Double-click `scripts\setup-autostart.bat`. It automatically creates a shortcut in the Windows Startup directory (`shell:startup`) so the entire system launches into full-screen touch mode upon power-on.

### Power & Display Keep-Awake Policy
Run PowerShell as Administrator:
```powershell
powershell -ExecutionPolicy Bypass -File d:\Smart-Photo-Booth\scripts\windows-kiosk-policy.ps1
```
This ensures the kiosk monitor never goes to sleep or turns off during business hours.

---

## 📱 Mobile QR Code Downloads

When customers reach the final step:
1. The kiosk displays a high-contrast QR code pointing to `http://<KIOSK_LAN_IP>:5000/download/<TOKEN>`.
2. The customer scans with their iPhone or Android camera app.
3. A mobile-optimized web page opens with high-resolution **Download JPG** and **Download PNG** buttons.
4. **No App Required**: Works directly in Safari, Chrome, Samsung Internet.
5. **Privacy**: Files expire and are purged according to the configurable retention policy (default 7 days).
