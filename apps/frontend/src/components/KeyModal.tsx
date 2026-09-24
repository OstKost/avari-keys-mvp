import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, Download, QrCode as QrIcon, FileText, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import QRCode from 'qrcode';
import { ClientConfigDetail } from '../types';
import { useToast } from '../context/ToastContext';

interface Props {
  keyData: ClientConfigDetail;
  onClose: () => void;
}

// Client-side sanitizer for AmneziaWG / WireGuard config
function sanitizeConfig(raw: string): string {
  if (!raw) return '';
  // Strip ANSI codes
  const withoutAnsi = raw.replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b\([a-zA-Z]/g, '');
  const lines = withoutAnsi.split(/\r?\n/);
  const result: string[] = [];
  let inConfig = false;
  let seenPeer = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inConfig) {
      if (trimmed.toLowerCase() === '[interface]') {
        inConfig = true;
        result.push('[Interface]');
      }
      continue;
    }

    // Stop on QR Code ASCII art or banners
    if (
      trimmed.startsWith('QR Code') ||
      trimmed.startsWith('Scan ') ||
      trimmed.startsWith('===') ||
      trimmed.startsWith('---') ||
      /[█▀▄░▒▓]/.test(trimmed)
    ) {
      break;
    }

    if (trimmed.toLowerCase() === '[peer]') {
      seenPeer = true;
      result.push('[Peer]');
      continue;
    }

    if (trimmed.toLowerCase() === '[interface]') {
      result.push('[Interface]');
      continue;
    }

    if (trimmed === '') {
      if (result.length > 0 && result[result.length - 1] !== '') {
        result.push('');
      }
      continue;
    }

    if (trimmed.startsWith('#') || trimmed.includes('=')) {
      result.push(trimmed);
      continue;
    }

    if (seenPeer) {
      break;
    }
  }

  // Trim trailing empty lines
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop();
  }

  return inConfig && result.length > 0 ? result.join('\n') : '';
}

