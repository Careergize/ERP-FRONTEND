type ApiFailure = {
  response?: { status?: number; data?: unknown };
  config?: { url?: string };
};

export function financeErrorMessage(error: unknown): string {
  const failure = error as ApiFailure | null;
  const status = failure?.response?.status;
  const data = failure?.response?.data;
  let endpoint = '';
  try {
    if (failure?.config?.url) endpoint = new URL(failure.config.url, 'http://local.invalid').pathname;
  } catch { /* An invalid request URL should not hide the original error. */ }
  const request = endpoint ? ` Request: ${endpoint}.` : '';
  if (typeof data === 'object' && data !== null && 'detail' in data && typeof data.detail === 'string') {
    return data.detail + request;
  }
  if (status && status >= 500) {
    return `The accounting server could not complete this request (HTTP ${status}).${request} Check the backend logs and confirm its database migrations are applied, then retry.`;
  }
  if (typeof data === 'string' && /<(?:!doctype|html|head|body)\b/i.test(data)) {
    return `The server returned an HTML error page${status ? ` (HTTP ${status})` : ''}.${request} Check the backend logs for the cause.`;
  }
  if (data !== undefined && data !== null) return typeof data === 'string' ? data : JSON.stringify(data);
  return error instanceof Error ? error.message : 'Request failed. Please retry.';
}
