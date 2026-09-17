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
    return <div className="text-center py-12 text-[#A8B4B7] text-xs font-mono uppercase tracking-widest">Загрузка списка пользователей...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-serif text-xl font-bold text-[#F2F0E8] flex items-center space-x-2">
            <Users className="w-5 h-5 text-[#D9B96E]" />
            <span>Модерация пользователей</span>
          </h3>
          <p className="text-xs text-[#A8B4B7] mt-1 font-sans">
            Активация и управление доступом зарегистрированных пользователей системы.
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
              <th className="px-5 py-3.5">Имя пользователя</th>
              <th className="px-5 py-3.5">Роль</th>
              <th className="px-5 py-3.5">Статус</th>
              <th className="px-5 py-3.5">Дата регистрации</th>
              <th className="px-5 py-3.5 text-right">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C3945]/70 bg-[#0A1D26]/40 font-sans">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-[#102833]/50 transition duration-150">
                <td className="px-5 py-3.5 text-[#718187] font-mono text-xs">#{u.id}</td>
                <td className="px-5 py-3.5 font-medium text-[#F2F0E8]">{u.username}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      u.role === 'admin'
                        ? 'bg-[#D9B96E]/20 text-[#F0D48D] border border-[#D9B96E]/40'
                        : 'bg-[#102833] text-[#A8B4B7] border border-[#1C3945]'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full ${
                      u.is_active
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                        : 'bg-amber-950/80 text-amber-300 border border-amber-600/40 animate-pulse'
                    }`}
                  >
                    {u.is_active ? 'Активен (Одобрен)' : 'Ожидает модерации'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs text-[#A8B4B7] font-mono">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3.5 text-right space-x-2">
                  <button
                    onClick={() => handleToggleActive(u)}
                    title={u.is_active ? 'Деактивировать' : 'Активировать'}
                    className={`p-2 rounded-xl border transition ${
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
                      className="p-2 rounded-xl border border-rose-800/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 transition"
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
