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
  created_at: string;
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
