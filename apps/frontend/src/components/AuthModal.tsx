import { useState } from 'react';
import { Shield, LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import { User } from '../types';

interface Props {
  onSuccess: (user: User) => void;
}

export function AuthModal({ onSuccess }: Props) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegister) {
        await api.register(username.trim(), password);
        setSuccessMsg('Регистрация успешна! Ваш аккаунт ожидает подтверждения администратором Forve.');
        setIsRegister(false);
      } else {
        const data = await api.login(username.trim(), password);
        onSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Ошибка выполнения операции');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="bg-brand-600 p-3 rounded-2xl text-white shadow-xl shadow-brand-600/30 mb-3">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Avari Keys MVP</h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRegister ? 'Создание учетной записи' : 'Вход в панель управления AmneziaWG'}
          </p>
        </div>

        {error && (
          <div className="flex items-start space-x-2 bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs p-3 rounded-xl mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start space-x-2 bg-emerald-950/50 border border-emerald-800/80 text-emerald-300 text-xs p-3 rounded-xl mb-4">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Имя пользователя
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="например: user1 или Forve"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-brand-500 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-brand-600/30 transition flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Подождите...</span>
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Зарегистрироваться</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Войти в аккаунт</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
              setSuccessMsg(null);
            }}
            className="text-xs text-brand-400 hover:text-brand-300 transition font-medium"
          >
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </button>
        </div>
      </div>
    </div>
  );
}
