import { useState, useEffect } from 'react';
import { Server, Plus, Trash2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { AdminNode } from '../types';

export function AdminNodes() {
  const [nodes, setNodes] = useState<AdminNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'cascade' | 'direct'>('cascade');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminNodes();
      setNodes(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки серверов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNodes();
  }, []);

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      await api.addAdminNode(name.trim(), type, apiUrl.trim(), apiKey.trim());
      setName('');
      setApiUrl('');
      setApiKey('');
      setShowAddForm(false);
      await fetchNodes();
    } catch (err: any) {
      setError(err.message || 'Ошибка добавления сервера');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту ноду? Все выданные на ней ключи будут удалены из базы.')) return;
    try {
      await api.deleteAdminNode(id);
      await fetchNodes();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления ноды');
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-serif text-xl font-bold text-[#F2F0E8] flex items-center space-x-2">
            <Server className="w-5 h-5 text-[#D9B96E]" />
            <span>Управление Slave-нодами AmneziaWG</span>
          </h3>
          <p className="text-xs text-[#A8B4B7] mt-1 font-sans">
            Подключение серверов AWG (Каскад M0 $\to$ S1 или автономных S2) по защищенному API ключу.
          </p>
        </div>
        
        <div className="flex items-center space-x-2.5">
          <button
            onClick={fetchNodes}
            className="flex items-center space-x-1.5 text-xs font-mono uppercase tracking-wider bg-[#102833] hover:bg-[#1C3945] text-[#A8B4B7] hover:text-[#F2F0E8] px-3.5 py-2.5 rounded-xl border border-[#1C3945] transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Health Check</span>
          </button>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] hover:from-[#F0D48D] hover:to-[#D9B96E] text-[#06141B] px-4 py-2.5 rounded-xl shadow-lg shadow-[#D9B96E]/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить Сервер</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs p-3.5 rounded-xl mb-5 shadow-lg">
          {error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddNode} className="bg-[#102833] border border-[#D9B96E]/40 rounded-2xl p-6 mb-6 shadow-2xl space-y-4">
          <h4 className="font-serif text-base font-bold text-[#F2F0E8]">Параметры нового Slave API</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#A8B4B7] uppercase mb-1.5">Название сервера</label>
              <input
                type="text"
                placeholder="например: Каскад M0 (MSK) -> S1 (AMS)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl px-3.5 py-2.5 text-sm text-[#F2F0E8] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#A8B4B7] uppercase mb-1.5">Тип соединения</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'cascade' | 'direct')}
                className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl px-3.5 py-2.5 text-sm text-[#F2F0E8] focus:outline-none"
              >
                <option value="cascade">Каскад (Cascade M0 $\to$ S1)</option>
                <option value="direct">Прямой туннель (Direct S2)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#A8B4B7] uppercase mb-1.5">API URL (Slave Endpoint)</label>
              <input
                type="text"
                placeholder="например: https://s1.vpn.test или http://127.0.0.1:8081"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl px-3.5 py-2.5 text-sm text-[#F2F0E8] focus:outline-none font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#A8B4B7] uppercase mb-1.5">Секретный API Key (X-API-Key)</label>
              <input
                type="password"
                placeholder="Сгенерированный при запуске Slave ключ"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl px-3.5 py-2.5 text-sm text-[#F2F0E8] focus:outline-none font-mono text-xs"
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-mono uppercase text-[#A8B4B7] hover:text-[#F2F0E8] rounded-xl hover:bg-[#06141B]"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-mono font-bold uppercase bg-gradient-to-r from-[#F0D48D] to-[#D9B96E] text-[#06141B] rounded-xl shadow-lg transition"
            >
              {submitting ? 'Сохранение...' : 'Сохранить и подключить'}
            </button>
          </div>
        </form>
      )}

      {/* Nodes Table */}
      <div className="overflow-x-auto border border-[#1C3945] rounded-2xl bg-[#06141B]/60 shadow-xl">
        <table className="w-full text-left text-sm text-[#F2F0E8]">
          <thead className="bg-[#102833]/90 text-[10px] font-mono uppercase tracking-widest text-[#A8B4B7] border-b border-[#1C3945]">
            <tr>
              <th className="px-5 py-3.5">Статус</th>
              <th className="px-5 py-3.5">Название</th>
              <th className="px-5 py-3.5">Тип</th>
              <th className="px-5 py-3.5">API URL</th>
              <th className="px-5 py-3.5">Добавлен</th>
              <th className="px-5 py-3.5 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C3945]/70 bg-[#0A1D26]/40 font-sans">
            {nodes.map((node) => (
              <tr key={node.id} className="hover:bg-[#102833]/50 transition duration-150">
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center space-x-1.5 text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full ${
                      node.online
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                        : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                    }`}
                  >
                    {node.online ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{node.online ? 'Online' : 'Offline'}</span>
                  </span>
                </td>
                <td className="px-5 py-3.5 font-medium text-[#F2F0E8]">{node.name}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      node.type === 'cascade'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                        : 'bg-[#102833] text-[#6EA8C4] border border-[#6EA8C4]/40'
                    }`}
                  >
                    {node.type === 'cascade' ? 'Каскад' : 'Прямой'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs font-mono text-[#A8B4B7]">{node.api_url}</td>
                <td className="px-5 py-3.5 text-xs text-[#718187] font-mono">
                  {new Date(node.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => handleDelete(node.id)}
                    title="Удалить"
                    className="p-2 rounded-xl border border-rose-800/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {nodes.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[#718187] text-xs font-mono uppercase tracking-wider">
                  Нет подключенных Slave-серверов.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
