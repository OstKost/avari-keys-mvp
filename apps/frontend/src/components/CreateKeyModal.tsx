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

  const handleDeviceNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow Latin letters, digits, underscore, and dash
    const filtered = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
    setDeviceName(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId) {
      setError('Пожалуйста, выберите сервер');
      return;
    }
    const cleanName = deviceName.trim();
    if (!cleanName) {
      setError('Пожалуйста, укажите имя устройства');
      return;
    }

    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(cleanName)) {
      setError('Имя устройства может содержать только латинские буквы, цифры, дефис и подчеркивание (a-z, 0-9, _, -)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onCreate(selectedNodeId, cleanName);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка создания ключа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#06141B]/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0A1D26] border border-[#1C3945] hover:border-[#D9B96E]/50 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl shadow-black/90 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-[#A8B4B7] hover:text-[#F2F0E8] p-1.5 rounded-xl hover:bg-[#102833] border border-transparent hover:border-[#1C3945] transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3.5 mb-6">
          <div className="bg-[#102833] p-3 rounded-2xl text-[#D9B96E] border border-[#1C3945]">
            <Plus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-bold text-[#F2F0E8] tracking-wide">Создать VPN Ключ</h3>
            <p className="text-xs text-[#A8B4B7] mt-0.5 font-sans">Выберите тип туннелирования и назовите устройство</p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs p-3.5 rounded-xl mb-5 shadow-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Node Selection */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-[#A8B4B7] uppercase tracking-wider mb-2.5">
              Тип подключения / Сервер
            </label>
            <div className="space-y-2.5">
              {nodes.map((node) => (
                <label
                  key={node.id}
                  className={`flex items-start p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                    selectedNodeId === node.id
                      ? 'border-[#D9B96E] bg-[#102833] shadow-lg shadow-[#D9B96E]/10'
                      : 'border-[#1C3945] bg-[#0D222C] hover:border-[#1C3945]/80 hover:bg-[#0D222C]/80'
                  }`}
                >
                  <input
                    type="radio"
                    name="node"
                    value={node.id}
                    checked={selectedNodeId === node.id}
                    onChange={() => setSelectedNodeId(node.id)}
                    className="mt-1 text-[#D9B96E] focus:ring-[#D9B96E] accent-[#D9B96E]"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-[#F2F0E8]">{node.name}</span>
                      <span
                        className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          node.type === 'cascade'
                            ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                            : 'bg-[#06141B] text-[#6EA8C4] border border-[#6EA8C4]/40'
                        }`}
                      >
                        {node.type === 'cascade' ? 'Каскад M0->S1' : 'Прямой S2'}
                      </span>
                    </div>
                    <p className="text-xs text-[#A8B4B7] mt-1 font-sans leading-relaxed">
                      {node.type === 'cascade'
                        ? 'Вход через РФ, выход за рубежом (максимальная защита от DPI и блокировок)'
                        : 'Прямой туннель к зарубежному серверу'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Device Name Input */}
          <div>
            <label className="block text-[11px] font-mono font-semibold text-[#A8B4B7] uppercase tracking-wider mb-1.5">
              Имя устройства / Заметка
            </label>
            <input
              type="text"
              placeholder="например: iphone_15, macbook-pro, home_pc"
              value={deviceName}
              onChange={handleDeviceNameChange}
              pattern="^[a-zA-Z0-9_-]{1,64}$"
              title="Только латинские буквы, цифры, дефис и знак подчеркивания"
              className="w-full bg-[#0D222C] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl px-4 py-3 text-sm text-[#F2F0E8] placeholder-[#718187] focus:outline-none focus:ring-1 focus:ring-[#D9B96E]/50 transition shadow-inner font-mono"
              required
            />
            <p className="text-[10px] text-[#718187] font-mono mt-1.5">
              * Разрешены только латинские буквы (a-z, A-Z), цифры (0-9), дефис (-) и подчеркивание (_)
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] hover:from-[#F0D48D] hover:to-[#D9B96E] text-[#06141B] font-bold font-mono text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl shadow-lg shadow-[#D9B96E]/20 hover:shadow-[#D9B96E]/40 disabled:opacity-50 transition-all duration-300 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span>Генерация AmneziaWG ключа...</span>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-current" />
                <span>Сгенерировать ключ</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
