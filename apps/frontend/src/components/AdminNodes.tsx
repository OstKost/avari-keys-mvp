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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Server className="w-5 h-5 text-brand-400" />
            <span>Управление Slave-нодами AmneziaWG</span>
          </h3>
          <p className="text-xs text-slate-400">
            Подключение удаленных серверов AWG (Каскад M0 $\to$ S1 или автономных S2) по защищенному API ключу.
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={fetchNodes}
            className="flex items-center space-x-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl border border-slate-700 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Проверить Health</span>
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white px-3.5 py-2 rounded-xl shadow-lg shadow-brand-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить Slave Сервер</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs p-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddNode} className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 shadow-xl space-y-4">
          <h4 className="text-sm font-bold text-white">Параметры нового Slave API</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Название сервера</label>
              <input
                type="text"
                placeholder="например: Cascade M0 (MSK) -> S1 (AMS)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Тип соединения</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'cascade' | 'direct')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="cascade">Каскад (Cascade M0 $\to$ S1)</option>
                <option value="direct">Прямой туннель (Direct S2)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">API URL (Slave Endpoint)</label>
              <input
                type="text"
                placeholder="например: https://s1.vpn.test или http://127.0.0.1:8081"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase">Секретный API Key (X-API-Key)</label>
              <input
                type="password"
                placeholder="Сгенерированный при запуске Slave ключ"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition"
            >
              {submitting ? 'Сохранение...' : 'Сохранить и подключить'}
            </button>
          </div>
        </form>
      )}

      {/* Nodes Table */}
      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">Статус</th>
              <th className="px-4 py-3">Название</th>
              <th className="px-4 py-3">Тип</th>
              <th className="px-4 py-3">API URL</th>
              <th className="px-4 py-3">Добавлен</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {nodes.map((node) => (
              <tr key={node.id} className="hover:bg-slate-900/50 transition">
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center space-x-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                      node.online
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                        : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                    }`}
                  >
                    {node.online ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>{node.online ? 'Online' : 'Offline'}</span>
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-white">{node.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      node.type === 'cascade'
                        ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                        : 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                    }`}
                  >
                    {node.type === 'cascade' ? 'Каскад' : 'Прямой'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs font-mono text-slate-400">{node.api_url}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(node.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(node.id)}
                    title="Удалить"
                    className="p-1.5 rounded-lg border border-rose-800/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {nodes.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                  Нет подключенных Slave-серверов. Добавьте первый сервер (например, M0 Cascade или S2 Direct).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
