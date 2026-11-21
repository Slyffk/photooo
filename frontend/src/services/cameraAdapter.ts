export interface VideoDeviceInfo {
  deviceId: string;
  label: string;
}

export interface CameraStreamResult {
  success: boolean;
  isSimulated: boolean;
  devices: VideoDeviceInfo[];
  activeDeviceId?: string;
  error?: string;
  permissionDenied?: boolean;
}

export class CameraAdapter {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private simulatedInterval: number | null = null;
  private isSimulated = false;

  /**
   * Enumerate available video input devices
   */
  async listVideoDevices(): Promise<VideoDeviceInfo[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return [{ deviceId: 'simulated-camera', label: 'Simulated Studio Camera (Kiosk Test)' }];
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d, index) => ({
          deviceId: d.deviceId || `camera-${index}`,
          label: d.label || `Camera ${index + 1}`
        }));

      return videoDevices;
    } catch (err) {
      console.warn('Could not enumerate video devices:', err);
      return [];
    }
  }

  /**
   * Start video stream with WebRTC getUserMedia, fallback to simulator ONLY if real camera fails
   */
  async startStream(
    videoEl: HTMLVideoElement,
    deviceId?: string,
    idealWidth = 1920,
    idealHeight = 1080
  ): Promise<CameraStreamResult> {
    this.stopStream();
    this.videoElement = videoEl;

    // Only force simulator if explicitly requested
    if (deviceId === 'simulated-camera') {
      this.startSimulatedFeed(videoEl, idealWidth, idealHeight);
      return {
        success: true,
        isSimulated: true,
        devices: [{ deviceId: 'simulated-camera', label: 'Simulated Studio Camera' }]
      };
    }

    // Prepare constraints: use ideal deviceId if provided, otherwise general video constraint
    const videoConstraints: MediaTrackConstraints = {
      width: { ideal: idealWidth },
      height: { ideal: idealHeight }
    };

    if (deviceId && deviceId !== 'auto' && deviceId !== 'default-webcam') {
      videoConstraints.deviceId = { ideal: deviceId };
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('WebRTC getUserMedia not supported in this browser environment');
      }

      let stream: MediaStream | null = null;

      // 1. First attempt with requested constraints
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: videoConstraints
        });
      } catch (firstErr: any) {
        console.warn('First getUserMedia attempt failed, retrying with basic video constraint:', firstErr);
        // 2. Fallback to basic { video: true } in case resolution or deviceId was overconstrained
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true
        });
      }

      this.stream = stream;
      videoEl.srcObject = stream;
      await videoEl.play();
      this.isSimulated = false;

      // Query devices now that permission is granted
      const devices = await this.listVideoDevices();
      const activeTrack = stream.getVideoTracks()[0];
      const activeSettings = activeTrack ? activeTrack.getSettings() : undefined;
      const activeDeviceId = activeSettings?.deviceId || (devices[0]?.deviceId ?? '');

      return {
        success: true,
        isSimulated: false,
        devices: devices.length > 0 ? devices : [{ deviceId: activeDeviceId, label: activeTrack?.label || 'USB Camera' }],
        activeDeviceId
      };
    } catch (err: any) {
      console.warn('Real camera error:', err);

      const isPermissionDenied =
        err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';

      // Fallback to studio test simulator
      this.startSimulatedFeed(videoEl, idealWidth, idealHeight);

      return {
        success: false,
        isSimulated: true,
        devices: [{ deviceId: 'simulated-camera', label: 'Simulated Studio Camera (Fallback)' }],
        error: err?.message || 'Camera access failed',
        permissionDenied: isPermissionDenied
      };
    }
  }

  /**
   * Capture current frame from live stream or simulated feed as JPEG base64 Data URL
   */
  captureFrame(): string {
    if (!this.canvasElement) {
      this.canvasElement = document.createElement('canvas');
    }

    const canvas = this.canvasElement;
    const video = this.videoElement;

    if (!video) {
      throw new Error('Video element not initialized for capture');
    }

    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D canvas context');
    }

    // Un-mirror image if it was mirrored for user preview
    ctx.save();
    ctx.drawImage(video, 0, 0, width, height);
    ctx.restore();

    return canvas.toDataURL('image/jpeg', 0.95);
  }

  /**
   * Stop active camera stream and release hardware
   */
  stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.simulatedInterval) {
      clearInterval(this.simulatedInterval);
      this.simulatedInterval = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.isSimulated = false;
  }

  getIsSimulated(): boolean {
    return this.isSimulated;
  }

  /**
   * Real-time canvas-driven studio simulator generator
   */
  private startSimulatedFeed(videoEl: HTMLVideoElement, width = 1280, height = 720): void {
    this.isSimulated = true;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    let frame = 0;
    const drawSimulatedFrame = () => {
      frame++;
      // Warm photobooth studio backdrop gradient
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#FFF5F0');
      grad.addColorStop(0.5, '#FCEADE');
      grad.addColorStop(1, '#EFEAFF');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Studio grid lines
      ctx.strokeStyle = 'rgba(0,0,0,0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Animated studio subject silhouette
      const time = Date.now() / 1000;
      const bob = Math.sin(time * 2) * 8;
      const centerX = width / 2;
      const centerY = height / 2 + 30 + bob;

      // Body
      ctx.fillStyle = '#C8B6A6';
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 140, 160, 100, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#E8D5C8';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 90, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = '#4A3B32';
      ctx.beginPath();
      ctx.arc(centerX, centerY - 25, 95, Math.PI, Math.PI * 2);
      ctx.fill();

      // Happy smiling eyes
      ctx.strokeStyle = '#2D2D2D';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(centerX - 35, centerY - 10, 16, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX + 35, centerY - 10, 16, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();

      // Smile
      ctx.beginPath();
      ctx.arc(centerX, centerY + 25, 32, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.stroke();

      // Cheeks
      ctx.fillStyle = 'rgba(255, 140, 160, 0.45)';
      ctx.beginPath();
      ctx.arc(centerX - 50, centerY + 15, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX + 50, centerY + 15, 16, 0, Math.PI * 2);
      ctx.fill();

      // Live banner
      ctx.fillStyle = 'rgba(26, 26, 26, 0.8)';
      ctx.roundRect(width / 2 - 200, 40, 400, 46, 23);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('📷 STUDIO TEST PREVIEW (SIMULATED FEED)', width / 2, 70);

      // Live timestamp
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.font = '14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(new Date().toLocaleTimeString(), width - 30, height - 25);
    };

    const stream = (canvas as any).captureStream(30);
    this.stream = stream;
    videoEl.srcObject = stream;
    videoEl.play().catch(() => {});

    this.simulatedInterval = window.setInterval(drawSimulatedFrame, 1000 / 30);
  }
}

export const cameraAdapter = new CameraAdapter();
