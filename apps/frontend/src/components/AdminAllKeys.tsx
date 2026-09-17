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
    return <div className="text-center py-12 text-[#A8B4B7] text-xs font-mono uppercase tracking-widest">Загрузка реестра всех ключей...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-serif text-xl font-bold text-[#F2F0E8] flex items-center space-x-2">
            <Key className="w-5 h-5 text-[#D9B96E]" />
            <span>Сводный реестр всех VPN-ключей</span>
          </h3>
          <p className="text-xs text-[#A8B4B7] mt-1 font-sans">
            Аудит выданных конфигураций AmneziaWG по всем пользователям и узлам.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs p-3.5 rounded-xl mb-5 shadow-lg">
          {error}
        </div>
      )}

      <div className="overflow-x-auto border border-[#1C3945] rounded-2xl bg-[#06141B]/60 shadow-xl">
        <table className="w-full text-left text-sm text-[#F2F0E8]">
          <thead className="bg-[#102833]/90 text-[10px] font-mono uppercase tracking-widest text-[#A8B4B7] border-b border-[#1C3945]">
            <tr>
              <th className="px-5 py-3.5">ID</th>
              <th className="px-5 py-3.5">Устройство</th>
              <th className="px-5 py-3.5">User ID</th>
              <th className="px-5 py-3.5">Сервер</th>
              <th className="px-5 py-3.5">Имя в AWG</th>
              <th className="px-5 py-3.5">Создан</th>
              <th className="px-5 py-3.5 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C3945]/70 bg-[#0A1D26]/40 font-sans">
            {keys.map((k) => (
              <tr key={k.id} className="hover:bg-[#102833]/50 transition duration-150">
                <td className="px-5 py-3.5 text-[#718187] font-mono text-xs">#{k.id}</td>
                <td className="px-5 py-3.5 font-medium text-[#F2F0E8]">{k.device_name}</td>
                <td className="px-5 py-3.5 text-xs text-[#A8B4B7] font-mono">User #{k.user_id}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      k.node_type === 'cascade'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                        : 'bg-[#102833] text-[#6EA8C4] border border-[#6EA8C4]/40'
                    }`}
                  >
                    {k.node_name || 'Node'} ({k.node_type === 'cascade' ? 'Каскад' : 'Прямой'})
                  </span>
                </td>
                <td className="px-5 py-3.5 font-mono text-xs text-[#D9B96E]">{k.client_name}</td>
                <td className="px-5 py-3.5 text-xs text-[#718187] font-mono">
                  {new Date(k.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => handleDelete(k.id)}
                    title="Отозвать и удалить"
                    className="p-2 rounded-xl border border-rose-800/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-[#718187] text-xs font-mono uppercase tracking-wider">
                  Пока не выпущено ни одной конфигурации.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
