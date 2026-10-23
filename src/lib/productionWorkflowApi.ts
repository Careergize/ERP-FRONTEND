import { api } from './api';
export async function workflowRequest<T>(path: string, data?: unknown): Promise<T> {
  try { return (data === undefined ? await api.get<T>(`/production-workflow/${path}`, { timeout: 15000 }) : await api.post<T>(`/production-workflow/${path}`, data, { timeout: 20000 })).data; }
  catch (cause) {
    const response = (cause as { response?: { status?: number; data?: unknown } }).response;
    const data = response?.data;
    if (response?.status === 404) {
      throw new Error('The configured API server does not provide this production workflow endpoint. Check VITE_API_BASE_URL and deploy the current Backend with /api/production-workflow/ routes, then retry. Your entries have been kept.');
    }
    // Proxy and Django error pages are HTML, not useful form validation messages.
    if (typeof data === 'string' && /^\s*</.test(data)) {
      throw new Error(`The production workflow server returned an unexpected error page${response?.status ? ` (HTTP ${response.status})` : ''}. Please retry or contact your administrator. Your entries have been kept.`);
    }
    throw new Error(data ? typeof data === 'string' ? data : JSON.stringify(data) : 'Unable to reach the production workflow server. Your entries have been kept; reload and retry.');
  }
}
