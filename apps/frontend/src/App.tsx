import { useState } from 'react';
import { Shield, Key, Server, Users, LogOut } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'keys' | 'nodes' | 'users'>('keys');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg shadow-brand-600/30">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                Avari Keys MVP
              </span>
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-brand-900/60 text-brand-300 border border-brand-700/50">
                AWG Cascade & Direct
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-slate-400">Пользователь: <strong className="text-slate-200">Forve (Admin)</strong></span>
            <button className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition">
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
        </div>

        {/* Tab Content */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur">
          {activeTab === 'keys' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">VPN Конфигурации</h2>
              <p className="text-sm text-slate-400">Управление ключами AmneziaWG (Каскад M0 $\to$ S1 и прямой туннель S2).</p>
            </div>
          )}
          {activeTab === 'nodes' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Управление Slave-нодами</h2>
              <p className="text-sm text-slate-400">Подключение API серверов AmneziaWG по защищенному токену.</p>
            </div>
          )}
          {activeTab === 'users' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Модерация пользователей</h2>
              <p className="text-sm text-slate-400">Активация и управление учетными записями.</p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/60 py-4 text-center text-xs text-slate-500">
        Avari Keys MVP &copy; 2026 — Управление AmneziaWG через manage_amneziawg.sh
      </footer>
    </div>
  );
}
