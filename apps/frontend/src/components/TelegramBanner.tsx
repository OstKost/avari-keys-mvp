import { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react';
import { User, UserTelegramStatus } from '../types';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Tooltip } from './Tooltip';

interface TelegramBannerProps {
  currentUser: User;
  onStatusChange?: () => void;
}

export function TelegramBanner({ currentUser, onStatusChange }: TelegramBannerProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<UserTelegramStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  const storageKey = `avari_tg_banner_dismissed_${currentUser.id}`;

  const loadStatus = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const data = await api.getUserTelegramStatus();
      setStatus(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey) === 'true';
    setIsDismissed(dismissed);
    loadStatus();
  }, [currentUser.id]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(storageKey, 'true');
  };

  const handleCopyCommand = () => {
    if (status?.deep_link) {
      navigator.clipboard.writeText(status.deep_link);
      setCopied(true);
      toast.success('Персональная ссылка на бота скопирована!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCheckConnection = async () => {
    await loadStatus(true);
    if (status?.is_linked) {
      toast.success('Telegram-чат успешно привязан!');
      if (onStatusChange) onStatusChange();
    } else {
      toast.info('Ожидание подключения. Отправьте команду в боте и нажмите кнопку снова.');
    }
  };

  if (loading || !status || !status.bot_enabled) {
    return null;
  }

  // Already linked: Show compact active status bar
  if (status.is_linked) {
    return (
      <div className="bg-gradient-to-r from-[#0D222C]/90 via-[#102833]/90 to-[#0A1D26]/90 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-4 mb-6 shadow-lg backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                Telegram-оповещения активны
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-xs text-[#A8B4B7] font-sans mt-0.5 truncate">
              {status.telegram_username ? (
                <>
                  Привязан аккаунт <strong className="text-[#F2F0E8]">@{status.telegram_username}</strong> через бота{' '}
                  <span className="text-[#D9B96E]">@{status.bot_username}</span>
                </>
              ) : (
                <>
                  Чат привязан к боту <span className="text-[#D9B96E]">@{status.bot_username}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <a
            href={`https://t.me/${status.bot_username}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-[#06141B] hover:bg-[#102833] border border-[#1C3945] hover:border-[#D9B96E]/40 text-xs font-mono text-[#D9B96E] hover:text-[#F0D48D] transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Открыть бота</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
          </a>
        </div>
      </div>
    );
  }

  // Dismissed state: Don't show full banner
  if (isDismissed) {
    return null;
  }

  // Invitation Banner
  return (
    <div className="relative bg-gradient-to-br from-[#102833] via-[#0A1D26] to-[#06141B] border border-[#D9B96E]/40 rounded-3xl p-5 sm:p-6 mb-6 shadow-2xl overflow-hidden animate-fadeIn">
      {/* Elven background gold glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[radial-gradient(circle_at_100%_0%,rgba(217,185,110,0.12)_0%,transparent_70%)] pointer-events-none" />

      {/* Dismiss Button */}
      <button
        onClick={handleDismiss}
        aria-label="Скрыть баннер"
        className="absolute top-4 right-4 text-[#718187] hover:text-[#F2F0E8] p-1.5 rounded-xl hover:bg-[#102833] transition"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-2xl bg-[#0D222C] border border-[#D9B96E]/40 text-[#F0D48D] shadow-lg shadow-[#D9B96E]/10 shrink-0">
            <Send className="w-6 h-6 text-[#D9B96E]" />
          </div>

          <div className="space-y-1.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-950/80 text-[#F0D48D] border border-amber-600/40">
                Telegram-оповещения
              </span>
              <span className="text-[11px] font-mono text-[#A8B4B7] flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#D9B96E]" />
                <span>Бот @{status.bot_username}</span>
              </span>
            </div>

            <h3 className="font-serif text-base sm:text-lg font-bold text-[#F2F0E8] tracking-wide">
              Подключите уведомления о состоянии серверов и взносах
            </h3>

            <p className="text-xs sm:text-sm text-[#A8B4B7] font-sans leading-relaxed">
              Бот пришлет персональное напоминание перед окончанием 30-дневного периода взноса, а также мгновенно оповестит, если на вашем сервере произойдет сбой или плановые технические работы.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0 pt-2 lg:pt-0">
          <a
            href={status.deep_link}
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-2 bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] hover:from-[#F0D48D] hover:to-[#D9B96E] text-[#06141B] font-bold text-xs uppercase tracking-wider font-mono py-2.5 px-4 rounded-xl shadow-lg shadow-[#D9B96E]/20 hover:shadow-[#D9B96E]/40 transition duration-200 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Подключить бота</span>
            <ExternalLink className="w-3 h-3" />
          </a>

          <Tooltip content="Скопировать персональную ссылку для привязки">
            <button
              onClick={handleCopyCommand}
              className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl border border-[#1C3945] bg-[#0D222C] hover:bg-[#102833] hover:border-[#D9B96E]/40 text-xs font-mono text-[#A8B4B7] hover:text-[#F2F0E8] transition cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Скопировано' : 'Ссылка'}</span>
            </button>
          </Tooltip>

          <Tooltip content="Проверить статус привязки">
            <button
              onClick={handleCheckConnection}
              disabled={refreshing}
              aria-label="Проверить привязку"
              className="p-2.5 rounded-xl border border-[#1C3945] bg-[#0D222C] hover:bg-[#102833] hover:border-[#D9B96E]/40 text-[#A8B4B7] hover:text-[#F2F0E8] transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#D9B96E]' : ''}`} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
