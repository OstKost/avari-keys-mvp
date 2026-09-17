import { useState, useEffect } from 'react';
import { Shield, Key, Server, Users, LogOut, Plus, QrCode as QrIcon, Trash2, Smartphone, Laptop, AlertCircle } from 'lucide-react';
import { api } from './api/client';
import { User, NodePublic, ClientConfigSummary, ClientConfigDetail } from './types';
import { AuthModal } from './components/AuthModal';
import { KeyModal } from './components/KeyModal';
import { CreateKeyModal } from './components/CreateKeyModal';
import { AdminUsers } from './components/AdminUsers';
import { AdminNodes } from './components/AdminNodes';
import { AdminAllKeys } from './components/AdminAllKeys';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'keys' | 'nodes' | 'users' | 'all-keys'>('keys');

  // Keys State
  const [keys, setKeys] = useState<ClientConfigSummary[]>([]);
  const [nodes, setNodes] = useState<NodePublic[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [viewingKey, setViewingKey] = useState<ClientConfigDetail | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Check existing session
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    api.getMe()
      .then((user) => setCurrentUser(user))
      .catch(() => api.logout())
      .finally(() => setAuthLoading(false));
  }, []);

  // Load keys & nodes when user logs in
  const loadDashboardData = async () => {
    if (!currentUser) return;
    try {
      setKeysLoading(true);
      setError(null);
      const [keysData, nodesData] = await Promise.all([api.getKeys(), api.getNodes()]);
      setKeys(keysData);
      setNodes(nodesData);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки данных');
    } finally {
      setKeysLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser && activeTab === 'keys') {
      loadDashboardData();
    }
  }, [currentUser, activeTab]);

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const handleCreateKey = async (nodeId: number, deviceName: string) => {
    const newKey = await api.createKey(nodeId, deviceName);
    setViewingKey(newKey);
    await loadDashboardData();
  };

  const handleViewKey = async (id: number) => {
    try {
      const keyDetail = await api.getKey(id);
      setViewingKey(keyDetail);
    } catch (err: any) {
      alert(err.message || 'Ошибка получения конфигурации');
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (!confirm('Вы уверены, что хотите отозвать и удалить этот VPN ключ?')) return;
    try {
      await api.deleteKey(id);
      await loadDashboardData();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления ключа');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Загрузка системы...
      </div>
    );
  }

  if (!currentUser) {
    return <AuthModal onSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg shadow-brand-600/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Avari Keys MVP
              </span>
              <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-brand-900/60 text-brand-300 border border-brand-700/50">
                AWG Cascade & Direct
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-semibold text-white">{currentUser.username}</div>
              <div className="text-[10px] text-brand-400 uppercase tracking-wider font-bold">
                {currentUser.role === 'admin' ? 'Администратор' : 'Пользователь'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Выйти"
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Navigation Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 pb-4 mb-8">
          <button
            onClick={() => setActiveTab('keys')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
              activeTab === 'keys'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Мои VPN Ключи</span>
          </button>

          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('nodes')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                  activeTab === 'nodes'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Server className="w-4 h-4" />
                <span>Серверы (Ноды)</span>
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                  activeTab === 'users'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Пользователи & Модерация</span>
              </button>
              <button
                onClick={() => setActiveTab('all-keys')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium text-sm transition ${
                  activeTab === 'all-keys'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <Key className="w-4 h-4" />
                <span>Все ключи (Аудит)</span>
              </button>
            </>
          )}
        </div>

        {/* Tab Content */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur">
          {activeTab === 'keys' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-bold text-white">Мои VPN Конфигурации</h2>
                  <p className="text-xs text-slate-400">
                    Генерируйте ключи AmneziaWG для своих устройств с защитой от блокировок.
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  disabled={nodes.length === 0}
                  className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-brand-600/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Создать новый ключ</span>
                </button>
              </div>

              {error && (
                <div className="flex items-center space-x-2 bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs p-3 rounded-xl mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {nodes.length === 0 && !keysLoading && (
                <div className="bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs p-4 rounded-xl mb-6">
                  ⚠️ В системе пока нет доступных серверов. Обратитесь к администратору для подключения Slave-ноды.
                </div>
              )}

              {/* Keys Grid */}
              {keysLoading ? (
                <div className="text-center py-12 text-slate-400 text-sm">Загрузка ключей...</div>
              ) : keys.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                  <Key className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                  <h4 className="text-sm font-semibold text-slate-300">У вас пока нет созданных VPN ключей</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Нажмите кнопку «Создать новый ключ» выше, выберите тип соединения и добавьте устройство.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {keys.map((k) => (
                    <div
                      key={k.id}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 shadow-lg flex flex-col justify-between transition"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div className="bg-slate-800 p-2 rounded-lg text-brand-400">
                              {k.device_name.toLowerCase().includes('phone') || k.device_name.toLowerCase().includes('iphone') ? (
                                <Smartphone className="w-5 h-5" />
                              ) : (
                                <Laptop className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-base">{k.device_name}</h4>
                              <span className="text-[11px] text-slate-500 font-mono">{k.client_name}</span>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              k.node_type === 'cascade'
                                ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                                : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                            }`}
                          >
                            {k.node_type === 'cascade' ? 'Каскад M0->S1' : 'Прямой S2'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-400 space-y-1 mb-4 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/80">
                          <div>Сервер: <strong className="text-slate-200">{k.node_name || 'Node'}</strong></div>
                          <div>Создан: <span className="text-slate-300">{new Date(k.created_at).toLocaleDateString()}</span></div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleViewKey(k.id)}
                          className="flex-1 flex items-center justify-center space-x-1.5 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 font-medium py-2 px-3 rounded-lg text-xs transition"
                        >
                          <QrIcon className="w-3.5 h-3.5" />
                          <span>QR & Конфиг</span>
                        </button>
                        <button
                          onClick={() => handleDeleteKey(k.id)}
                          title="Отозвать ключ"
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg border border-slate-800 hover:border-rose-900/50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'nodes' && <AdminNodes />}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'all-keys' && <AdminAllKeys />}
        </div>
      </main>

      {/* Modals */}
      {viewingKey && <KeyModal keyData={viewingKey} onClose={() => setViewingKey(null)} />}
      {showCreateModal && (
        <CreateKeyModal
          nodes={nodes}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateKey}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-500">
        Avari Keys MVP &copy; 2026 — AmneziaWG Management & Cascade Topology
      </footer>
    </div>
  );
}
