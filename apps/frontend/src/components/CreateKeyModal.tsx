import { useState } from 'react';
import { X, Plus, Zap } from 'lucide-react';
import { NodePublic } from '../types';

interface Props {
  nodes: NodePublic[];
  onClose: () => void;
  onCreate: (nodeId: number, deviceName: string) => Promise<void>;
}

export function CreateKeyModal({ nodes, onClose, onCreate }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<number>(nodes[0]?.id || 0);
  const [deviceName, setDeviceName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId) {
      setError('Пожалуйста, выберите сервер');
      return;
    }
    if (!deviceName.trim()) {
      setError('Пожалуйста, укажите имя устройства (например, iPhone, Ноутбук)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onCreate(selectedNodeId, deviceName.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания ключа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-brand-600/20 p-2.5 rounded-xl text-brand-400 border border-brand-500/20">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Создать VPN Ключ</h3>
            <p className="text-xs text-slate-400">Выберите тип подключения и укажите устройство</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs p-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Node Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Тип подключения / Сервер
            </label>
            <div className="space-y-2">
              {nodes.map((node) => (
                <label
                  key={node.id}
                  className={`flex items-start p-3 rounded-xl border cursor-pointer transition ${
                    selectedNodeId === node.id
                      ? 'border-brand-500 bg-brand-950/30 shadow-md shadow-brand-950/50'
                      : 'border-slate-800 bg-slate-950/50 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="node"
                    value={node.id}
                    checked={selectedNodeId === node.id}
                    onChange={() => setSelectedNodeId(node.id)}
                    className="mt-1 text-brand-600 focus:ring-brand-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-slate-100">{node.name}</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          node.type === 'cascade'
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                            : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                        }`}
                      >
                        {node.type === 'cascade' ? 'Каскад M0->S1' : 'Прямой S2'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {node.type === 'cascade'
                        ? 'Вход через РФ, выход за рубежом (максимальная защита от блокировок)'
                        : 'Прямое подключение к зарубежному серверу'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Device Name Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Имя устройства / заметка
            </label>
            <input
              type="text"
              placeholder="например: iPhone, MacBook, Домашний ПК"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium py-3 px-4 rounded-xl shadow-lg shadow-brand-600/30 transition flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Генерация AmneziaWG ключа...</span>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Сгенерировать конфигурацию</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
