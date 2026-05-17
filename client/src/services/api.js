const BASE_URL = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('nyarai_token');
}

async function request(url, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });

  // Auto-logout on 401 (expired/invalid token)
  if (res.status === 401) {
    localStorage.removeItem('nyarai_token');
    localStorage.removeItem('nyarai_user');
    window.location.href = '/';
    return;
  }

  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Request failed');
  return data.data;
}

export const api = {
  // Dashboard
  getDashboard: () => request('/dashboard'),

  // Niches
  getNiches: () => request('/niches'),
  createNiche: (data) => request('/niches', { method: 'POST', body: JSON.stringify(data) }),
  deleteNiche: (id) => request(`/niches/${id}`, { method: 'DELETE' }),

  // Research
  researchContent: (nicheId, count = 10) =>
    request(`/research/${nicheId}`, { method: 'POST', body: JSON.stringify({ count }) }),

  // Content
  getContent: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request(`/content${params ? '?' + params : ''}`);
  },
  getContentById: (id) => request(`/content/${id}`),
  generateScript: (contentId) =>
    request('/content/generate-script', { method: 'POST', body: JSON.stringify({ content_id: contentId }) }),
  updateContent: (id, data) =>
    request(`/content/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteContent: (id) => request(`/content/${id}`, { method: 'DELETE' }),

  // Videos
  getVideos: (filters = {}) => {
    const params = new URLSearchParams(filters).toString();
    return request(`/videos${params ? '?' + params : ''}`);
  },
  composeVideo: (contentId) =>
    request('/videos/compose', { method: 'POST', body: JSON.stringify({ content_id: contentId }) }),

  // Schedules
  getSchedules: () => request('/schedules'),
  createSchedule: (data) => request('/schedules', { method: 'POST', body: JSON.stringify(data) }),
  toggleSchedule: (id, is_active) =>
    request(`/schedules/${id}/toggle`, { method: 'PATCH', body: JSON.stringify({ is_active }) }),

  // Scheduler Control (Phase 4)
  startScheduler: () => request('/scheduler/start', { method: 'POST' }),
  stopScheduler: () => request('/scheduler/stop', { method: 'POST' }),
  getSchedulerStatus: () => request('/scheduler/status'),
  triggerPipeline: (nicheId) =>
    request(`/scheduler/trigger/${nicheId}`, { method: 'POST' }),

  // Image Generation
  buildPrompt: (idea, size) =>
    request('/images/generate-prompt', { method: 'POST', body: JSON.stringify({ idea, size }) }),
  getImages: () => request('/images'),
  generateImage: (contentId, style) =>
    request('/images/generate', { method: 'POST', body: JSON.stringify({ content_id: contentId, style }) }),
  generateImageFromPrompt: (prompt) =>
    request('/images/generate', { method: 'POST', body: JSON.stringify({ custom_prompt: prompt }) }),
  generateMultipleImages: (contentId, count = 3) =>
    request('/images/generate-multiple', { method: 'POST', body: JSON.stringify({ content_id: contentId, count }) }),
  deleteImage: (filename) => request(`/images/${filename}`, { method: 'DELETE' }),
};

