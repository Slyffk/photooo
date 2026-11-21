import type {
  Session,
  Template,
  Package,
  CapturedPhoto,
  FinalPhoto,
  PrintJob,
  SystemSettings
} from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('haru_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...options.headers
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'API request failed');
  }

  return json.data;
}

export const api = {
  // Sessions
  createSession: (mode: string = 'strip', language: string = 'th', photoCount: number = 4) =>
    request<Session>('/sessions', {
      method: 'POST',
      body: JSON.stringify({ mode, language, photoCount })
    }),

  getSession: (id: string) => request<Session>(`/sessions/${id}`),

  updateSession: (id: string, updates: Partial<Session> & { templateId?: number }) =>
    request<Session>(`/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    }),

  resetSession: (id: string) =>
    request<{ message: string }>(`/sessions/${id}/reset`, { method: 'POST' }),

  // Photos
  uploadCapturedPhoto: (sessionId: string, shotIndex: number, imageBase64: string, width?: number, height?: number) =>
    request<CapturedPhoto>('/photos/upload', {
      method: 'POST',
      body: JSON.stringify({ sessionId, shotIndex, imageBase64, width, height })
    }),

  getSessionPhotos: (sessionId: string) =>
    request<CapturedPhoto[]>(`/photos/session/${sessionId}`),

  deletePhoto: (id: number) =>
    request<{ message: string }>(`/photos/${id}`, { method: 'DELETE' }),

  reorderPhotos: (photoOrders: Array<{ id: number; sortOrder: number }>) =>
    request<{ message: string }>('/photos/reorder', {
      method: 'POST',
      body: JSON.stringify({ photoOrders })
    }),

  composePhoto: (payload: {
    sessionId: string;
    templateId?: number;
    mode?: string;
    editOptions?: any;
    stickers?: any[];
    textOverlays?: any[];
    brandText?: string;
    slotAssignments?: number[] | Record<number, number>;
    copies?: number;
    autoPrint?: boolean;
  }) =>
    request<FinalPhoto>('/photos/compose', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getFinalPhoto: (sessionId: string) =>
    request<FinalPhoto>(`/photos/final/${sessionId}`),

  // Templates
  getTemplates: (category?: string, activeOnly = true) =>
    request<Template[]>(`/templates?activeOnly=${activeOnly}${category ? `&category=${category}` : ''}`),

  getTemplate: (id: number) => request<Template>(`/templates/${id}`),

  createTemplate: (data: Partial<Template>) =>
    request<Template>('/templates', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updateTemplate: (id: number, data: Partial<Template>) =>
    request<Template>(`/templates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deleteTemplate: (id: number) =>
    request<{ message: string }>(`/templates/${id}`, { method: 'DELETE' }),

  // Packages
  getPackages: (activeOnly = true) =>
    request<Package[]>(`/packages?activeOnly=${activeOnly}`),

  createPackage: (data: Partial<Package>) =>
    request<Package>('/packages', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  updatePackage: (id: number, data: Partial<Package>) =>
    request<Package>(`/packages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  deletePackage: (id: number) =>
    request<{ message: string }>(`/packages/${id}`, { method: 'DELETE' }),

  // Camera
  getCameraStatus: () => request<any>('/camera/status'),
  getCameraList: () => request<any[]>('/camera/list'),
  selectCamera: (deviceId: string) =>
    request<any>('/camera/select', {
      method: 'POST',
      body: JSON.stringify({ deviceId })
    }),

  // Print
  getPrinters: () => request<{ printers: any[]; defaultPrinter: string }>('/print/printers'),

  submitPrintJob: (payload: {
    sessionId: string;
    copies?: number;
    paperSize?: string;
    orientation?: string;
    printerName?: string;
  }) =>
    request<PrintJob>('/print/submit', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  getPrintStatus: (jobId: number) => request<PrintJob>(`/print/status/${jobId}`),

  runTestPrint: (printerName?: string) =>
    request<PrintJob>('/print/test', {
      method: 'POST',
      body: JSON.stringify({ printerName })
    }),

  reprintSession: (sessionId: string, copies = 1, printerName?: string) =>
    request<PrintJob>('/print/reprint', {
      method: 'POST',
      body: JSON.stringify({ sessionId, copies, printerName })
    }),

  getPrintHistory: () => request<any[]>('/print/history'),

  // QR Download
  createDownloadToken: (sessionId: string) =>
    request<{ token: string; downloadUrl: string; qrDataUrl: string; expiresAt: string }>('/download/create', {
      method: 'POST',
      body: JSON.stringify({ sessionId })
    }),

  // Admin
  adminLogin: (username: string, password: string) =>
    request<{ token: string; user: any }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    }),

  getAdminMe: () => request<any>('/admin/me'),

  getDashboardStats: () => request<any>('/admin/dashboard'),

  getAdminSessions: (params: { search?: string; mode?: string; status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.mode) query.set('mode', params.mode);
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    return request<{ sessions: any[]; pagination: any }>(`/admin/sessions?${query.toString()}`);
  },

  deleteAdminSession: (id: string) =>
    request<{ message: string }>(`/admin/sessions/${id}`, { method: 'DELETE' }),

  getAdminReports: () => request<any>('/admin/reports'),

  // Settings
  getSettings: () => request<{ settings: SystemSettings; details: any[] }>('/settings'),

  updateSettings: (settings: SystemSettings) =>
    request<{ message: string }>('/settings', {
      method: 'PUT',
      body: JSON.stringify({ settings })
    })
};
