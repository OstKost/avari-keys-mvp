import { useState } from 'react';
import { CreditCard, Clock, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

interface BillingReminderModalProps {
  daysRemaining: number;
  recommendedAmount?: number;
  keyCount?: number;
  onPay: (note?: string) => Promise<void>;
  onSnooze: (days?: number) => Promise<void>;
  onOpenBillingTab: () => void;
}

export function BillingReminderModal({
  daysRemaining,
  recommendedAmount = 200,
  keyCount = 0,
  onPay,
  onSnooze,
  onOpenBillingTab,
}: BillingReminderModalProps) {
  const [loadingPay, setLoadingPay] = useState(false);
  const [loadingSnooze, setLoadingSnooze] = useState(false);

  const handlePay = async () => {
    try {
      setLoadingPay(true);
      await onPay();
    } finally {
      setLoadingPay(false);
    }
  };

  const handleSnooze = async () => {
    try {
      setLoadingSnooze(true);
      await onSnooze(1);
    } finally {
      setLoadingSnooze(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040C10]/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0A1D26] border-2 border-[#D9B96E]/50 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden text-[#F2F0E8] selection:bg-[#D9B96E]/30">
        
        {/* Elven background glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[radial-gradient(circle_at_100%_0%,rgba(217,185,110,0.15)_0%,transparent_70%)] pointer-events-none" />

        {/* Header with Icon */}
        <div className="flex items-start space-x-4 mb-6">
          <div className="p-3.5 rounded-2xl bg-[#102833] border border-[#D9B96E]/40 text-[#F0D48D] shadow-lg shadow-[#D9B96E]/10 flex-shrink-0">
            <CreditCard className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-950/80 text-[#F0D48D] border border-amber-600/40">
                Период 30 дней
              </span>
              <Sparkles className="w-3.5 h-3.5 text-[#D9B96E]" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-[#F2F0E8] mt-1 tracking-wide">
              Кооперативный взнос
            </h3>
          </div>
        </div>

        {/* Body Message */}
        <div className="space-y-4 mb-8">
          <p className="text-sm sm:text-base text-[#D0D9DC] leading-relaxed">
            Уважаемый хранитель! Наступил очередной 30-дневный период для внесения кооперативного взноса на поддержание серверов и сетевой инфраструктуры Avari Keys.
          </p>

          <div className="bg-[#06141B] border border-[#1C3945] rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-[#D9B96E]" />
                <span className="text-xs font-mono text-[#A8B4B7]">Статус взноса:</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400">
                {daysRemaining <= 0 ? 'Срок внесения наступил' : `Осталось ${daysRemaining} дн.`}
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1C3945]">
              <span className="text-xs font-mono text-[#A8B4B7]">Рекомендуемый размер ({keyCount} кл.):</span>
              <span className="text-xs font-mono font-bold text-[#F0D48D]">{recommendedAmount} ₽</span>
            </div>
          </div>
        </div>

        {/* Actions: 2 Main Buttons */}
        <div className="space-y-3">
          <button
            onClick={handlePay}
            disabled={loadingPay || loadingSnooze}
            className="w-full flex items-center justify-center space-x-2.5 bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] hover:from-[#F0D48D] hover:to-[#D9B96E] text-[#06141B] font-bold text-sm uppercase tracking-wider font-mono py-3.5 px-6 rounded-xl shadow-lg shadow-[#D9B96E]/20 hover:shadow-[#D9B96E]/40 transition duration-200 disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 text-[#06141B]" />
            <span>{loadingPay ? 'Сохранение...' : 'Оплачено'}</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleSnooze}
              disabled={loadingPay || loadingSnooze}
              className="flex items-center justify-center space-x-2 bg-[#102833] hover:bg-[#163544] text-[#D0D9DC] hover:text-[#F2F0E8] border border-[#1C3945] font-mono text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition duration-200 disabled:opacity-50 cursor-pointer"
            >
              <Clock className="w-4 h-4 text-[#A8B4B7]" />
              <span>{loadingSnooze ? 'Откладываем...' : 'Напомнить завтра'}</span>
            </button>

            <button
              onClick={onOpenBillingTab}
              disabled={loadingPay || loadingSnooze}
              className="flex items-center justify-center space-x-2 bg-[#0D222C] hover:bg-[#102833] text-[#D9B96E] hover:text-[#F0D48D] border border-[#D9B96E]/30 font-mono text-xs uppercase tracking-wider py-3 px-4 rounded-xl transition duration-200 disabled:opacity-50 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Реквизиты</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
