export type UserRole = 'admin' | 'user';

export interface User {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface NodePublic {
  id: number;
  name: string;
  type: 'cascade' | 'direct';
  is_active: boolean;
  created_at: string;
}

export interface AdminNode {
  id: number;
  name: string;
  type: 'cascade' | 'direct';
  api_url: string;
  is_active: boolean;
  online: boolean;
  latency_ms?: number;
  created_at: string;
}

export interface ClientConfigSummary {
  id: number;
  user_id: number;
  node_id: number;
  client_name: string;
  device_name: string;
  node_name?: string;
  node_type?: 'cascade' | 'direct';
  last_handshake?: string;
  total_traffic_bytes?: number;
  month_traffic_bytes?: number;
  total_traffic_formatted?: string;
  month_traffic_formatted?: string;
  created_at: string;
}

export interface PaginatedKeysResponse {
  keys: ClientConfigSummary[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ClientConfigDetail {
  id: number;
  client_name: string;
  device_name: string;
  node_id: number;
  node_name: string;
  node_type: 'cascade' | 'direct';
  config: string;
  qr_code?: string;
  created_at: string;
}
