export type PhotoMode = 'strip' | 'single' | 'collage' | 'group';

export type TemplateCategory = 'all' | 'minimal' | 'cute' | 'pastel' | 'birthday' | 'anniversary' | 'seasonal' | 'custom';

export interface PhotoSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  shotIndex?: number;
}

export interface Template {
  id: number;
  name_en: string;
  name_th: string;
  category: string;
  thumbnail_url: string;
  frame_url?: string;
  overlay_url?: string;
  bg_color: string;
  border_color: string;
  layout_type: string;
  photo_slots_json: string;
  canvas_width: number;
  canvas_height: number;
  is_active: number;
}

export interface Package {
  id: number;
  name_en: string;
  name_th: string;
  description_en: string;
  description_th: string;
  mode: PhotoMode;
  photo_count: number;
  is_active: number;
  display_order: number;
}

export interface CapturedPhoto {
  id: number;
  session_id: string;
  shot_index: number;
  file_path: string;
  original_filename: string;
  width: number;
  height: number;
  is_selected: number;
  sort_order: number;
  dataUrl?: string; // in-memory preview
  created_at: string;
}

export interface FinalPhoto {
  id: number;
  session_id: string;
  template_id?: number;
  jpgUrl: string;
  pngUrl: string;
  thumbnailUrl: string;
  gifUrl?: string;
  width: number;
  height: number;
  dpi: number;
  created_at: string;
}

export interface PrintJob {
  jobId: number;
  sessionId: string;
  printerName: string;
  copies: number;
  paperSize: string;
  orientation: string;
  status: 'submitted' | 'printing' | 'completed' | 'failed';
  message?: string;
  submittedAt: string;
}

export interface Session {
  id: string;
  session_code: string;
  mode: PhotoMode;
  template_id?: number;
  status: string;
  language: string;
  photo_count: number;
  print_count: number;
  created_at: string;
  completed_at?: string;
  capturedPhotos?: CapturedPhoto[];
  finalPhoto?: FinalPhoto;
  printJobs?: PrintJob[];
}

export interface PhotoEditState {
  filter: 'original' | 'bw' | 'warm' | 'cool' | 'vintage';
  brightness: number; // 0.5 to 1.5
  contrast: number;   // 0.5 to 1.5
  saturation: number; // 0.0 to 2.0
  rotation: number;   // 0, 90, 180, 270
}

export interface StickerItem {
  id: string;
  name: string;
  icon: string;
  x: number;
  y: number;
  size: number;
}

export interface TextOverlayItem {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

export interface SystemSettings {
  business_name?: string;
  business_tagline?: string;
  countdown_seconds?: string;
  session_timeout_seconds?: string;
  completion_timeout_seconds?: string;
  retention_days?: string;
  qr_expiration_hours?: string;
  default_printer?: string;
  default_paper_size?: string;
  default_copies?: string;
  sound_enabled?: string;
  flash_enabled?: string;
  default_language?: string;
  server_lan_ip?: string;
  server_port?: string;
  kiosk_port?: string;
  [key: string]: string | undefined;
}
