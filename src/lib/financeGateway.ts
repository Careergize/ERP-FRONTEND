import { api } from './api';

export type FinanceAccess = { entitled: boolean; available: boolean };
export type FinanceStatus = {
  available: false;
  reason: string;
  connection: 'authenticated' | 'not_configured' | 'permission_denied' | 'unavailable' | 'timeout' | 'invalid_response';
  read_only: true;
  accounting_setup: 'not_assessed';
  posting_enabled: false;
};

export async function loadFinanceAccess(signal?: AbortSignal): Promise<FinanceAccess> {
  const { data } = await api.get('/auth/applications/', { signal, timeout: 10000 });
  if (typeof data?.finance?.entitled !== 'boolean' || typeof data?.finance?.available !== 'boolean') {
    throw new Error('Invalid application access response.');
  }
  return { entitled: data.finance.entitled, available: data.finance.available };
}

export async function loadFinanceStatus(signal?: AbortSignal): Promise<FinanceStatus> {
  const { data, status } = await api.get<FinanceStatus>('/finance/status/', {
    signal, timeout: 12000, validateStatus: status => status === 200 || status === 503,
  });
  if (data?.available !== false || data?.read_only !== true
    || data?.accounting_setup !== 'not_assessed' || data?.posting_enabled !== false
    || (data?.connection === 'authenticated' ? status !== 200 : status !== 503) || ![
    'authenticated', 'not_configured', 'permission_denied', 'unavailable', 'timeout', 'invalid_response',
  ].includes(data?.connection)) throw new Error('Invalid Finance status response.');
  return data;
}
