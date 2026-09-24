import { useState, useEffect } from 'react';
import { UserCheck, UserX, Trash2, Users, ShieldPlus, ShieldMinus } from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from '../context/ToastContext';
import { Loader } from './Loader';

export function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ user: User; newRole: 'admin' | 'user' } | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка загрузки пользователей');
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
        toast.info(`Пользователь «${user.username}» деактивирован`);
      } else {
        await api.activateUser(user.id);
        toast.success(`Пользователь «${user.username}» успешно одобрен и активирован`);
      }
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка изменения статуса пользователя');
    }
  };

  const handleConfirmRoleChange = async () => {
    if (!roleChangeTarget) return;
    try {
      setChangingRole(true);
      await api.setUserRole(roleChangeTarget.user.id, roleChangeTarget.newRole);
      toast.success(
        `Роль пользователя «${roleChangeTarget.user.username}» успешно изменена на ${
          roleChangeTarget.newRole === 'admin' ? 'Администратор' : 'Пользователь'
        }`
      );
      setRoleChangeTarget(null);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка изменения роли');
    } finally {
      setChangingRole(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      setDeleting(true);
      await api.deleteUser(userToDelete.id);
      toast.success(`Пользователь «${userToDelete.username}» успешно удален`);
      setUserToDelete(null);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Ошибка удаления пользователя');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <Loader size="section" text="Загрузка списка пользователей..." />;
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
            {(users || []).map((u) => (
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
                  {/* Toggle Active / Deactivate */}
                  <button
                    onClick={() => handleToggleActive(u)}
                    title={u.is_active ? 'Деактивировать учетную запись' : 'Одобрить и активировать'}
                    className={`p-2 rounded-xl border transition ${
                      u.is_active
                        ? 'border-amber-700/50 bg-amber-950/30 text-amber-400 hover:bg-amber-900/50'
                        : 'border-emerald-700/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/50'
                    }`}
                  >
                    {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                  </button>

                  {/* Promote / Demote Admin */}
                  {u.role !== 'admin' ? (
                    <button
                      onClick={() => setRoleChangeTarget({ user: u, newRole: 'admin' })}
                      title="Повысить до Администратора"
                      className="p-2 rounded-xl border border-[#D9B96E]/40 bg-[#102833] text-[#D9B96E] hover:bg-[#1C3945] hover:text-[#F0D48D] transition"
                    >
                      <ShieldPlus className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setRoleChangeTarget({ user: u, newRole: 'user' })}
                      title="Снять права Администратора (понизить до пользователя)"
                      className="p-2 rounded-xl border border-[#1C3945] bg-[#06141B] text-[#718187] hover:text-[#F2F0E8] hover:bg-[#102833] transition"
                    >
                      <ShieldMinus className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete User */}
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => setUserToDelete(u)}
                      title="Удалить пользователя"
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

      {/* Role Change Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(roleChangeTarget)}
        title={roleChangeTarget?.newRole === 'admin' ? 'Повысить до Администратора?' : 'Снять права Администратора?'}
        variant={roleChangeTarget?.newRole === 'admin' ? 'warning' : 'danger'}
        confirmText={roleChangeTarget?.newRole === 'admin' ? 'Да, назначить администратором' : 'Да, снять права'}
        cancelText="Отмена"
        isLoading={changingRole}
        onConfirm={handleConfirmRoleChange}
        onClose={() => setRoleChangeTarget(null)}
        message={
          roleChangeTarget && (
            <div>
              Вы собираетесь изменить роль пользователя{' '}
              <strong className="text-[#F2F0E8]">«{roleChangeTarget.user.username}»</strong> на{' '}
              <span className="text-[#D9B96E] font-semibold">
                {roleChangeTarget.newRole === 'admin' ? 'Администратор' : 'Пользователь (Хранитель)'}
              </span>.
              {roleChangeTarget.newRole === 'admin' ? (
                <p className="mt-2 text-xs text-[#A8B4B7]">
                  Пользователь получит полный доступ к управлению узлами сети, модерации и аудиту всех ключей.
                </p>
              ) : (
                <p className="mt-2 text-xs text-[#A8B4B7]">
                  Пользователь потеряет доступ к панели администрирования.
                </p>
              )}
            </div>
          )
        }
      />

      {/* Delete User Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(userToDelete)}
        title="Удалить пользователя?"
        variant="danger"
        confirmText="Да, удалить аккаунт"
        cancelText="Отмена"
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setUserToDelete(null)}
        message={
          userToDelete && (
            <div>
              Вы собираетесь полностью удалить аккаунт пользователя{' '}
              <strong className="text-[#F2F0E8]">«{userToDelete.username}»</strong>.
              Все привязанные к пользователю VPN-ключи и конфигурации будут также удалены из системы.
            </div>
          )
        }
      />
    </div>
  );
}

