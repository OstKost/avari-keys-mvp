import { useState, useEffect } from 'react';
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

  useEffect(() => {
    setUsername(user.username);
  }, [user.username]);

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
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#F2F0E8] tracking-wide flex items-center space-x-3">
            <UserIcon className="w-7 h-7 text-[#D9B96E]" />
            <span>Мой профиль</span>
          </h2>
          <p className="text-sm text-[#A8B4B7] mt-1 font-sans">
            Управление учетной записью, изменение имени пользователя и смена пароля.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-[#0D222C] border border-[#1C3945] px-4 py-2 rounded-2xl">
          <span className="text-xs font-mono uppercase text-[#718187]">Текущий логин:</span>
          <span className="text-sm font-mono font-bold text-[#F0D48D]">@{user.username}</span>
        </div>
      </div>

      {/* Account Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-[#0D222C]/90 border border-[#1C3945] hover:border-[#D9B96E]/30 p-5 rounded-2xl flex items-center space-x-4 transition">
          <div className="bg-[#102833] p-3.5 rounded-xl border border-[#1C3945] text-[#D9B96E]">
            {user.role === 'admin' ? <ShieldCheck className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#718187]">Роль в системе</span>
            <div className="text-sm font-semibold text-[#F2F0E8] mt-1 flex items-center space-x-2">
              <span>{user.role === 'admin' ? 'Администратор' : 'Хранитель'}</span>
              <span className={`text-xs font-mono uppercase px-2 py-0.5 rounded font-bold ${user.role === 'admin' ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40' : 'bg-[#102833] text-[#6EA8C4] border border-[#6EA8C4]/40'}`}>
                {user.role}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#0D222C]/90 border border-[#1C3945] hover:border-[#D9B96E]/30 p-5 rounded-2xl flex items-center space-x-4 transition">
          <div className="bg-[#102833] p-3.5 rounded-xl border border-[#1C3945] text-emerald-400">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#718187]">Статус доступа</span>
            <div className="text-sm font-semibold text-[#F2F0E8] mt-1 flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{user.is_active ? 'Активен (Одобрен)' : 'На модерации'}</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0D222C]/90 border border-[#1C3945] hover:border-[#D9B96E]/30 p-5 rounded-2xl flex items-center space-x-4 transition">
          <div className="bg-[#102833] p-3.5 rounded-xl border border-[#1C3945] text-[#A8B4B7]">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#718187]">Дата регистрации</span>
            <div className="text-sm font-mono text-[#F2F0E8] mt-1">
              {new Date(user.created_at).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-[#0D222C]/70 border border-[#1C3945] rounded-3xl p-6 sm:p-8 lg:p-10 space-y-8 shadow-xl">
        <h3 className="font-serif text-lg sm:text-xl font-bold text-[#F2F0E8] flex items-center space-x-2.5 border-b border-[#1C3945]/80 pb-4">
          <KeyRound className="w-5 h-5 text-[#D9B96E]" />
          <span>Редактирование учетных данных</span>
        </h3>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#A8B4B7] mb-2">
              Имя пользователя (Логин)
            </label>
            <div className="relative max-w-xl">
              <UserIcon className="w-4 h-4 text-[#718187] absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl pl-10 pr-4 py-3 text-sm text-[#F2F0E8] placeholder-[#718187] focus:outline-none transition shadow-inner font-sans"
              />
            </div>
            <p className="text-xs text-[#718187] mt-1.5 font-sans">
              Отображается в системе и используется для авторизации (минимум 3 символа).
            </p>
          </div>

          <div className="pt-6 border-t border-[#1C3945]/60 space-y-4">
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#D9B96E] font-bold">
                Смена пароля
              </h4>
              <p className="text-xs text-[#718187] mt-1 font-sans">
                Оставьте поля пустыми, если не планируете изменять текущий пароль.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 pt-1">
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
                  Подтверждение нового пароля
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

        <div className="pt-6 border-t border-[#1C3945]/80 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs font-mono text-[#718187]">
            Все изменения профиля мгновенно обновляются в сессии
          </span>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] hover:from-[#F0D48D] hover:to-[#D9B96E] text-[#06141B] font-bold text-xs uppercase tracking-wider font-mono px-8 py-3.5 rounded-xl shadow-lg shadow-[#D9B96E]/20 hover:shadow-[#D9B96E]/40 disabled:opacity-50 transition-all duration-300 cursor-pointer"
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
