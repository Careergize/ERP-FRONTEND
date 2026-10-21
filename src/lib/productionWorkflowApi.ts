import { api } from './api';
export async function workflowRequest<T>(path: string, data?: unknown): Promise<T> {
  try { return (data === undefined ? await api.get<T>(`/production-workflow/${path}`, { timeout: 15000 }) : await api.post<T>(`/production-workflow/${path}`, data, { timeout: 20000 })).data; }
  catch (cause) {
    const data = (cause as { response?: { data?: unknown } }).response?.data;
    throw new Error(data ? typeof data === 'string' ? data : JSON.stringify(data) : 'Unable to reach the production workflow server. Your entries have been kept; reload and retry.');
  }
}
