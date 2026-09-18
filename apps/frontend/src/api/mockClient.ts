import {
  User,
  NodePublic,
  AdminNode,
  ClientConfigSummary,
  ClientConfigDetail,
  PaginatedKeysResponse,
  AuditLog,
  PaginatedAuditLogsResponse,
  AuditLogFilterParams,
  CleanupLogsResponse,
  DashboardStats,
} from '../types';

// In-memory mock storage for standalone FE development
let mockUsers: User[] = [
  {
    id: 1,
    username: 'Forve',
    role: 'admin',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 2,
    username: 'alice',
    role: 'user',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 3,
    username: 'bob_new',
    role: 'user',
    is_active: false,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
];

let mockLogs: AuditLog[] = [
  {
    id: 1,
    user_id: 1,
    username: 'Forve',
    action: 'auth_login',
    category: 'auth',
    ip_address: '192.168.1.10',
    details: 'Успешная авторизация в системе',
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 2,
    user_id: 1,
    username: 'Forve',
    action: 'admin_user_activate',
    category: 'admin',
    ip_address: '192.168.1.10',
    details: 'Активирован доступ для пользователя «alice» (ID #2)',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 3,
    user_id: 2,
    username: 'alice',
    action: 'auth_login',
    category: 'auth',
    ip_address: '178.62.204.15',
    details: 'Успешная авторизация в системе',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 4,
    user_id: 2,
    username: 'alice',
    action: 'key_create',
    category: 'keys',
    ip_address: '178.62.204.15',
    details: 'Создан VPN-ключ «iPhone 15» (u2_iphone15) на сервере «Каскад M0 -> S1»',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
  },
  {
    id: 5,
    user_id: 2,
    username: 'alice',
    action: 'key_view',
    category: 'keys',
    ip_address: '178.62.204.15',
    details: 'Просмотр конфигурации / QR-кода ключа «iPhone 15» (u2_iphone15)',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 3 + 1000 * 30).toISOString(),
  },
  {
    id: 6,
    user_id: 3,
    username: 'bob_new',
    action: 'auth_register',
    category: 'auth',
    ip_address: '94.25.180.44',
    details: 'Регистрация нового аккаунта (ожидает подтверждения администратора)',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
  },
  {
    id: 7,
    user_id: 3,
    username: 'bob_new',
    action: 'auth_login_blocked',
    category: 'auth',
    ip_address: '94.25.180.44',
    details: 'Попытка входа в неактивированный аккаунт',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 11).toISOString(),
  },
  {
    id: 8,
    user_id: 1,
    username: 'Forve',
    action: 'admin_node_restart',
    category: 'admin',
    ip_address: '192.168.1.10',
    details: 'Перезапущен сервис AmneziaWG на узле «Каскад M0 -> S1»',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 9,
    user_id: 1,
    username: 'Forve',
    action: 'admin_node_backup',
    category: 'admin',
    ip_address: '192.168.1.10',
    details: 'Выгружена резервная копия конфигурации узла «Прямой S2»',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  },
  {
    id: 10,
    user_id: 1,
    username: 'Forve',
    action: 'profile_update',
    category: 'profile',
    ip_address: '192.168.1.10',
    details: 'Обновлены учетные данные профиля',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
  },
];

let mockCurrentUser: User = mockUsers[0];

