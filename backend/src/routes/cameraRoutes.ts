import { Router } from 'express';
import { cameraManager } from '../services/cameraService.js';
import { hotfolderService } from '../services/hotfolderService.js';
import { broadcastEvent } from '../services/websocketService.js';

export const cameraRouter = Router();

// GET /api/camera/hotfolder - Check Canon EOS tethering hotfolder status
cameraRouter.get('/hotfolder', (req, res) => {
  res.json({
    success: true,
    data: hotfolderService.getStatus()
  });
});

// GET /api/camera/status - Check camera service health and capabilities
cameraRouter.get('/status', async (req, res, next) => {
  try {
    const status = await cameraManager.getStatus();
    res.json({ success: true, data: status });
  } catch (err) {
    next(err);
  }
});

// GET /api/camera/list - List all detected cameras (WebRTC & tethered)
cameraRouter.get('/list', async (req, res, next) => {
  try {
    const cameras = await cameraManager.getAvailableCameras();
    res.json({ success: true, data: cameras });
  } catch (err) {
    next(err);
  }
});

// POST /api/camera/select - Select active camera
cameraRouter.post('/select', async (req, res, next) => {
  try {
    const { deviceId } = req.body;
    if (!deviceId) {
      res.status(400).json({ success: false, message: 'deviceId is required' });
      return;
    }

    const success = await cameraManager.selectCamera(deviceId);
    broadcastEvent('camera_ready', { deviceId });

    res.json({ success, message: `Active camera set to ${deviceId}` });
  } catch (err) {
    next(err);
  }
});
