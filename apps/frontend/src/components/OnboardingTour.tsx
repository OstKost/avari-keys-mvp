import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ArrowRight, Check, X, Smartphone, Zap, QrCode } from 'lucide-react';
import { MascotAvatar } from './MascotAssistant';

export interface OnboardingStep {
  step: number;
  title: string;
  description: string;
  targetHint?: string;
  icon?: React.ReactNode;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    step: 1,
    title: 'Шаг 1: Создание первого ключа',
    description: 'Добро пожаловать в Avari Keys! Давайте создадим ваш первый AmneziaWG ключ для безопасного доступа к свободному интернету.',
    targetHint: 'Нажмите золотую кнопку «Создать новый ключ» в правом верхнем углу списка.',
    icon: <Sparkles className="w-5 h-5 text-[#D9B96E]" />
  },
  {
    step: 2,
    title: 'Шаг 2: Выбор сервера и имя устройства',
    description: 'Выберите нужный сервер (Direct для скорости или Cascade для обхода блокировок) и укажите понятное имя устройства (например, iPhone-Alex или Mac-Work).',
    targetHint: 'Для каждого телефона или ноутбука рекомендуется создавать свой отдельный ключ.',
    icon: <Smartphone className="w-5 h-5 text-[#6EA8C4]" />
  },
  {
    step: 3,
    title: 'Шаг 3: Дополнительная защита (PSK)',
    description: 'Опция PSK добавляет симметричный 256-битный ключ постквантового шифрования, который защищает трафик даже от будущих суперкомпьютеров.',
    targetHint: 'Рекомендуем оставлять эту опцию включенной.',
    icon: <Zap className="w-5 h-5 text-[#F0D48D]" />
  },
  {
    step: 4,
    title: 'Шаг 4: Подключение в AmneziaWG',
    description: 'После создания ключа откройте приложение AmneziaWG на телефоне и отсканируйте появившийся QR-код. Для ПК просто скачайте файл .conf.',
    targetHint: 'Включите тумблер в приложении — и ваш интернет защищен!',
    icon: <QrCode className="w-5 h-5 text-emerald-400" />
  }
];

interface OnboardingTourProps {
  isActive: boolean;
  onComplete: () => void;
  currentStep?: number;
}

export function OnboardingTour({
  isActive,
  onComplete,
  currentStep: propStep,
}: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    if (propStep !== undefined && propStep >= 1 && propStep <= ONBOARDING_STEPS.length) {
      setCurrentStepIndex(propStep - 1);
    }
  }, [propStep]);

  if (!isActive) return null;

  const currentStepData = ONBOARDING_STEPS[currentStepIndex];
  const isLast = currentStepIndex === ONBOARDING_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStepIndex((prev) => Math.min(prev + 1, ONBOARDING_STEPS.length - 1));
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return createPortal(
    <div className="fixed bottom-24 sm:bottom-8 left-4 right-4 sm:left-auto sm:right-8 z-50 max-w-md w-full animate-slideUp">
      <div className="bg-[#0A1D26]/95 border-2 border-[#D9B96E] rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-xl shadow-black/90 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[radial-gradient(circle_at_100%_0%,rgba(217,185,110,0.15)_0%,transparent_70%)] pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <MascotAvatar size="sm" />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#D9B96E]">
                  Обучение ({currentStepIndex + 1} из {ONBOARDING_STEPS.length})
                </span>
              </div>
              <h4 className="font-serif font-bold text-base text-[#F2F0E8] leading-tight mt-0.5">
                {currentStepData.title}
              </h4>
            </div>
          </div>
          <button
            onClick={handleSkip}
            title="Пропустить обучение"
            className="text-[#718187] hover:text-[#F2F0E8] p-1.5 rounded-lg hover:bg-[#102833] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description & Hint */}
        <p className="text-xs sm:text-sm text-[#D9E1E3] font-sans leading-relaxed mb-3">
          {currentStepData.description}
        </p>

        {currentStepData.targetHint && (
          <div className="bg-[#102833]/80 border border-[#D9B96E]/30 rounded-xl p-2.5 text-xs text-[#F0D48D] flex items-start space-x-2 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-[#D9B96E] flex-shrink-0 mt-0.5" />
            <span>{currentStepData.targetHint}</span>
          </div>
        )}

        {/* Progress Bar & Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#1C3945]/70">
          <div className="flex space-x-1.5">
            {ONBOARDING_STEPS.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentStepIndex
                    ? 'w-6 bg-[#D9B96E]'
                    : idx < currentStepIndex
                    ? 'w-3 bg-[#6EA8C4]'
                    : 'w-2 bg-[#1C3945]'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSkip}
              className="text-xs font-mono uppercase tracking-wider text-[#A8B4B7] hover:text-[#F2F0E8] px-2.5 py-1.5 rounded-lg transition"
            >
              Пропустить
            </button>
            <button
              onClick={handleNext}
              className="bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] hover:from-[#F0D48D] hover:to-[#D9B96E] text-[#06141B] font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wider font-mono shadow-md shadow-[#D9B96E]/20 flex items-center space-x-1.5 transition cursor-pointer"
            >
              {isLast ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Завершить</span>
                </>
              ) : (
                <>
                  <span>Далее</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
