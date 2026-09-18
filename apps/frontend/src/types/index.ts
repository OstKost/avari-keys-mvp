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

export type AuditLogCategory = 'auth' | 'keys' | 'profile' | 'admin';

export interface AuditLog {
  id: number;
  user_id?: number;
  username: string;
  action: string;
  category: AuditLogCategory;
  ip_address?: string;
  details?: string;
  created_at: string;
}

export interface PaginatedAuditLogsResponse {
  logs: AuditLog[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface AuditLogFilterParams {
  userId?: number;
  username?: string;
  category?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface CleanupLogsResponse {
  success: boolean;
  message: string;
  deleted_count: number;
}

export interface TopologyTrafficBreakdown {
  cascade_traffic_bytes: number;
  direct_traffic_bytes: number;
  cascade_traffic_formatted: string;
  direct_traffic_formatted: string;
  cascade_percentage: number;
  direct_percentage: number;
}

export interface NodeDashboardInfo {
  id: number;
  name: string;
  type: 'cascade' | 'direct';
  online: boolean;
  latency_ms: number;
  peer_count: number;
  total_traffic_formatted: string;
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  pending_users?: number;
  total_keys: number;
  active_devices_online: number;
  total_traffic_bytes: number;
  month_traffic_bytes: number;
  total_traffic_formatted: string;
  month_traffic_formatted: string;
  total_nodes: number;
  online_nodes: number;
  avg_latency_ms: number;
  system_status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  topology_breakdown: TopologyTrafficBreakdown;
  nodes: NodeDashboardInfo[];
  generated_at: string;
}


