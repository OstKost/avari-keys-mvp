import { useState, useEffect } from 'react';
import { Key, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { ClientConfigSummary } from '../types';

export function AdminAllKeys() {
  const [keys, setKeys] = useState<ClientConfigSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKeys = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminKeys();
      setKeys(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки ключей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите отозвать и удалить этот ключ?')) return;
    try {
      await api.deleteKey(id);
      await fetchKeys();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления ключа');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-400 text-sm">Загрузка сводного реестра ключей...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Key className="w-5 h-5 text-brand-400" />
            <span>Сводный реестр всех VPN-ключей</span>
          </h3>
          <p className="text-xs text-slate-400">
            Полный аудит выданных клиентам конфигураций по всем пользователям и серверам.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs p-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      <div className="overflow-x-auto border border-slate-800 rounded-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Устройство</th>
              <th className="px-4 py-3">User ID</th>
              <th className="px-4 py-3">Сервер</th>
              <th className="px-4 py-3">Имя в AWG</th>
              <th className="px-4 py-3">Дата создания</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {keys.map((k) => (
              <tr key={k.id} className="hover:bg-slate-900/50 transition">
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">#{k.id}</td>
                <td className="px-4 py-3 font-medium text-white">{k.device_name}</td>
                <td className="px-4 py-3 text-xs text-slate-400">User #{k.user_id}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      k.node_type === 'cascade'
                        ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                        : 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                    }`}
                  >
                    {k.node_name || 'Node'} ({k.node_type === 'cascade' ? 'Каскад' : 'Прямой'})
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-brand-300">{k.client_name}</td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(k.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(k.id)}
                    title="Отозвать и удалить"
                    className="p-1.5 rounded-lg border border-rose-800/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                  Пока не создано ни одного ключа.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
