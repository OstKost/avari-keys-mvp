import { User, NodePublic, AdminNode, ClientConfigSummary, ClientConfigDetail } from '../types';
import { mockApi } from './mockClient';

const API_BASE = '/api/v1';

// Check if Mock mode is active (via env var or localStorage)
export const isMockMode = (): boolean => {
  return (
    import.meta.env.VITE_USE_MOCK === 'true' ||
    localStorage.getItem('use_mock_mode') === 'true'
  );
};

export const setMockMode = (enabled: boolean) => {
  if (enabled) {
    localStorage.setItem('use_mock_mode', 'true');
  } else {
    localStorage.removeItem('use_mock_mode');
  }
};

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const data = await res.json();
      if (data && data.error) {
        errorMsg = data.error;
      }
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

const realApi = {
  // Auth
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await handleResponse<{ token: string; user: User }>(res);
    localStorage.setItem('token', data.token);
    return data;
  },

  async register(username: string, password: string): Promise<{ message: string; user: User }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return handleResponse<{ message: string; user: User }>(res);
  },

  async getMe(): Promise<User> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<User>(res);
  },

  logout() {
    localStorage.removeItem('token');
  },

  // User: Nodes & Keys
  async getNodes(): Promise<NodePublic[]> {
    const res = await fetch(`${API_BASE}/nodes`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<NodePublic[]>(res);
  },

  async getKeys(): Promise<ClientConfigSummary[]> {
    const res = await fetch(`${API_BASE}/keys`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ClientConfigSummary[]>(res);
  },

  async createKey(nodeId: number, deviceName: string): Promise<ClientConfigDetail> {
    const res = await fetch(`${API_BASE}/keys`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ node_id: nodeId, device_name: deviceName }),
    });
    return handleResponse<ClientConfigDetail>(res);
  },

  async getKey(id: number): Promise<ClientConfigDetail> {
    const res = await fetch(`${API_BASE}/keys/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ClientConfigDetail>(res);
  },

  async deleteKey(id: number): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/keys/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  // Admin
  async getAdminUsers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<User[]>(res);
  },

  async activateUser(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/admin/users/${id}/activate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async deactivateUser(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/admin/users/${id}/deactivate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async deleteUser(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/admin/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async getAdminNodes(): Promise<AdminNode[]> {
    const res = await fetch(`${API_BASE}/admin/nodes`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<AdminNode[]>(res);
  },

  async addAdminNode(name: string, type: 'cascade' | 'direct', apiUrl: string, apiKey: string): Promise<AdminNode> {
    const res = await fetch(`${API_BASE}/admin/nodes`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, type, api_url: apiUrl, api_key: apiKey }),
    });
    return handleResponse<AdminNode>(res);
  },

  async deleteAdminNode(id: number): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/admin/nodes/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async getAdminKeys(): Promise<ClientConfigSummary[]> {
    const res = await fetch(`${API_BASE}/admin/keys`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ClientConfigSummary[]>(res);
  },
};

// Dispatcher API: delegates to mockApi or realApi
export const api = new Proxy(realApi, {
  get(target, prop: keyof typeof realApi) {
    if (isMockMode()) {
      return mockApi[prop] || target[prop];
    }
    return target[prop];
  },
});
