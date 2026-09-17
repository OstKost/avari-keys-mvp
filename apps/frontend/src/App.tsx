import { useState, useEffect } from 'react';
import { Key, Server, Users, LogOut, Plus, QrCode as QrIcon, Trash2, Smartphone, Laptop, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { api, isMockMode, setMockMode } from './api/client';
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
    const mock = isMockMode();
    if (!token && !mock) {
      setAuthLoading(false);
      return;
    }

    api.getMe()
      .then((user) => setCurrentUser(user))
      .catch(() => {
        api.logout();
        setMockMode(false);
      })
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
    setMockMode(false);
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
      <div className="min-h-screen bg-[#06141B] flex flex-col items-center justify-center text-[#A8B4B7] text-sm">
        <div className="relative mb-4">
          <img src="/assets/logo_star.png" alt="Star" className="w-12 h-12 animate-pulse filter drop-shadow-[0_0_10px_rgba(217,185,110,0.4)]" />
        </div>
        <span className="font-serif tracking-widest uppercase text-xs text-[#D9B96E]">Загрузка Avari Keys...</span>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthModal onSuccess={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="min-h-screen bg-[#06141B] text-[#F2F0E8] flex flex-col selection:bg-[#D9B96E]/30 selection:text-[#F0D48D]">
      {/* Header */}
      <header className="border-b border-[#1C3945]/80 bg-[#0A1D26]/80 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center space-x-3.5">
            <div className="relative group flex items-center justify-center p-1.5 rounded-2xl bg-[#102833]/80 border border-[#1C3945] hover:border-[#D9B96E]/50 transition">
              <img 
                src="/assets/logo_star.png" 
                alt="Logo Star" 
                className="w-8 h-8 object-contain filter drop-shadow-[0_0_8px_rgba(217,185,110,0.4)]" 
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-serif text-xl font-bold tracking-wider text-gold-gradient uppercase">
                  Avari Keys
                </span>
                <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#102833] text-[#D9B96E] border border-[#1C3945]">
                  AmneziaWG
                </span>
                {isMockMode() && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-600/40 shadow-sm">
                    ⚡ Demo Mock
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#A8B4B7] tracking-wider font-mono">
                Каскадный & Прямой доступ
              </p>
            </div>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold text-[#F2F0E8] flex items-center justify-end space-x-1">
                <span>{currentUser.username}</span>
                {currentUser.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-[#D9B96E]" />}
              </div>
              <div className="text-[10px] text-[#D9B96E] uppercase tracking-widest font-mono">
                {currentUser.role === 'admin' ? 'Администратор' : 'Хранитель'}
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Выйти"
              className="text-[#A8B4B7] hover:text-[#F2F0E8] p-2.5 rounded-xl bg-[#0D222C] border border-[#1C3945] hover:border-[#D9B96E]/40 hover:bg-[#102833] transition shadow-sm"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Navigation Tabs (Current convenient layout with Elven styling) */}
        <div className="flex flex-wrap gap-2 border-b border-[#1C3945]/80 pb-4 mb-8">
          <button
            onClick={() => setActiveTab('keys')}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-xs uppercase tracking-wider font-mono transition duration-200 ${
              activeTab === 'keys'
                ? 'bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] text-[#06141B] font-bold shadow-lg shadow-[#D9B96E]/20'
                : 'text-[#A8B4B7] hover:text-[#F2F0E8] bg-[#0A1D26] hover:bg-[#102833] border border-[#1C3945]'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Мои VPN Ключи</span>
          </button>

          {currentUser.role === 'admin' && (
            <>
              <button
                onClick={() => setActiveTab('nodes')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-xs uppercase tracking-wider font-mono transition duration-200 ${
                  activeTab === 'nodes'
                    ? 'bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] text-[#06141B] font-bold shadow-lg shadow-[#D9B96E]/20'
                    : 'text-[#A8B4B7] hover:text-[#F2F0E8] bg-[#0A1D26] hover:bg-[#102833] border border-[#1C3945]'
                }`}
              >
                <Server className="w-4 h-4" />
                <span>Серверы (Ноды)</span>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-xs uppercase tracking-wider font-mono transition duration-200 ${
                  activeTab === 'users'
                    ? 'bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] text-[#06141B] font-bold shadow-lg shadow-[#D9B96E]/20'
                    : 'text-[#A8B4B7] hover:text-[#F2F0E8] bg-[#0A1D26] hover:bg-[#102833] border border-[#1C3945]'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Модерация пользователей</span>
              </button>

              <button
                onClick={() => setActiveTab('all-keys')}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium text-xs uppercase tracking-wider font-mono transition duration-200 ${
                  activeTab === 'all-keys'
                    ? 'bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] text-[#06141B] font-bold shadow-lg shadow-[#D9B96E]/20'
                    : 'text-[#A8B4B7] hover:text-[#F2F0E8] bg-[#0A1D26] hover:bg-[#102833] border border-[#1C3945]'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Все ключи (Аудит)</span>
              </button>
            </>
          )}
        </div>

        {/* Tab Container */}
        <div className="bg-[#0A1D26]/70 border border-[#1C3945] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          
          {/* Subtle Elven Glow Overlay */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[radial-gradient(circle_at_100%_0%,rgba(217,185,110,0.05)_0%,transparent_70%)] pointer-events-none" />

          {activeTab === 'keys' && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#F2F0E8] tracking-wide flex items-center space-x-2">
                    <span>VPN Конфигурации</span>
                  </h2>
                  <p className="text-xs text-[#A8B4B7] mt-1 font-sans">
                    Создавайте и управляйте ключами AmneziaWG (Каскад M0 $\to$ S1 и прямой туннель S2).
                  </p>
                </div>

                <button
                  onClick={() => setShowCreateModal(true)}
                  disabled={nodes.length === 0}
                  className="flex items-center justify-center space-x-2 bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] hover:from-[#F0D48D] hover:to-[#D9B96E] text-[#06141B] font-bold text-xs uppercase tracking-wider font-mono px-5 py-3 rounded-xl shadow-lg shadow-[#D9B96E]/20 hover:shadow-[#D9B96E]/40 disabled:opacity-50 transition-all duration-300"
                >
                  <Plus className="w-4 h-4" />
                  <span>Создать новый ключ</span>
                </button>
              </div>

              {error && (
                <div className="flex items-center space-x-2 bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs p-4 rounded-xl mb-6 shadow-lg">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {nodes.length === 0 && !keysLoading && (
                <div className="bg-[#102833] border border-[#D9B96E]/30 text-[#D9B96E] text-xs p-5 rounded-2xl mb-6 flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 flex-shrink-0 mt-0.5 text-[#F0D48D]" />
                  <div>
                    <div className="font-semibold text-sm text-[#F0D48D]">Нет доступных серверов</div>
                    <p className="text-[#A8B4B7] mt-0.5">
                      В системе пока нет активных Slave-нод. Добавьте первую ноду во вкладке «Серверы (Ноды)» или войдите в Demo Mock режим.
                    </p>
                  </div>
                </div>
              )}

              {/* Keys Grid */}
              {keysLoading ? (
                <div className="text-center py-16 text-[#A8B4B7] text-xs font-mono tracking-widest uppercase">
                  Получение ключей из хранилища...
                </div>
              ) : keys.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-[#1C3945] rounded-2xl bg-[#06141B]/40">
                  <div className="relative inline-block mb-3">
                    <Key className="w-12 h-12 text-[#718187] mx-auto" />
                  </div>
                  <h4 className="font-serif text-lg font-semibold text-[#F2F0E8]">У вас пока нет созданных ключей</h4>
                  <p className="text-xs text-[#A8B4B7] mt-1 max-w-sm mx-auto font-sans">
                    Нажмите кнопку «Создать новый ключ», чтобы получить AmneziaWG конфигурацию для смартфона или компьютера.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {keys.map((k) => (
                    <div
                      key={k.id}
                      className="bg-[#0D222C]/90 border border-[#1C3945] hover:border-[#D9B96E]/50 rounded-2xl p-5 shadow-xl hover:shadow-2xl hover:shadow-[#D9B96E]/5 flex flex-col justify-between transition-all duration-300 group"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="bg-[#102833] p-2.5 rounded-xl text-[#D9B96E] border border-[#1C3945] group-hover:border-[#D9B96E]/40 transition">
                              {k.device_name.toLowerCase().includes('phone') || k.device_name.toLowerCase().includes('iphone') ? (
                                <Smartphone className="w-5 h-5" />
                              ) : (
                                <Laptop className="w-5 h-5" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-serif font-bold text-[#F2F0E8] text-base group-hover:text-gold-gradient transition">
                                {k.device_name}
                              </h4>
                              <span className="text-[10px] text-[#718187] font-mono tracking-wider">{k.client_name}</span>
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                              k.node_type === 'cascade'
                                ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40 shadow-sm'
                                : 'bg-[#102833] text-[#6EA8C4] border border-[#6EA8C4]/40 shadow-sm'
                            }`}
                          >
                            {k.node_type === 'cascade' ? 'Каскад M0->S1' : 'Прямой S2'}
                          </span>
                        </div>

                        <div className="text-xs text-[#A8B4B7] space-y-1.5 mb-5 bg-[#06141B]/70 p-3 rounded-xl border border-[#1C3945]/70 font-sans">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-[#718187]">Сервер:</span>
                            <span className="text-[#F2F0E8] font-medium truncate max-w-[180px]">{k.node_name || 'Node'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] text-[#718187]">Создан:</span>
                            <span className="text-[#A8B4B7] font-mono text-[11px]">{new Date(k.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-3 border-t border-[#1C3945]/80">
                        <button
                          onClick={() => handleViewKey(k.id)}
                          className="flex-1 flex items-center justify-center space-x-2 bg-[#102833] hover:bg-[#1C3945] text-[#D9B96E] hover:text-[#F0D48D] border border-[#D9B96E]/30 hover:border-[#D9B96E]/60 font-mono text-xs uppercase tracking-wider py-2.5 px-3 rounded-xl transition shadow-sm"
                        >
                          <QrIcon className="w-4 h-4" />
                          <span>QR & Конфиг</span>
                        </button>
                        <button
                          onClick={() => handleDeleteKey(k.id)}
                          title="Отозвать ключ"
                          className="p-2.5 text-[#718187] hover:text-rose-400 bg-[#06141B] hover:bg-rose-950/30 rounded-xl border border-[#1C3945] hover:border-rose-800/60 transition"
                        >
                          <Trash2 className="w-4 h-4" />
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
      <footer className="border-t border-[#1C3945]/60 py-6 text-center text-xs text-[#718187] font-mono tracking-wider">
        Avari Keys &copy; 2026 — «Свобода выбора • Твои ключи — твои правила»
      </footer>
    </div>
  );
}
