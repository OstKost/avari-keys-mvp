import { useState, useEffect, useCallback } from 'react';
import { Key, Trash2, Search, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { api } from '../api/client';
import { ClientConfigSummary, AdminNode } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from '../context/ToastContext';

export function AdminAllKeys() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<ClientConfigSummary[]>([]);
  const [nodes, setNodes] = useState<AdminNode[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Confirm delete modal state
  const [keyToDelete, setKeyToDelete] = useState<ClientConfigSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNodes = async () => {
    try {
      const data = await api.getAdminNodes();
      setNodes(data);
    } catch {
      // ignore
    }
  };

  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getAdminKeys({
        search: search.trim() || undefined,
        nodeId: selectedNodeId,
        page,
        limit,
      });
      setKeys(res.keys);
      setTotalPages(res.total_pages);
      setTotalCount(res.total_count);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка загрузки реестра ключей');
    } finally {
      setLoading(false);
    }
  }, [search, selectedNodeId, page, limit, toast]);

  useEffect(() => {
    fetchNodes();
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleConfirmDelete = async () => {
    if (!keyToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteKey(keyToDelete.id);
      toast.success(`Ключ «${keyToDelete.device_name}» (${keyToDelete.client_name}) отозван`);
      setKeyToDelete(null);
      await fetchKeys();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка удаления ключа');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // reset to page 1 on search
  };

  const handleNodeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value ? Number(e.target.value) : undefined;
    setSelectedNodeId(val);
    setPage(1);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-serif text-xl font-bold text-[#F2F0E8] flex items-center space-x-2">
            <Key className="w-5 h-5 text-[#D9B96E]" />
            <span>Сводный реестр и аудит VPN-ключей</span>
          </h3>
          <p className="text-xs text-[#A8B4B7] mt-1 font-sans">
            Мониторинг активности, учет трафика (Total / Monthly) и управление ключами по всем узлам сети.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-[#718187] absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder="Поиск по устройству, имени пира или ноде..."
            className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#F2F0E8] placeholder-[#718187] focus:outline-none transition shadow-inner font-sans"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); setPage(1); }}
              className="absolute right-3.5 top-3 text-[#718187] hover:text-[#F2F0E8]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <Filter className="w-3.5 h-3.5 text-[#718187] absolute left-3.5 top-3.5" />
          <select
            value={selectedNodeId || ''}
            onChange={handleNodeFilterChange}
            className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#F2F0E8] focus:outline-none font-mono transition"
          >
            <option value="">Все серверы / узлы</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.type === 'cascade' ? 'Каскад' : 'Прямой'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Keys Table */}
      <div className="overflow-x-auto border border-[#1C3945] rounded-2xl bg-[#06141B]/60 shadow-xl mb-4">
        <table className="w-full text-left text-sm text-[#F2F0E8]">
          <thead className="bg-[#102833]/90 text-[10px] font-mono uppercase tracking-widest text-[#A8B4B7] border-b border-[#1C3945]">
            <tr>
              <th className="px-5 py-3.5">ID</th>
              <th className="px-5 py-3.5">Устройство / Пир</th>
              <th className="px-5 py-3.5">User</th>
              <th className="px-5 py-3.5">Сервер</th>
              <th className="px-5 py-3.5">Активность (Handshake)</th>
              <th className="px-5 py-3.5">Трафик (Всего / Месяц)</th>
              <th className="px-5 py-3.5">Создан</th>
              <th className="px-5 py-3.5 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C3945]/70 bg-[#0A1D26]/40 font-sans">
            {keys.map((k) => (
              <tr key={k.id} className="hover:bg-[#102833]/50 transition duration-150">
                <td className="px-5 py-3.5 text-[#718187] font-mono text-xs">#{k.id}</td>
                <td className="px-5 py-3.5">
                  <div className="font-medium text-[#F2F0E8] text-sm">{k.device_name}</div>
                  <div className="text-[11px] font-mono text-[#D9B96E] mt-0.5">{k.client_name}</div>
                </td>
                <td className="px-5 py-3.5 text-xs text-[#A8B4B7] font-mono">User #{k.user_id}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      k.node_type === 'cascade'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                        : 'bg-[#102833] text-[#6EA8C4] border border-[#6EA8C4]/40'
                    }`}
                  >
                    {k.node_name || 'Node'}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center space-x-1.5 text-xs font-mono text-[#A8B4B7]">
                    <span className={`w-2 h-2 rounded-full ${k.last_handshake && !k.last_handshake.includes('Не') ? 'bg-emerald-400 animate-pulse' : 'bg-[#718187]'}`} />
                    <span>{k.last_handshake || 'Не подключался'}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="text-xs font-mono font-semibold text-[#F2F0E8]">
                    {k.total_traffic_formatted || '0 B'}
                  </div>
                  <div className="text-[10px] font-mono text-[#718187]">
                    Месяц: {k.month_traffic_formatted || '0 B'}
                  </div>
                </td>
                <td className="px-5 py-3.5 text-xs text-[#718187] font-mono">
                  {new Date(k.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    onClick={() => setKeyToDelete(k)}
                    title="Отозвать и удалить ключ"
                    className="p-2 rounded-xl border border-rose-800/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {keys.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[#718187] text-xs font-mono uppercase tracking-wider">
                  {search || selectedNodeId ? 'По заданным фильтрам ключи не найдены.' : 'Пока не выпущено ни одной конфигурации.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1 text-xs text-[#A8B4B7] font-mono">
          <div>
            Показано {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} из {totalCount} ключей
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-[#1C3945] bg-[#102833] hover:bg-[#1C3945] text-[#F2F0E8] disabled:opacity-40 disabled:hover:bg-[#102833] transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Назад</span>
            </button>

            <div className="px-3 py-1.5 rounded-lg bg-[#06141B] border border-[#1C3945] text-xs font-mono font-bold text-[#D9B96E]">
              {page} / {totalPages}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-[#1C3945] bg-[#102833] hover:bg-[#1C3945] text-[#F2F0E8] disabled:opacity-40 disabled:hover:bg-[#102833] transition"
            >
              <span>Вперед</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Revoke Key Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(keyToDelete)}
        title="Отозвать и удалить ключ?"
        variant="danger"
        confirmText="Да, отозвать ключ"
        cancelText="Отмена"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setKeyToDelete(null)}
        message={
          keyToDelete && (
            <div>
              Вы собираетесь безвозвратно отозвать ключ устройства{' '}
              <strong className="text-[#F2F0E8]">«{keyToDelete.device_name}»</strong> (клиент{' '}
              <code className="text-[#D9B96E] font-mono">{keyToDelete.client_name}</code>, User #{keyToDelete.user_id}).
              Конфигурация на стороне пользователя и на ноде будет аннулирована.
            </div>
          )
        }
      />
    </div>
  );
}

