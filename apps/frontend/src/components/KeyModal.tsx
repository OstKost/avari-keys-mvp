import { useState, useEffect } from 'react';
import { X, Copy, Check, Download, QrCode as QrIcon } from 'lucide-react';
import QRCode from 'qrcode';
import { ClientConfigDetail } from '../types';

interface Props {
  keyData: ClientConfigDetail;
  onClose: () => void;
}

export function KeyModal({ keyData, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    if (keyData.qr_code && keyData.qr_code.startsWith('data:')) {
      setQrUrl(keyData.qr_code);
    } else if (keyData.config) {
      QRCode.toDataURL(keyData.config, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      }).then(setQrUrl).catch(console.error);
    }
  }, [keyData]);

  const handleCopy = () => {
    navigator.clipboard.writeText(keyData.config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([keyData.config], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${keyData.client_name}.conf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-brand-600/20 p-2.5 rounded-xl text-brand-400 border border-brand-500/20">
            <QrIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">{keyData.device_name}</h3>
            <p className="text-xs text-slate-400">
              Сервер: <span className="text-slate-200 font-medium">{keyData.node_name}</span> ({keyData.node_type === 'cascade' ? 'Каскад' : 'Прямой'})
            </p>
          </div>
        </div>

        {/* QR Code */}
        {qrUrl ? (
          <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl mb-4 border border-slate-700 shadow-inner">
            <img src={qrUrl} alt="AmneziaWG QR Code" className="w-56 h-56 object-contain" />
            <span className="text-xs text-slate-600 mt-2 font-medium">Отсканируйте в приложении AmneziaWG</span>
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 bg-slate-800 rounded-xl mb-4 text-slate-400 text-sm">
            Генерация QR-кода...
          </div>
        )}

        {/* Config text box */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Файл конфигурации (.conf)</span>
          </div>
          <pre className="bg-slate-950 border border-slate-800 text-slate-300 text-xs p-3 rounded-lg overflow-x-auto max-h-32 font-mono scrollbar-thin">
            {keyData.config}
          </pre>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 px-4 rounded-xl border border-slate-700 transition"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Скопировано!' : 'Скопировать'}</span>
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-500 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-brand-600/20 transition"
          >
            <Download className="w-4 h-4" />
            <span>Скачать .conf</span>
          </button>
        </div>
      </div>
    </div>
  );
}
