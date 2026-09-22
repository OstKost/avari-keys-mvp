import { useState } from 'react';
import { User as UserIcon, Lock, Shield, KeyRound, Check, Calendar, ShieldCheck, UserCheck } from 'lucide-react';
import { User } from '../types';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';

interface UserProfileProps {
  user: User;
  onUserUpdated: (updated: User) => void;
}

export function UserProfile({ user, onUserUpdated }: UserProfileProps) {
  const { toast } = useToast();
  const [username, setUsername] = useState(user.username);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (username.trim().length < 3) {
      toast.warning('Имя пользователя должно содержать не менее 3 символов');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      toast.warning('Новый пароль должен быть не менее 6 символов');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.warning('Новые пароли не совпадают');
      return;
    }

    if (username.trim() === user.username && !newPassword) {
      toast.info('Данные профиля не были изменены');
      return;
    }

    try {
      setLoading(true);
      const res = await api.updateProfile({
        username: username.trim() !== user.username ? username.trim() : undefined,
        password: newPassword ? newPassword : undefined,
      });

      toast.success('Профиль успешно обновлен');
      setNewPassword('');
      setConfirmPassword('');
      onUserUpdated(res.user);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка обновления профиля');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-serif text-2xl font-bold text-[#F2F0E8] tracking-wide flex items-center space-x-2">
          <UserIcon className="w-6 h-6 text-[#D9B96E]" />
          <span>Мой профиль</span>
        </h2>
        <p className="text-xs text-[#A8B4B7] mt-1 font-sans">
          Управление учетной записью, изменение имени пользователя и смена пароля.
        </p>
      </div>

      {/* Account Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0D222C]/90 border border-[#1C3945] p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="bg-[#102833] p-3 rounded-xl border border-[#1C3945] text-[#D9B96E]">
            {user.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#718187]">Роль в системе</span>
            <div className="text-sm font-semibold text-[#F2F0E8] mt-0.5 flex items-center space-x-1.5">
              <span>{user.role === 'admin' ? 'Администратор' : 'Хранитель'}</span>
              <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${user.role === 'admin' ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40' : 'bg-[#102833] text-[#6EA8C4] border border-[#6EA8C4]/40'}`}>
                {user.role}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#0D222C]/90 border border-[#1C3945] p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="bg-[#102833] p-3 rounded-xl border border-[#1C3945] text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#718187]">Статус доступа</span>
            <div className="text-sm font-semibold text-[#F2F0E8] mt-0.5 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{user.is_active ? 'Активен (Одобрен)' : 'На модерации'}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0D222C]/90 border border-[#1C3945] p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="bg-[#102833] p-3 rounded-xl border border-[#1C3945] text-[#A8B4B7]">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#718187]">Дата регистрации</span>
            <div className="text-sm font-mono text-[#F2F0E8] mt-0.5">
              {new Date(user.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-[#0D222C]/70 border border-[#1C3945] rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        <h3 className="font-serif text-lg font-bold text-[#F2F0E8] flex items-center space-x-2 border-b border-[#1C3945]/80 pb-3">
          <KeyRound className="w-4 h-4 text-[#D9B96E]" />
          <span>Редактирование учетных данных</span>
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A8B4B7] mb-2">
              Имя пользователя (Логин)
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-[#718187] absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl pl-10 pr-4 py-3 text-sm text-[#F2F0E8] placeholder-[#718187] focus:outline-none transition shadow-inner font-sans"
              />
            </div>
            <p className="text-[11px] text-[#718187] mt-1 font-sans">
              Отображается в системе и используется для авторизации.
            </p>
          </div>

          <div className="pt-4 border-t border-[#1C3945]/60 space-y-4">
            <h4 className="text-xs font-mono uppercase tracking-wider text-[#D9B96E]">
              Смена пароля (Оставьте пустым, если не хотите менять)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A8B4B7] mb-2">
                  Новый пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#718187] absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Минимум 6 символов"
                    className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl pl-10 pr-4 py-3 text-sm text-[#F2F0E8] placeholder-[#718187] focus:outline-none transition shadow-inner font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-[#A8B4B7] mb-2">
                  Подтверждение пароля
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#718187] absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Повторите новый пароль"
                    className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl pl-10 pr-4 py-3 text-sm text-[#F2F0E8] placeholder-[#718187] focus:outline-none transition shadow-inner font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] hover:from-[#F0D48D] hover:to-[#D9B96E] text-[#06141B] font-bold text-xs uppercase tracking-wider font-mono px-6 py-3 rounded-xl shadow-lg shadow-[#D9B96E]/20 hover:shadow-[#D9B96E]/40 disabled:opacity-50 transition-all duration-300"
          >
            {loading ? (
              <span>Сохранение...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Сохранить изменения</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
