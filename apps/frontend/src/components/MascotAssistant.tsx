import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, HelpCircle, X, ChevronRight, ChevronDown, BookOpen, RotateCcw, Shield } from 'lucide-react';
import { MASCOT_FAQ_QUESTIONS } from '../utils/faqData';

// Mascot Avatar sub-component
export function MascotAvatar({ 
  size = 'md', 
  className = '',
  withGlow = true,
  onClick
}: { 
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; 
  className?: string;
  withGlow?: boolean;
  onClick?: () => void;
}) {
  const sizeClasses = {
    xs: 'w-7 h-7',
    sm: 'w-10 h-10',
    md: 'w-14 h-14',
    lg: 'w-20 h-20',
    xl: 'w-28 h-28',
  };

  return (
    <div 
      onClick={onClick}
      className={`relative inline-flex items-center justify-center flex-shrink-0 group ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {withGlow && (
        <div className="absolute -inset-1 bg-gradient-to-r from-[#D9B96E]/40 via-[#F0D48D]/30 to-[#6EA8C4]/40 rounded-full blur-md opacity-75 group-hover:opacity-100 group-hover:scale-105 transition duration-300 pointer-events-none animate-pulse" />
      )}
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-[#D9B96E] bg-[#0A1D26] shadow-lg shadow-black/60 transition-transform duration-300 group-hover:scale-105`}>
        <img 
          src="/assets/mascot.png" 
          alt="Avari Keys Assistant" 
          className="w-full h-full object-cover object-top filter contrast-[1.05]"
        />
      </div>
    </div>
  );
}

