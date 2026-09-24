import { useState, useEffect, useCallback } from 'react';
import {
  ScrollText,
  Search,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  RotateCcw,
  Trash2,
  User as UserIcon,
  ShieldAlert,
  Key,
  UserCheck,
  Globe,
  Clock,
} from 'lucide-react';
import { api } from '../api/client';
import { AuditLog, User, AuditLogCategory } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from '../context/ToastContext';
import { Loader } from './Loader';

export function AdminAuditLogs() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Pagination (50 actions per page)
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Cleanup Modal State
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const fetchUsers = async () => {
    try {
      const userList = await api.getAdminUsers();
      setUsers(userList);
    } catch {
      // ignore
    }
  };

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.getAdminAuditLogs({
        userId: selectedUserId,
        username: search.trim() || undefined,
        category: selectedCategory || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        page,
        limit,
      });
      setLogs(Array.isArray(res?.logs) ? res.logs : []);
      setTotalPages(res?.total_pages || 1);
      setTotalCount(res?.total_count || 0);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка загрузки журнала аудита');
    } finally {
      setLoading(false);
    }
  }, [selectedUserId, search, selectedCategory, fromDate, toDate, page, limit, toast]);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleResetFilters = () => {
    setSelectedUserId(undefined);
    setSelectedCategory('');
    setSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    selectedUserId || selectedCategory || search || fromDate || toDate
  );

  const handleConfirmCleanup = async () => {
    try {
      setIsCleaning(true);
      const res = await api.cleanupAdminAuditLogs(90);
      toast.success(res.message || 'Журнал аудита успешно очищен от старых записей');
      setShowCleanupModal(false);
      await fetchLogs();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка очистки журнала');
    } finally {
      setIsCleaning(false);
    }
  };

  const getCategoryBadge = (category: AuditLogCategory) => {
    switch (category) {
      case 'auth':
        return (
          <span className="bg-amber-950/80 text-amber-300 border border-amber-600/40 text-sm font-mono font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Авторизация</span>
          </span>
        );
      case 'keys':
        return (
          <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 text-sm font-mono font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1.5">
            <Key className="w-3.5 h-3.5" />
            <span>VPN-ключи</span>
          </span>
        );
      case 'profile':
        return (
          <span className="bg-cyan-950/80 text-cyan-300 border border-cyan-600/40 text-sm font-mono font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1.5">
            <UserIcon className="w-3.5 h-3.5" />
            <span>Профиль</span>
          </span>
        );
      case 'admin':
        return (
          <span className="bg-purple-950/80 text-purple-300 border border-purple-600/40 text-sm font-mono font-semibold px-2.5 py-0.5 rounded-full inline-flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Админ</span>
          </span>
        );
      default:
        return (
          <span className="bg-[#102833] text-[#A8B4B7] border border-[#1C3945] text-sm font-mono px-2.5 py-0.5 rounded-full">
            {category}
          </span>
        );
    }
  };

  const getActionTitle = (action: string) => {
    const map: Record<string, string> = {
      auth_register: 'Регистрация аккаунта',
      auth_register_failed: 'Ошибка регистрации',
      auth_login: 'Вход в систему',
      auth_login_failed: 'Неудачный вход',
      auth_login_blocked: 'Вход заблокирован',
      profile_update: 'Изменение профиля',
      key_create: 'Создание VPN-ключа',
      key_view: 'Просмотр конфигурации',
      key_delete: 'Удаление VPN-ключа',
      admin_user_activate: 'Активация пользователя',
      admin_user_deactivate: 'Блокировка пользователя',
      admin_user_role: 'Смена роли пользователя',
      admin_user_delete: 'Удаление пользователя',
      admin_node_create: 'Создание сервера (ноды)',
      admin_node_delete: 'Удаление сервера',
      admin_node_restart: 'Перезапуск AWG на ноде',
      admin_node_backup: 'Резервная копия ноды',
      admin_node_restore: 'Восстановление ноды',
      admin_logs_cleanup: 'Очистка журнала аудита',
    };
    return map[action] || action;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-serif text-xl font-bold text-[#F2F0E8] flex items-center space-x-2">
            <ScrollText className="w-5 h-5 text-[#D9B96E]" />
            <span>Журнал аудита действий пользователей</span>
          </h3>
          <p className="text-sm text-[#A8B4B7] mt-1 font-sans">
            История авторизаций, управления VPN-ключами, изменений профиля и действий администратора.
          </p>
        </div>

        <button
          onClick={() => setShowCleanupModal(true)}
          className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border border-rose-800/40 bg-rose-950/20 hover:bg-rose-950/40 text-rose-300 font-mono text-sm uppercase tracking-wider transition shadow-sm self-start sm:self-auto"
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Очистить логи (&gt; 3 мес.)</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-[#0D222C]/90 border border-[#1C3945] rounded-2xl p-4 mb-5 shadow-lg space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          
          {/* User Filter */}
          <div className="relative">
            <UserIcon className="w-4 h-4 text-[#D9B96E] absolute left-3 top-3 pointer-events-none" />
            <select
              value={selectedUserId || ''}
              onChange={(e) => {
                setSelectedUserId(e.target.value ? Number(e.target.value) : undefined);
                setPage(1);
              }}
              className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl pl-9 pr-8 py-2.5 text-sm text-[#F2F0E8] focus:outline-none font-mono transition appearance-none cursor-pointer"
            >
              <option value="">Все пользователи</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} (ID #{u.id})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-[#718187] absolute right-3 top-3 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Filter className="w-4 h-4 text-[#D9B96E] absolute left-3 top-3 pointer-events-none" />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl pl-9 pr-8 py-2.5 text-sm text-[#F2F0E8] focus:outline-none font-mono transition appearance-none cursor-pointer"
            >
              <option value="">Все категории событий</option>
              <option value="auth">Авторизация и сессии (Auth)</option>
              <option value="keys">VPN-конфигурации (Keys)</option>
              <option value="profile">Профиль пользователя (Profile)</option>
              <option value="admin">Действия администратора (Admin)</option>
            </select>
            <ChevronDown className="w-4 h-4 text-[#718187] absolute right-3 top-3 pointer-events-none" />
          </div>

          {/* Date From */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-[#D9B96E] absolute left-3 top-3 pointer-events-none" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#F2F0E8] focus:outline-none font-mono transition [color-scheme:dark]"
              title="Период С"
            />
          </div>

          {/* Date To */}
          <div className="relative">
            <Calendar className="w-4 h-4 text-[#D9B96E] absolute left-3 top-3 pointer-events-none" />
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#F2F0E8] focus:outline-none font-mono transition [color-scheme:dark]"
              title="Период По"
            />
          </div>
        </div>

        {/* Search Input & Reset Button */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#718187] absolute left-3.5 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Поиск по имени пользователя..."
              className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl pl-10 pr-9 py-2.5 text-sm text-[#F2F0E8] placeholder-[#718187] focus:outline-none transition shadow-inner font-sans"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="absolute right-3.5 top-3 text-[#718187] hover:text-[#F2F0E8]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 text-sm font-mono text-[#D9B96E] hover:text-[#F0D48D] bg-[#102833] hover:bg-[#1C3945] border border-[#D9B96E]/30 rounded-xl transition w-full sm:w-auto justify-center"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Сбросить фильтры</span>
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="overflow-x-auto border border-[#1C3945] rounded-2xl bg-[#06141B]/60 shadow-xl mb-4">
        <table className="w-full text-left text-sm text-[#F2F0E8]">
          <thead className="bg-[#102833]/90 text-sm font-mono uppercase tracking-wider text-[#A8B4B7] border-b border-[#1C3945]">
            <tr>
              <th className="px-4 py-3.5">Время</th>
              <th className="px-4 py-3.5">Пользователь</th>
              <th className="px-4 py-3.5">Категория</th>
              <th className="px-4 py-3.5">Действие</th>
              <th className="px-4 py-3.5">Детали</th>
              <th className="px-4 py-3.5">IP-адрес</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C3945]/70 bg-[#0A1D26]/40 font-sans text-sm">
            {(logs || []).map((log) => (
              <tr key={log.id} className="hover:bg-[#102833]/50 transition duration-150">
                {/* Time */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center space-x-1.5 text-sm font-mono text-[#F2F0E8]">
                    <Clock className="w-4 h-4 text-[#718187] flex-shrink-0" />
                    <span>{new Date(log.created_at).toLocaleString('ru-RU')}</span>
                  </div>
                </td>

                {/* User */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold text-[#F2F0E8] text-sm">{log.username}</span>
                    {log.user_id ? (
                      <span className="text-sm font-mono text-[#718187]">#{log.user_id}</span>
                    ) : (
                      <span className="text-sm font-mono text-[#718187]">(гость)</span>
                    )}
                  </div>
                </td>

                {/* Category */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {getCategoryBadge(log.category)}
                </td>

                {/* Action */}
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <div className="font-medium text-[#F2F0E8] text-sm">{getActionTitle(log.action)}</div>
                  <div className="text-sm font-mono text-[#718187] mt-0.5">{log.action}</div>
                </td>

                {/* Details */}
                <td className="px-4 py-3.5 max-w-md">
                  <span className="text-[#A8B4B7] leading-relaxed break-words font-sans text-sm">
                    {log.details || '—'}
                  </span>
                </td>

                {/* IP Address */}
                <td className="px-4 py-3.5 whitespace-nowrap text-sm font-mono text-[#718187]">
                  <div className="flex items-center space-x-1">
                    <Globe className="w-3.5 h-3.5 text-[#718187]" />
                    <span>{log.ip_address || '—'}</span>
                  </div>
                </td>
              </tr>
            ))}

            {loading && (
              <Loader size="table" colSpan={6} text="Загрузка журнала аудита и событий безопасности..." />
            )}

            {(logs || []).length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-[#718187] text-sm font-mono uppercase tracking-wider">
                  {hasActiveFilters ? 'По заданным фильтрам события не найдены.' : 'Журнал аудита пуст.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-2 py-1 text-sm text-[#A8B4B7] font-mono">
          <div>
            Показано {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} из {totalCount} событий (по 50 на страницу)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center space-x-1 px-3.5 py-2 rounded-lg border border-[#1C3945] bg-[#102833] hover:bg-[#1C3945] text-[#F2F0E8] disabled:opacity-40 disabled:hover:bg-[#102833] transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Назад</span>
            </button>

            <div className="px-3.5 py-2 rounded-lg bg-[#06141B] border border-[#1C3945] text-sm font-mono font-bold text-[#D9B96E]">
              {page} / {totalPages}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center space-x-1 px-3.5 py-2 rounded-lg border border-[#1C3945] bg-[#102833] hover:bg-[#1C3945] text-[#F2F0E8] disabled:opacity-40 disabled:hover:bg-[#102833] transition"
            >
              <span>Вперед</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Cleanup Confirm Modal */}
      <ConfirmModal
        isOpen={showCleanupModal}
        title="Очистить старые логи аудита?"
        variant="danger"
        confirmText="Да, удалить старые логи"
        cancelText="Отмена"
        isLoading={isCleaning}
        onConfirm={handleConfirmCleanup}
        onClose={() => setShowCleanupModal(false)}
        message={
          <div>
            Вы собираетесь удалить все записи журнала аудита старше <strong className="text-[#F2F0E8]">3 месяцев (90 дней)</strong>.
            Это действие необратимо и освободит место в базе данных.
          </div>
        }
      />
    </div>
  );
}