export function KeyModal({ keyData, onClose }: Props) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [showRawLogs, setShowRawLogs] = useState(false);

  const cleanConfig = useMemo(() => sanitizeConfig(keyData.config || ''), [keyData.config]);
  const isValidConfig = useMemo(() => {
    return Boolean(cleanConfig && cleanConfig.includes('[Interface]') && cleanConfig.includes('[Peer]'));
  }, [cleanConfig]);

  const rawWithoutAnsi = useMemo(() => {
    return (keyData.config || '').replace(/\x1b\[[0-9;]*[a-zA-Z]|\x1b\([a-zA-Z]/g, '').trim();
  }, [keyData.config]);

  useEffect(() => {
    if (!isValidConfig) {
      setQrUrl('');
      return;
    }

    if (keyData.qr_code && keyData.qr_code.startsWith('data:image/')) {
      setQrUrl(keyData.qr_code);
    } else if (cleanConfig) {
      QRCode.toDataURL(cleanConfig, {
        width: 320,
        margin: 2,
        color: { dark: '#06141B', light: '#FFFFFF' },
      })
        .then(setQrUrl)
        .catch(console.error);
    }
  }, [keyData, cleanConfig, isValidConfig]);

  const handleCopy = () => {
    if (!isValidConfig) {
      toast.error('Конфигурация некорректна, копирование невозможно');
      return;
    }
    navigator.clipboard.writeText(cleanConfig);
    setCopied(true);
    toast.success('Конфигурация AmneziaWG скопирована в буфер обмена');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!isValidConfig) {
      toast.error('Конфигурация некорректна, скачивание невозможно');
      return;
    }
    const blob = new Blob([cleanConfig], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${keyData.client_name}.conf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Файл ${keyData.client_name}.conf скачан`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[999] bg-[#06141B]/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0A1D26] border border-[#1C3945] hover:border-[#D9B96E]/50 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl shadow-black/90 relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#A8B4B7] hover:text-[#F2F0E8] p-2 rounded-xl hover:bg-[#102833] border border-transparent hover:border-[#1C3945] transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Title */}
        <div className="flex items-center space-x-3.5 mb-6">
          <div className="bg-[#102833] p-3.5 rounded-2xl text-[#D9B96E] border border-[#1C3945]">
            <QrIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-2xl font-bold text-[#F2F0E8] tracking-wide">{keyData.device_name}</h3>
            <p className="text-sm text-[#A8B4B7] mt-0.5 font-sans">
              Сервер: <strong className="text-[#D9B96E] font-medium">{keyData.node_name}</strong> ({keyData.node_type === 'cascade' ? 'Каскад' : 'Прямой'})
            </p>
          </div>
        </div>

        {/* High contrast QR Container or Error State */}
        {isValidConfig ? (
          qrUrl ? (
            <div className="flex flex-col items-center justify-center bg-white p-5 rounded-2xl mb-5 shadow-2xl border-4 border-[#102833]">
              <img src={qrUrl} alt="AmneziaWG QR Code" className="w-60 h-60 object-contain rounded-lg" />
              <span className="text-sm text-slate-800 font-mono tracking-wider font-semibold mt-3">
                Сканируйте в приложении AmneziaWG
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-center h-60 bg-[#06141B] rounded-2xl mb-5 text-[#718187] text-sm font-mono">
              Генерация AmneziaWG QR...
            </div>
          )
        ) : (
          <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 mb-5 text-amber-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1.5 font-sans">
                <p className="font-semibold text-amber-300">Конфигурация не найдена на сервере</p>
                <p className="text-amber-200/80 leading-relaxed">
                  Узел не вернул файл конфигурации AmneziaWG. Убедитесь, что на сервере <strong>{keyData.node_name}</strong> обновлен и перезапущен сервис <code>avari-slave</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Config text box or error diagnostics */}
        {isValidConfig ? (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-mono font-semibold text-[#D9B96E] uppercase tracking-wider flex items-center space-x-1.5">
                <FileText className="w-4 h-4" />
                <span>Конфигурационный файл (.conf)</span>
              </span>
              <span className="text-sm text-[#A8B4B7] font-mono">AmneziaWG Protocol</span>
            </div>
            <pre className="bg-[#06141B] border border-[#1C3945] text-[#F2F0E8] text-sm p-4 rounded-xl overflow-x-auto max-h-40 font-mono scrollbar-thin leading-relaxed">
              {cleanConfig}
            </pre>
          </div>
        ) : (
          <div className="mb-6">
            <button
              onClick={() => setShowRawLogs(!showRawLogs)}
              className="flex items-center justify-between w-full text-sm font-mono text-[#A8B4B7] hover:text-[#D9B96E] py-1 transition"
            >
              <span>{showRawLogs ? 'Скрыть технический ответ узла' : 'Показать технический ответ узла'}</span>
              {showRawLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {showRawLogs && (
              <pre className="mt-2 bg-[#06141B] border border-[#1C3945] text-red-300/80 text-sm p-3.5 rounded-xl overflow-x-auto max-h-36 font-mono scrollbar-thin leading-relaxed whitespace-pre-wrap break-all">
                {rawWithoutAnsi || 'Пустой ответ'}
              </pre>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3.5">
          <button
            onClick={handleCopy}
            disabled={!isValidConfig}
            className={`flex items-center justify-center space-x-2 bg-[#102833] text-[#F2F0E8] font-mono text-sm uppercase tracking-wider py-3.5 px-4 rounded-xl border border-[#1C3945] transition ${
              isValidConfig ? 'hover:bg-[#1C3945] hover:border-[#D9B96E]/50 cursor-pointer' : 'opacity-40 cursor-not-allowed'
            }`}
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#D9B96E]" />}
            <span>{copied ? 'Скопировано!' : 'Скопировать'}</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={!isValidConfig}
            className={`flex items-center justify-center space-x-2 bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] text-[#06141B] font-bold font-mono text-sm uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg transition ${
              isValidConfig
                ? 'hover:from-[#F0D48D] hover:to-[#D9B96E] shadow-[#D9B96E]/20 hover:shadow-[#D9B96E]/40 cursor-pointer'
                : 'opacity-40 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Скачать .conf</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