let mockNodes: AdminNode[] = [
  {
    id: 1,
    name: 'Каскад M0 (Москва) -> S1 (Амстердам)',
    type: 'cascade',
    api_url: 'http://127.0.0.1:8081',
    is_mobile_optimized: true,
    is_active: true,
    online: true,
    latency_ms: 24,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 2,
    name: 'Прямой туннель S2 (Франкфурт)',
    type: 'direct',
    api_url: 'http://127.0.0.1:8082',
    is_mobile_optimized: false,
    is_active: true,
    online: true,
    latency_ms: 38,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

let mockKeys: (ClientConfigDetail & {
  user_id: number;
  last_handshake?: string;
  total_traffic_bytes?: number;
  month_traffic_bytes?: number;
  total_traffic_formatted?: string;
  month_traffic_formatted?: string;
})[] = [
  {
    id: 1,
    user_id: 1, // Forve Admin
    client_name: 'u1_iphone15',
    device_name: 'iphone_15_pro',
    node_id: 1,
    node_name: 'Каскад M0 (Москва) -> S1 (Амстердам)',
    node_type: 'cascade',
    last_handshake: '3 минуты назад',
    total_traffic_bytes: 1520435200,
    month_traffic_bytes: 1520435200,
    total_traffic_formatted: '1.42 GB',
    month_traffic_formatted: '1.42 GB',
    config: `[Interface]
Address = 10.7.0.3/32
PrivateKey = aMockPrivateKeyForDemoPurposesOnly1234567=
Jc = 4
Jmin = 40
Jmax = 70
S1 = 15
S2 = 25
H1 = 1
H2 = 2
H3 = 3
H4 = 4

[Peer]
PublicKey = aMockServerPublicKeyForDemoPurposes8901234=
Endpoint = 198.51.100.1:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 2,
    user_id: 1, // Forve Admin
    client_name: 'u1_macbook',
    device_name: 'macbook_m3_max',
    node_id: 2,
    node_name: 'Прямой туннель S2 (Франкфурт)',
    node_type: 'direct',
    last_handshake: '42 минуты назад',
    total_traffic_bytes: 471859200,
    month_traffic_bytes: 471859200,
    total_traffic_formatted: '450.00 MB',
    month_traffic_formatted: '450.00 MB',
    config: `[Interface]
Address = 10.8.0.4/32
PrivateKey = aMockPrivateKeyDirectTunnelMacBook7654321=
Jc = 3
Jmin = 50
Jmax = 80
S1 = 20
S2 = 30
H1 = 1
H2 = 2
H3 = 3
H4 = 4

[Peer]
PublicKey = aMockServerPublicKeyDirectTunnel1234567=
Endpoint = 203.0.113.50:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: 3,
    user_id: 2, // Alice User
    client_name: 'u2_alice_phone',
    device_name: 'alice_iphone14',
    node_id: 1,
    node_name: 'Каскад M0 (Москва) -> S1 (Амстердам)',
    node_type: 'cascade',
    last_handshake: '2 часа назад',
    total_traffic_bytes: 93323264,
    month_traffic_bytes: 93323264,
    total_traffic_formatted: '89.00 MB',
    month_traffic_formatted: '89.00 MB',
    config: `[Interface]
Address = 10.7.0.5/32
PrivateKey = aMockAlicePrivateKeyCascade99887766=
Jc = 4
Jmin = 40
Jmax = 70
S1 = 15
S2 = 25
H1 = 1
H2 = 2
H3 = 3
H4 = 4

[Peer]
PublicKey = aMockServerPublicKeyForDemoPurposes8901234=
Endpoint = 198.51.100.1:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export const mockApi = {
  async login(username: string, _password: string): Promise<{ token: string; user: User }> {
    const user = mockUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      throw new Error('Пользователь не найден (в Mock режиме)');
    }
    if (!user.is_active) {
      throw new Error('Учетная запись ожидает подтверждения администратором.');
    }
    mockCurrentUser = user;
    localStorage.setItem('token', 'mock-jwt-token-' + user.username);
    return { token: 'mock-jwt-token-' + user.username, user };
  },

  async setDemoUser(username: string): Promise<User> {
    const user = mockUsers.find((u) => u.username.toLowerCase() === username.toLowerCase());
    if (user) {
      mockCurrentUser = user;
      localStorage.setItem('token', 'mock-jwt-token-' + user.username);
      return user;
    }
    return mockCurrentUser;
  },

  async register(username: string, _password: string): Promise<{ message: string; user: User }> {
    const newUser: User = {
      id: mockUsers.length + 1,
      username,
      role: 'user',
      is_active: false,
      created_at: new Date().toISOString(),
    };
    mockUsers.push(newUser);
    return { message: 'Регистрация успешна, ожидайте модерации', user: newUser };
  },

  async getMe(): Promise<User> {
    return mockCurrentUser;
  },

  async updateProfile(data: { username?: string; password?: string }): Promise<{ token: string; user: User }> {
    if (data.username) {
      mockCurrentUser.username = data.username;
      const found = mockUsers.find((u) => u.id === mockCurrentUser.id);
      if (found) found.username = data.username;
    }
    return {
      token: 'mock-jwt-token-' + mockCurrentUser.username,
      user: { ...mockCurrentUser },
    };
  },

  logout() {
    localStorage.removeItem('token');
  },

  async getNodes(): Promise<NodePublic[]> {
    return mockNodes.map((n) => ({
      id: n.id,
      name: n.name,
      type: n.type,
      is_active: n.is_active,
      created_at: n.created_at,
    }));
  },

  async getKeys(): Promise<ClientConfigSummary[]> {
    return mockKeys
      .filter((k) => k.user_id === mockCurrentUser.id)
      .map((k) => ({
        id: k.id,
        user_id: k.user_id,
        node_id: k.node_id,
        client_name: k.client_name,
        device_name: k.device_name,
        node_name: k.node_name,
        node_type: k.node_type,
        last_handshake: k.last_handshake || '10 минут назад',
        total_traffic_bytes: k.total_traffic_bytes || 524288000,
        month_traffic_bytes: k.month_traffic_bytes || 524288000,
        total_traffic_formatted: k.total_traffic_formatted || '500.00 MB',
        month_traffic_formatted: k.month_traffic_formatted || '500.00 MB',
        created_at: k.created_at,
      }));
  },

  async createKey(nodeId: number, deviceName: string, psk?: boolean): Promise<ClientConfigDetail> {
    const node = mockNodes.find((n) => n.id === nodeId);
    const nodeName = node ? node.name : 'Unknown Node';
    const nodeType = node ? node.type : 'direct';
    const id = mockKeys.length + 1;
    const clientName = `u${mockCurrentUser.id}_${deviceName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;
    const pskLine = psk ? '\nPresharedKey = aMockPresharedKeyForShadowrocket12345=' : '';

    const config = `[Interface]
Address = 10.${nodeType === 'cascade' ? '7' : '8'}.0.${id + 4}/32
PrivateKey = aMockGeneratedPrivateKeyForDemo_${clientName}=
Jc = 4
Jmin = 40
Jmax = 70
S1 = 15
S2 = 25
H1 = 1
H2 = 2
H3 = 3
H4 = 4

[Peer]
PublicKey = aMockServerPublicKeyForNode_${nodeId}=${pskLine}
Endpoint = 198.51.100.${nodeId}:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`;

    const newKeyDetail: ClientConfigDetail & { user_id: number } = {
      id,
      user_id: mockCurrentUser.id,
      client_name: clientName,
      device_name: deviceName,
      node_id: nodeId,
      node_name: nodeName,
      node_type: nodeType,
      config,
      created_at: new Date().toISOString(),
    };

    mockKeys.unshift(newKeyDetail);
    return newKeyDetail;
  },

  async getKey(id: number): Promise<ClientConfigDetail> {
    const key = mockKeys.find((k) => k.id === id);
    if (!key) throw new Error('Ключ не найден');
    return key;
  },

  async deleteKey(id: number): Promise<{ success: boolean; message: string }> {
    mockKeys = mockKeys.filter((k) => k.id !== id);
    return { success: true, message: 'Ключ успешно удален' };
  },

  // Admin
  async getAdminUsers(): Promise<User[]> {
    return [...mockUsers];
  },

  async activateUser(id: number): Promise<{ success: boolean }> {
    const user = mockUsers.find((u) => u.id === id);
    if (user) user.is_active = true;
    return { success: true };
  },

  async deactivateUser(id: number): Promise<{ success: boolean }> {
    const user = mockUsers.find((u) => u.id === id);
    if (user) user.is_active = false;
    return { success: true };
  },

  async setUserRole(id: number, role: 'admin' | 'user'): Promise<{ success: boolean; message: string }> {
    const user = mockUsers.find((u) => u.id === id);
    if (user) {
      user.role = role;
      if (mockCurrentUser.id === id) {
        mockCurrentUser.role = role;
      }
    }
    return { success: true, message: `Роль изменена на ${role}` };
  },

  async deleteUser(id: number): Promise<{ success: boolean }> {
    mockUsers = mockUsers.filter((u) => u.id !== id);
    return { success: true };
  },

  async getAdminNodes(): Promise<AdminNode[]> {
    // Simulate minor ping variance
    return mockNodes.map((n) => ({
      ...n,
      latency_ms: n.online ? Math.floor(20 + Math.random() * 25) : undefined,
    }));
  },

  async addAdminNode(name: string, type: 'cascade' | 'direct', apiUrl: string, _apiKey: string, isMobileOptimized?: boolean): Promise<AdminNode> {
    const newNode: AdminNode = {
      id: mockNodes.length + 1,
      name,
      type,
      api_url: apiUrl,
      is_mobile_optimized: Boolean(isMobileOptimized),
      is_active: true,
      online: true,
      latency_ms: Math.floor(20 + Math.random() * 20),
      created_at: new Date().toISOString(),
    };
    mockNodes.push(newNode);
    return newNode;
  },

  async deleteAdminNode(id: number): Promise<{ success: boolean }> {
    mockNodes = mockNodes.filter((n) => n.id !== id);
    return { success: true };
  },

  async restartNode(id: number): Promise<{ success: boolean; message: string }> {
    await new Promise((resolve) => setTimeout(resolve, 800)); // simulate brief restart time
    const node = mockNodes.find((n) => n.id === id);
    return {
      success: true,
      message: `Сервис AmneziaWG на ноде "${node?.name || id}" успешно перезапущен`,
    };
  },

  async backupNode(id: number): Promise<{ timestamp: string; backup_data: string }> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      timestamp: new Date().toISOString(),
      backup_data: `UEsDBBQAAAAIAAWG...mock_tar_gz_backup_data_for_node_${id}...`,
    };
  },

  async restoreNode(id: number, _backupData: string): Promise<{ success: boolean; message: string }> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const node = mockNodes.find((n) => n.id === id);
    return {
      success: true,
      message: `Конфигурация ноды "${node?.name || id}" успешно восстановлена из резервной копии`,
    };
  },

  async getAdminKeys(params?: {
    search?: string;
    nodeId?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedKeysResponse> {
    let filtered = [...mockKeys];

    if (params?.nodeId) {
      filtered = filtered.filter((k) => k.node_id === params.nodeId);
    }

    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (k) =>
          k.device_name.toLowerCase().includes(q) ||
          k.client_name.toLowerCase().includes(q) ||
          (k.node_name && k.node_name.toLowerCase().includes(q))
      );
    }

    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 10;
    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    const startIndex = (page - 1) * limit;
    const paged = filtered.slice(startIndex, startIndex + limit).map((k) => ({
      id: k.id,
      user_id: k.user_id,
      node_id: k.node_id,
      client_name: k.client_name,
      device_name: k.device_name,
      node_name: k.node_name,
      node_type: k.node_type,
      last_handshake: k.last_handshake || '5 минут назад',
      total_traffic_bytes: k.total_traffic_bytes || 524288000,
      month_traffic_bytes: k.month_traffic_bytes || 524288000,
      total_traffic_formatted: k.total_traffic_formatted || '500.00 MB',
      month_traffic_formatted: k.month_traffic_formatted || '500.00 MB',
      created_at: k.created_at,
    }));

    return {
      keys: paged,
      total_count: totalCount,
      page,
      limit,
      total_pages: totalPages,
    };
  },

  async getAdminAuditLogs(params?: AuditLogFilterParams): Promise<PaginatedAuditLogsResponse> {
    let filtered = [...mockLogs];

    if (params?.userId) {
      filtered = filtered.filter((l) => l.user_id === params.userId);
    }

    if (params?.username) {
      const u = params.username.toLowerCase().trim();
      filtered = filtered.filter((l) => l.username.toLowerCase().includes(u));
    }

    if (params?.category) {
      filtered = filtered.filter((l) => l.category === params.category);
    }

    if (params?.action) {
      filtered = filtered.filter((l) => l.action === params.action);
    }

    if (params?.from) {
      const fromTime = new Date(params.from).getTime();
      filtered = filtered.filter((l) => new Date(l.created_at).getTime() >= fromTime);
    }

    if (params?.to) {
      const toTime = new Date(params.to).getTime() + 86400000; // end of day
      filtered = filtered.filter((l) => new Date(l.created_at).getTime() <= toTime);
    }

    const page = params?.page && params.page > 0 ? params.page : 1;
    const limit = params?.limit && params.limit > 0 ? params.limit : 50;
    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / limit));

    const startIndex = (page - 1) * limit;
    const paged = filtered.slice(startIndex, startIndex + limit);

    return {
      logs: paged,
      total_count: totalCount,
      page,
      limit,
      total_pages: totalPages,
    };
  },

  async cleanupAdminAuditLogs(days: number = 90): Promise<CleanupLogsResponse> {
    const cutoff = Date.now() - days * 86400000;
    const beforeCount = mockLogs.length;
    mockLogs = mockLogs.filter((l) => new Date(l.created_at).getTime() >= cutoff);
    const deleted = beforeCount - mockLogs.length;

    // Log the cleanup action in mock
    mockLogs.unshift({
      id: mockLogs.length + 1,
      user_id: mockCurrentUser.id,
      username: mockCurrentUser.username,
      action: 'admin_logs_cleanup',
      category: 'admin',
      ip_address: '127.0.0.1',
      details: `Очищен журнал аудита старше ${days} дней (удалено записей: ${deleted})`,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      message: `Успешно удалено записей старше ${days} дней: ${deleted}`,
      deleted_count: deleted,
    };
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const totalUsers = mockUsers.length;
    const activeUsers = mockUsers.filter((u) => u.is_active).length;
    const pendingUsers = mockUsers.filter((u) => !u.is_active).length;
    const totalKeys = mockKeys.length;
    const activeDevicesOnline = mockKeys.filter(
      (k) => k.last_handshake && !k.last_handshake.includes('Не')
    ).length;

    let totalTrafficBytes = 0;
    let monthTrafficBytes = 0;
    let cascadeTrafficBytes = 0;
    let directTrafficBytes = 0;

    for (const k of mockKeys) {
      const bytes = k.total_traffic_bytes || 524288000;
      const mBytes = k.month_traffic_bytes || 524288000;
      totalTrafficBytes += bytes;
      monthTrafficBytes += mBytes;
      if (k.node_type === 'cascade') {
        cascadeTrafficBytes += bytes;
      } else {
        directTrafficBytes += bytes;
      }
    }

    const combined = cascadeTrafficBytes + directTrafficBytes;
    const cascadePercentage = combined > 0 ? Math.round((cascadeTrafficBytes * 100) / combined) : 50;
    const directPercentage = 100 - cascadePercentage;

    const onlineNodes = mockNodes.filter((n) => n.online).length;
    const avgLatencyMs =
      onlineNodes > 0
        ? Math.round(
            mockNodes.reduce((acc, n) => acc + (n.latency_ms || 25), 0) / mockNodes.length
          )
        : 0;

    const nodesOverview = mockNodes.map((n) => {
      const nodeKeys = mockKeys.filter((k) => k.node_id === n.id);
      const nodeTraffic = nodeKeys.reduce((acc, k) => acc + (k.total_traffic_bytes || 0), 0);
      return {
        id: n.id,
        name: n.name,
        type: n.type,
        online: n.online,
        latency_ms: n.latency_ms || 25,
        peer_count: nodeKeys.length,
        total_traffic_formatted: (nodeTraffic / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
      };
    });

    const formatB = (b: number) => {
      if (b >= 1024 * 1024 * 1024 * 1024) {
        return (b / (1024 * 1024 * 1024 * 1024)).toFixed(2) + ' TB';
      }
      return (b / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    };

    return {
      total_users: totalUsers,
      active_users: activeUsers,
      pending_users: mockCurrentUser.role === 'admin' ? pendingUsers : undefined,
      total_keys: totalKeys,
      active_devices_online: activeDevicesOnline,
      total_traffic_bytes: totalTrafficBytes,
      month_traffic_bytes: monthTrafficBytes,
      total_traffic_formatted: formatB(totalTrafficBytes),
      month_traffic_formatted: formatB(monthTrafficBytes),
      total_nodes: mockNodes.length,
      online_nodes: onlineNodes,
      avg_latency_ms: avgLatencyMs,
      system_status: onlineNodes === mockNodes.length ? 'operational' : 'degraded',
      topology_breakdown: {
        cascade_traffic_bytes: cascadeTrafficBytes,
        direct_traffic_bytes: directTrafficBytes,
        cascade_traffic_formatted: formatB(cascadeTrafficBytes),
        direct_traffic_formatted: formatB(directTrafficBytes),
        cascade_percentage: cascadePercentage,
        direct_percentage: directPercentage,
      },
      nodes: nodesOverview,
      generated_at: new Date().toISOString(),
    };
  },
};


