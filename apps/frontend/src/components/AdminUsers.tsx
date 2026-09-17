import { useState, useEffect } from 'react';
import { UserCheck, UserX, Trash2, Users } from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminUsers();
      setUsers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (user: User) => {
    try {
      if (user.is_active) {
        await api.deactivateUser(user.id);
      } else {
        await api.activateUser(user.id);
      }
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Ошибка изменения статуса');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя и все его ключи?')) return;
    try {
      await api.deleteUser(id);
      await fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Ошибка удаления пользователя');
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-slate-400 text-sm">Загрузка списка пользователей...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <Users className="w-5 h-5 text-brand-400" />
            <span>Управление пользователями & Модерация</span>
          </h3>
          <p className="text-xs text-slate-400">
            Новые пользователи требуют ручной активации администратором перед началом работы.
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
              <th className="px-4 py-3">Имя пользователя</th>
              <th className="px-4 py-3">Роль</th>
              <th className="px-4 py-3">Статус модерации</th>
              <th className="px-4 py-3">Дата регистрации</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-950/40">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-900/50 transition">
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">#{u.id}</td>
                <td className="px-4 py-3 font-medium text-white">{u.username}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      u.role === 'admin'
                        ? 'bg-purple-950/80 text-purple-400 border border-purple-800/60'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      u.is_active
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                        : 'bg-amber-950/80 text-amber-400 border border-amber-800/60 animate-pulse'
                    }`}
                  >
                    {u.is_active ? 'Активен (Одобрен)' : 'Ожидает активации'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={() => handleToggleActive(u)}
                    title={u.is_active ? 'Деактивировать' : 'Активировать (Одобрить)'}
                    className={`p-1.5 rounded-lg border transition ${
                      u.is_active
                        ? 'border-amber-700/50 bg-amber-950/30 text-amber-400 hover:bg-amber-900/50'
                        : 'border-emerald-700/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/50'
                    }`}
                  >
                    {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>

                  {u.role !== 'admin' && (
                    <button
                      onClick={() => handleDelete(u.id)}
                      title="Удалить"
                      className="p-1.5 rounded-lg border border-rose-800/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
