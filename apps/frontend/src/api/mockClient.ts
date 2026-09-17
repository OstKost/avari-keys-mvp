import { User, NodePublic, AdminNode, ClientConfigSummary, ClientConfigDetail } from '../types';

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

let mockCurrentUser: User = mockUsers[0];

let mockNodes: AdminNode[] = [
  {
    id: 1,
    name: 'Каскад M0 (Москва) -> S1 (Амстердам)',
    type: 'cascade',
    api_url: 'http://127.0.0.1:8081',
    is_active: true,
    online: true,
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
  },
  {
    id: 2,
    name: 'Прямой туннель S2 (Франкфурт)',
    type: 'direct',
    api_url: 'http://127.0.0.1:8082',
    is_active: true,
    online: true,
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

let mockKeys: (ClientConfigDetail & { user_id: number })[] = [
  {
    id: 1,
    user_id: 1, // Forve Admin
    client_name: 'u1_iphone15',
    device_name: 'iphone_15_pro',
    node_id: 1,
    node_name: 'Каскад M0 (Москва) -> S1 (Амстердам)',
    node_type: 'cascade',
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
        created_at: k.created_at,
      }));
  },

  async createKey(nodeId: number, deviceName: string): Promise<ClientConfigDetail> {
    const node = mockNodes.find((n) => n.id === nodeId);
    const nodeName = node ? node.name : 'Unknown Node';
    const nodeType = node ? node.type : 'direct';
    const id = mockKeys.length + 1;
    const clientName = `u${mockCurrentUser.id}_${deviceName.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}`;

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
PublicKey = aMockServerPublicKeyForNode_${nodeId}=
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

  async deleteUser(id: number): Promise<{ success: boolean }> {
    mockUsers = mockUsers.filter((u) => u.id !== id);
    return { success: true };
  },

  async getAdminNodes(): Promise<AdminNode[]> {
    return [...mockNodes];
  },

  async addAdminNode(name: string, type: 'cascade' | 'direct', apiUrl: string, _apiKey: string): Promise<AdminNode> {
    const newNode: AdminNode = {
      id: mockNodes.length + 1,
      name,
      type,
      api_url: apiUrl,
      is_active: true,
      online: true,
      created_at: new Date().toISOString(),
    };
    mockNodes.push(newNode);
    return newNode;
  },

  async deleteAdminNode(id: number): Promise<{ success: boolean }> {
    mockNodes = mockNodes.filter((n) => n.id !== id);
    return { success: true };
  },

  async getAdminKeys(): Promise<ClientConfigSummary[]> {
    return mockKeys.map((k) => ({
      id: k.id,
      user_id: k.user_id,
      node_id: k.node_id,
      client_name: k.client_name,
      device_name: k.device_name,
      node_name: k.node_name,
      node_type: k.node_type,
      created_at: k.created_at,
    }));
  },
};