// 5 Popular Questions & Answers Modal
export function MascotFaqModal({
  isOpen,
  onClose,
  initialQuestionId
}: {
  isOpen: boolean;
  onClose: () => void;
  initialQuestionId?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialQuestionId || MASCOT_FAQ_QUESTIONS[0].id);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] bg-[#06141B]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-[#0A1D26] border border-[#1C3945] hover:border-[#D9B96E]/50 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl shadow-black/90 relative my-auto transition-all duration-300 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-[#1C3945]/80">
          <div className="flex items-center space-x-3.5">
            <MascotAvatar size="md" />
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif text-2xl font-bold text-[#F2F0E8] tracking-wide">
                  База знаний Хранителя
                </h3>
                <span className="text-xs font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#102833] text-[#D9B96E] border border-[#D9B96E]/30">
                  5 ответов
                </span>
              </div>
              <p className="text-sm text-[#A8B4B7] mt-0.5 font-sans">
                Самые популярные вопросы и подсказки для комфортного использования Avari Keys
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#A8B4B7] hover:text-[#F2F0E8] p-2 rounded-xl hover:bg-[#102833] border border-transparent hover:border-[#1C3945] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Questions Accordion / List */}
        <div className="overflow-y-auto flex-1 my-5 pr-1 space-y-3 custom-scrollbar">
          {MASCOT_FAQ_QUESTIONS.map((faq, index) => {
            const isExpanded = selectedId === faq.id;
            return (
              <div 
                key={faq.id}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                  isExpanded 
                    ? 'border-[#D9B96E]/80 bg-[#102833] shadow-lg shadow-[#D9B96E]/5' 
                    : 'border-[#1C3945] bg-[#0D222C]/90 hover:border-[#1C3945]/80 hover:bg-[#0D222C]'
                }`}
              >
                <button
                  onClick={() => setSelectedId(isExpanded ? null : faq.id)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#06141B] border border-[#1C3945] text-[#D9B96E] font-mono text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className="font-serif font-bold text-base text-[#F2F0E8]">
                          {faq.question}
                        </span>
                        {faq.badge && (
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#06141B] text-[#6EA8C4] border border-[#6EA8C4]/30">
                            {faq.badge}
                          </span>
                        )}
                      </div>
                      {!isExpanded && (
                        <p className="text-xs text-[#A8B4B7] mt-1 font-sans line-clamp-1">
                          {faq.shortAnswer}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-[#A8B4B7] flex-shrink-0">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-[#D9B96E]" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 text-sm text-[#F2F0E8] font-sans border-t border-[#1C3945]/50 bg-[#0A1D26]/60">
                    <div className="whitespace-pre-line leading-relaxed text-[#D9E1E3] space-y-2 mt-2">
                      {faq.fullAnswer}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#1C3945]/80 flex items-center justify-between">
          <span className="text-xs text-[#718187] font-mono flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-[#D9B96E]" />
            <span>Avari Keys • AmneziaWG Guide</span>
          </span>
          <button
            onClick={onClose}
            className="bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] hover:from-[#F0D48D] hover:to-[#D9B96E] text-[#06141B] font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-[#D9B96E]/20 text-sm uppercase tracking-wider font-mono cursor-pointer transition"
          >
            Понятно, спасибо!
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Help Bubble placed right above the Mascot (Used in CreateKeyModal or elsewhere)
export function MascotHelpBubble({
  title = "Нужна помощь?",
  subtitle = "5 ответов на частые вопросы",
  onClickFaq,
}: {
  title?: string;
  subtitle?: string;
  onClickFaq: () => void;
}) {
  return (
    <div className="flex items-center space-x-3 bg-[#102833]/90 border border-[#D9B96E]/40 hover:border-[#D9B96E] p-2.5 sm:p-3 rounded-2xl shadow-lg transition-all duration-300 group">
      <MascotAvatar size="sm" onClick={onClickFaq} />
      <div className="flex-1 cursor-pointer" onClick={onClickFaq}>
        <div className="flex items-center space-x-1.5">
          <span className="font-serif font-bold text-sm text-[#F0D48D] group-hover:text-gold-gradient transition">
            {title}
          </span>
          <Sparkles className="w-3.5 h-3.5 text-[#D9B96E] animate-bounce" />
        </div>
        <p className="text-xs text-[#A8B4B7] font-sans">
          {subtitle}
        </p>
      </div>
      <button
        onClick={onClickFaq}
        className="px-3 py-1.5 rounded-xl bg-[#0A1D26] hover:bg-[#D9B96E] text-[#D9B96E] hover:text-[#06141B] border border-[#D9B96E]/40 text-xs font-mono font-bold uppercase tracking-wider transition cursor-pointer flex items-center space-x-1"
      >
        <BookOpen className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Открыть</span>
      </button>
    </div>
  );
}

// Auth Screen Mascot Banner / Greeting
export function MascotAuthGreeting({
  isRegister = false
}: {
  isRegister?: boolean;
}) {
  return (
    <div className="mb-6 bg-[#102833]/70 border border-[#D9B96E]/30 rounded-2xl p-4 flex items-center space-x-3.5 shadow-lg relative overflow-hidden backdrop-blur-sm">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_100%_0%,rgba(217,185,110,0.12)_0%,transparent_70%)] pointer-events-none" />
      <MascotAvatar size="md" />
      <div className="flex-1">
        <div className="flex items-center space-x-1.5 text-xs font-mono font-bold text-[#D9B96E] uppercase tracking-wider mb-0.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Помощник Avari</span>
        </div>
        <p className="text-xs sm:text-sm text-[#F2F0E8] font-sans leading-snug">
          {isRegister
            ? 'Приветствую! Создайте аккаунт, и после подтверждения я помогу настроить ваш первый AmneziaWG ключ.'
            : 'Рад снова вас видеть! Войдите в систему для управления вашими защищенными туннелями.'}
        </p>
      </div>
    </div>
  );
}

// Floating mascot in the corner with interactive drawer / quick menu
export function FloatingMascot({
  onOpenFaq,
  onStartOnboarding,
}: {
  onOpenFaq: () => void;
  onStartOnboarding: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('avari_mascot_collapsed') === 'true';
  });

  const handleToggleCollapse = () => {
    const next = !isDismissed;
    setIsDismissed(next);
    localStorage.setItem('avari_mascot_collapsed', String(next));
    if (next) setIsOpen(false);
  };

  if (isDismissed) {
    return (
      <div className="fixed bottom-5 right-5 z-40">
        <button
          onClick={handleToggleCollapse}
          title="Открыть помощника"
          className="relative group p-2.5 rounded-full bg-[#0A1D26] border border-[#D9B96E]/50 hover:border-[#D9B96E] shadow-2xl text-[#D9B96E] hover:text-[#F0D48D] transition-transform duration-300 hover:scale-110 flex items-center justify-center cursor-pointer"
        >
          <MascotAvatar size="sm" withGlow={false} />
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#D9B96E] rounded-full border-2 border-[#06141B] animate-ping" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end">
      {/* Quick Menu Popover */}
      {isOpen && (
        <div className="mb-3 w-72 sm:w-80 bg-[#0A1D26]/95 border border-[#D9B96E]/50 rounded-3xl p-4 shadow-2xl backdrop-blur-xl shadow-black/80 animate-slideUp">
          <div className="flex items-center justify-between pb-3 border-b border-[#1C3945]">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-[#D9B96E]" />
              <span className="font-serif font-bold text-sm text-[#F2F0E8]">Помощник Forve</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#A8B4B7] hover:text-[#F2F0E8] p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#A8B4B7] my-3 font-sans leading-relaxed">
            Я помогу быстро разобраться в настройке и подключении AmneziaWG VPN.
          </p>

          <div className="space-y-2">
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenFaq();
              }}
              className="w-full text-left p-2.5 rounded-xl bg-[#102833] hover:bg-[#163442] border border-[#1C3945] hover:border-[#D9B96E]/40 text-[#F2F0E8] text-xs font-medium flex items-center justify-between transition cursor-pointer group"
            >
              <div className="flex items-center space-x-2">
                <HelpCircle className="w-4 h-4 text-[#D9B96E]" />
                <span>5 частых вопросов (FAQ)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#718187] group-hover:text-[#D9B96E] transition" />
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                onStartOnboarding();
              }}
              className="w-full text-left p-2.5 rounded-xl bg-[#102833] hover:bg-[#163442] border border-[#1C3945] hover:border-[#D9B96E]/40 text-[#F2F0E8] text-xs font-medium flex items-center justify-between transition cursor-pointer group"
            >
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-4 h-4 text-[#6EA8C4]" />
                <span>Пройти обучение заново</span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#718187] group-hover:text-[#6EA8C4] transition" />
            </button>
          </div>

          <div className="mt-3 pt-2 text-center border-t border-[#1C3945]/50 flex justify-between items-center text-[11px] text-[#718187]">
            <button
              onClick={handleToggleCollapse}
              className="hover:text-[#A8B4B7] transition cursor-pointer"
            >
              Свернуть иконку
            </button>
            <span className="font-mono">Avari v0.1</span>
          </div>
        </div>
      )}

      {/* Floating Trigger Button with Speech Bubble */}
      <div className="flex items-center space-x-2.5">
        {!isOpen && (
          <div 
            onClick={() => setIsOpen(true)}
            className="cursor-pointer bg-[#0A1D26]/90 border border-[#D9B96E]/40 hover:border-[#D9B96E] py-2 px-3.5 rounded-2xl shadow-xl backdrop-blur-md text-xs text-[#F2F0E8] font-sans flex items-center space-x-2 transition hover:scale-105"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-serif font-bold text-[#F0D48D]">Нужна помощь?</span>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative group p-1 rounded-full bg-[#0A1D26] border-2 border-[#D9B96E] shadow-2xl hover:scale-110 transition-transform duration-300 cursor-pointer"
        >
          <MascotAvatar size="md" withGlow={true} />
        </button>
      </div>
    </div>
  );
}
