import { useState } from 'react';
import { LogIn, UserPlus, AlertCircle, CheckCircle2, User as UserIcon, ShieldCheck } from 'lucide-react';
import { api, loginAsDemoUser } from '../api/client';
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
        setSuccessMsg('Учетная запись создана. Ожидайте подтверждения администратором Forve.');
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

  const handleDemoLogin = async (demoUsername: string) => {
    const user = await loginAsDemoUser(demoUsername);
    onSuccess(user);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-[#06141B] overflow-hidden">
      {/* Fantasy Elven Background Art */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 mix-blend-luminosity scale-105 transition duration-1000"
        style={{ backgroundImage: "url('/assets/background_main.png')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#06141B] via-[#06141B]/80 to-[#06141B]/60" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(217,185,110,0.08)_0%,transparent_60%)]" />

      {/* Login Card */}
      <div className="relative z-10 max-w-md w-full bg-[#0A1D26]/90 backdrop-blur-xl border border-[#1C3945] hover:border-[#D9B96E]/40 rounded-3xl p-8 sm:p-10 shadow-2xl shadow-black/80 transition-all duration-500">
        
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-3 group">
            <div className="absolute -inset-2 bg-[#D9B96E]/20 rounded-full blur-lg opacity-70 group-hover:opacity-100 transition" />
            <img 
              src="/assets/logo_star.png" 
              alt="Avari Keys Star" 
              className="relative w-14 h-14 object-contain filter drop-shadow-[0_0_12px_rgba(217,185,110,0.5)]" 
            />
          </div>
          
          <h1 className="font-serif text-3xl font-bold tracking-wider text-gold-gradient uppercase">
            Avari Keys
          </h1>
          <p className="text-xs text-[#A8B4B7] tracking-widest uppercase mt-1 font-mono">
            {isRegister ? 'Регистрация хранителя' : 'Свобода выбора • Твои ключи'}
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="flex items-start space-x-2.5 bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs p-3.5 rounded-xl mb-5 shadow-lg">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start space-x-2.5 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs p-3.5 rounded-xl mb-5 shadow-lg">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#A8B4B7] uppercase tracking-wider mb-1.5 font-mono">
              Имя пользователя
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="например: Forve или user1"
              className="w-full bg-[#0D222C] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl px-4 py-3 text-sm text-[#F2F0E8] placeholder-[#718187] focus:outline-none focus:ring-1 focus:ring-[#D9B96E]/50 transition shadow-inner font-sans"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#A8B4B7] uppercase tracking-wider mb-1.5 font-mono">
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0D222C] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl px-4 py-3 text-sm text-[#F2F0E8] placeholder-[#718187] focus:outline-none focus:ring-1 focus:ring-[#D9B96E]/50 transition shadow-inner font-sans"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] hover:from-[#F0D48D] hover:to-[#D9B96E] text-[#06141B] font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#D9B96E]/20 hover:shadow-[#D9B96E]/40 disabled:opacity-50 transition-all duration-300 flex items-center justify-center space-x-2 text-sm uppercase tracking-wider font-mono"
          >
            {loading ? (
              <span>Авторизация...</span>
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Создать аккаунт</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Войти в систему</span>
              </>
            )}
          </button>
        </form>

        {/* Demo Mode / Quick Logins */}
        <div className="mt-6 pt-5 border-t border-[#1C3945]/80 flex flex-col space-y-2.5">
          <div className="text-[10px] text-center font-mono uppercase tracking-widest text-[#718187] mb-1">
            Быстрый демо-вход (Mock-режим)
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleDemoLogin('alice')}
              type="button"
              className="flex items-center justify-center space-x-1.5 bg-[#102833]/80 hover:bg-[#102833] text-[#6EA8C4] hover:text-[#9cd0e6] border border-[#6EA8C4]/30 hover:border-[#6EA8C4]/60 font-medium py-2.5 px-3 rounded-xl text-xs transition shadow-sm font-mono"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#6EA8C4]" />
              <span>Клиент (Alice)</span>
            </button>

            <button
              onClick={() => handleDemoLogin('Forve')}
              type="button"
              className="flex items-center justify-center space-x-1.5 bg-[#102833]/80 hover:bg-[#102833] text-[#F0D48D] hover:text-white border border-[#D9B96E]/30 hover:border-[#D9B96E]/60 font-medium py-2.5 px-3 rounded-xl text-xs transition shadow-sm font-mono"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#D9B96E]" />
              <span>Админ (Forve)</span>
            </button>
          </div>

          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
              setSuccessMsg(null);
            }}
            className="text-xs text-[#A8B4B7] hover:text-[#F2F0E8] transition text-center font-medium pt-2"
          >
            {isRegister ? 'Уже есть учетная запись? Войти' : 'Новый пользователь? Зарегистрироваться'}
          </button>
        </div>

      </div>
    </div>
  );
}
