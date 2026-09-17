import { useState, useEffect } from 'react';
import { Server, Plus, Trash2, CheckCircle2, XCircle, RefreshCw, RotateCcw, Download, Upload, X } from 'lucide-react';
import { api } from '../api/client';
import { AdminNode } from '../types';
import { ConfirmModal } from './ConfirmModal';
import { useToast } from '../context/ToastContext';

export function AdminNodes() {
  const { toast } = useToast();
  const [nodes, setNodes] = useState<AdminNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  // Form state for adding node
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'cascade' | 'direct'>('cascade');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Action modals state
  const [restartingNode, setRestartingNode] = useState<AdminNode | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);

  const [nodeToDelete, setNodeToDelete] = useState<AdminNode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [backupNodeState, setBackupNodeState] = useState<{ node: AdminNode; data: string; timestamp: string } | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const [restoringNode, setRestoringNode] = useState<AdminNode | null>(null);
  const [restoreData, setRestoreData] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const fetchNodes = async (showSpin = false) => {
    try {
      if (showSpin) setIsChecking(true);
      else setLoading(true);
      const data = await api.getAdminNodes();
      setNodes(data);
      if (showSpin) {
        const onlineCount = data.filter((n) => n.online).length;
        toast.success(`Health Check завершен: доступно ${onlineCount} из ${data.length} серверов`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Ошибка загрузки серверов');
    } finally {
      setLoading(false);
      setIsChecking(false);
    }
  };

  useEffect(() => {
    fetchNodes(false);
  }, []);

  const handleAddNode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.addAdminNode(name.trim(), type, apiUrl.trim(), apiKey.trim());
      setName('');
      setApiUrl('');
      setApiKey('');
      setShowAddForm(false);
      toast.success(`Сервер «${name}» успешно подключен`);
      await fetchNodes(false);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка добавления сервера');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!nodeToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteAdminNode(nodeToDelete.id);
      toast.success(`Сервер «${nodeToDelete.name}» удален`);
      setNodeToDelete(null);
      await fetchNodes(false);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка удаления ноды');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRestartConfirm = async () => {
    if (!restartingNode) return;
    try {
      setIsRestarting(true);
      const res = await api.restartNode(restartingNode.id);
      toast.success(res.message || `Служба AWG на сервере «${restartingNode.name}» успешно перезапущена`);
      setRestartingNode(null);
      await fetchNodes(false);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка перезапуска службы AWG');
    } finally {
      setIsRestarting(false);
    }
  };

  const handleBackupClick = async (node: AdminNode) => {
    try {
      setIsBackingUp(true);
      const res = await api.backupNode(node.id);
      setBackupNodeState({
        node,
        data: res.backup_data,
        timestamp: res.timestamp,
      });
      toast.info(`Резервная копия для «${node.name}» подготовлена`);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка создания резервной копии');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDownloadBackupFile = () => {
    if (!backupNodeState) return;
    const blob = new Blob([backupNodeState.data], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_node_${backupNodeState.node.id}_${new Date().toISOString().slice(0, 10)}.bak`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Файл резервной копии скачан');
  };

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoringNode || !restoreData.trim()) return;
    try {
      setIsRestoring(true);
      const res = await api.restoreNode(restoringNode.id, restoreData.trim());
      toast.success(res.message || `Конфигурация сервера «${restoringNode.name}» успешно восстановлена`);
      setRestoringNode(null);
      setRestoreData('');
      await fetchNodes(false);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка восстановления из резервной копии');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestoreFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setRestoreData(content);
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="font-serif text-xl font-bold text-[#F2F0E8] flex items-center space-x-2">
            <Server className="w-5 h-5 text-[#D9B96E]" />
            <span>Управление Slave-нодами AmneziaWG</span>
          </h3>
          <p className="text-xs text-[#A8B4B7] mt-1 font-sans">
            Подключение серверов AWG (Каскад M0 $\to$ S1 или автономных S2) с измерением сетевой задержки и сервисными командами.
          </p>
        </div>
        
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => fetchNodes(true)}
            disabled={isChecking}
            className="flex items-center space-x-1.5 text-xs font-mono uppercase tracking-wider bg-[#102833] hover:bg-[#1C3945] text-[#A8B4B7] hover:text-[#F2F0E8] px-3.5 py-2.5 rounded-xl border border-[#1C3945] transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-[#D9B96E]' : ''}`} />
            <span>{isChecking ? 'Проверка...' : 'Health Check'}</span>
          </button>
          
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1.5 text-xs font-mono font-bold uppercase tracking-wider bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] hover:from-[#F0D48D] hover:to-[#D9B96E] text-[#06141B] px-4 py-2.5 rounded-xl shadow-lg shadow-[#D9B96E]/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить Сервер</span>
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <form onSubmit={handleAddNode} className="bg-[#102833] border border-[#D9B96E]/40 rounded-2xl p-6 mb-6 shadow-2xl space-y-4">
          <h4 className="font-serif text-base font-bold text-[#F2F0E8]">Параметры нового Slave API</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#A8B4B7] uppercase mb-1.5">Название сервера</label>
              <input
                type="text"
                placeholder="например: Каскад M0 (MSK) -> S1 (AMS)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl px-3.5 py-2.5 text-sm text-[#F2F0E8] focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#A8B4B7] uppercase mb-1.5">Тип соединения</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'cascade' | 'direct')}
                className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl px-3.5 py-2.5 text-sm text-[#F2F0E8] focus:outline-none"
              >
                <option value="cascade">Каскад (Cascade M0 $\to$ S1)</option>
                <option value="direct">Прямой туннель (Direct S2)</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#A8B4B7] uppercase mb-1.5">API URL (Slave Endpoint)</label>
              <input
                type="text"
                placeholder="например: https://s1.vpn.test или http://127.0.0.1:8081"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl px-3.5 py-2.5 text-sm text-[#F2F0E8] focus:outline-none font-mono text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#A8B4B7] uppercase mb-1.5">Секретный API Key (X-API-Key)</label>
              <input
                type="password"
                placeholder="Сгенерированный при запуске Slave ключ"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl px-3.5 py-2.5 text-sm text-[#F2F0E8] focus:outline-none font-mono text-xs"
                required
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-xs font-mono uppercase text-[#A8B4B7] hover:text-[#F2F0E8] rounded-xl hover:bg-[#06141B]"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-mono font-bold uppercase bg-gradient-to-r from-[#F0D48D] to-[#D9B96E] text-[#06141B] rounded-xl shadow-lg transition"
            >
              {submitting ? 'Сохранение...' : 'Сохранить и подключить'}
            </button>
          </div>
        </form>
      )}

      {/* Nodes Table */}
      <div className="overflow-x-auto border border-[#1C3945] rounded-2xl bg-[#06141B]/60 shadow-xl">
        <table className="w-full text-left text-sm text-[#F2F0E8]">
          <thead className="bg-[#102833]/90 text-[10px] font-mono uppercase tracking-widest text-[#A8B4B7] border-b border-[#1C3945]">
            <tr>
              <th className="px-5 py-3.5">Статус / Ping</th>
              <th className="px-5 py-3.5">Название</th>
              <th className="px-5 py-3.5">Тип</th>
              <th className="px-5 py-3.5">API URL</th>
              <th className="px-5 py-3.5">Добавлен</th>
              <th className="px-5 py-3.5 text-right">Действия & Сервис</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1C3945]/70 bg-[#0A1D26]/40 font-sans">
            {nodes.map((node) => (
              <tr key={node.id} className="hover:bg-[#102833]/50 transition duration-150">
                <td className="px-5 py-3.5">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center space-x-1.5 text-[10px] font-mono font-semibold px-2.5 py-0.5 rounded-full ${
                        node.online
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {node.online ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      <span>{node.online ? 'Online' : 'Offline'}</span>
                    </span>
                    {node.online && typeof node.latency_ms === 'number' && (
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-[#102833] text-emerald-300 border border-[#1C3945]">
                        {node.latency_ms} ms
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3.5 font-medium text-[#F2F0E8]">{node.name}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                      node.type === 'cascade'
                        ? 'bg-amber-950/80 text-amber-300 border border-amber-600/40'
                        : 'bg-[#102833] text-[#6EA8C4] border border-[#6EA8C4]/40'
                    }`}
                  >
                    {node.type === 'cascade' ? 'Каскад' : 'Прямой'}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-xs font-mono text-[#A8B4B7]">{node.api_url}</td>
                <td className="px-5 py-3.5 text-xs text-[#718187] font-mono">
                  {new Date(node.created_at).toLocaleDateString()}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end space-x-1.5">
                    <button
                      onClick={() => setRestartingNode(node)}
                      title="Перезапустить службу AmneziaWG"
                      className="p-2 rounded-xl border border-[#1C3945] bg-[#102833]/80 text-[#D9B96E] hover:bg-[#1C3945] hover:text-[#F0D48D] transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleBackupClick(node)}
                      disabled={isBackingUp}
                      title="Экспорт резервной копии (Backup)"
                      className="p-2 rounded-xl border border-[#1C3945] bg-[#102833]/80 text-[#6EA8C4] hover:bg-[#1C3945] hover:text-[#A8B4B7] transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setRestoringNode(node)}
                      title="Восстановить из копии (Restore)"
                      className="p-2 rounded-xl border border-[#1C3945] bg-[#102833]/80 text-[#A8B4B7] hover:bg-[#1C3945] hover:text-[#F2F0E8] transition"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setNodeToDelete(node)}
                      title="Удалить ноду"
                      className="p-2 rounded-xl border border-rose-800/50 bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {nodes.length === 0 && !loading && (
              <tr>
                <td colSpan={6} className="text-center py-10 text-[#718187] text-xs font-mono uppercase tracking-wider">
                  Нет подключенных Slave-серверов.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Restart Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(restartingNode)}
        title="Перезапустить AmneziaWG?"
        variant="gold"
        confirmText="Да, перезапустить"
        cancelText="Отмена"
        isLoading={isRestarting}
        onConfirm={handleRestartConfirm}
        onClose={() => setRestartingNode(null)}
        message={
          restartingNode && (
            <div>
              Вы собираетесь перезапустить сервис AmneziaWG на сервере{' '}
              <strong className="text-[#F2F0E8]">«{restartingNode.name}»</strong>.
              Текущие сетевые сессии клиентов будут кратковременно перезапущены (~1-2 сек).
            </div>
          )
        }
      />

      {/* Delete Node Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(nodeToDelete)}
        title="Удалить Slave-сервер?"
        variant="danger"
        confirmText="Да, удалить сервер"
        cancelText="Отмена"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onClose={() => setNodeToDelete(null)}
        message={
          nodeToDelete && (
            <div>
              Вы собираетесь удалить сервер{' '}
              <strong className="text-[#F2F0E8]">«{nodeToDelete.name}»</strong>.
              Все выданные на этом сервере ключи клиентов будут также удалены из базы данных.
            </div>
          )
        }
      />

      {/* Backup Modal */}
      {backupNodeState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06141B]/80 backdrop-blur-sm">
          <div className="bg-[#0A1D26] border border-[#6EA8C4]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-[#6EA8C4]">
                <Download className="w-6 h-6" />
                <h3 className="font-serif text-lg font-bold text-[#F2F0E8]">Резервная копия AWG</h3>
              </div>
              <button onClick={() => setBackupNodeState(null)} className="text-[#A8B4B7] hover:text-[#F2F0E8]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#A8B4B7]">
              Архив конфигураций клиентов и ключей с ноды{' '}
              <strong className="text-[#F2F0E8]">«{backupNodeState.node.name}»</strong> от{' '}
              <span className="font-mono text-emerald-400">{new Date(backupNodeState.timestamp).toLocaleString()}</span>.
            </p>
            <div className="bg-[#06141B] p-3 rounded-xl border border-[#1C3945] font-mono text-[11px] text-[#A8B4B7] max-h-36 overflow-y-auto break-all select-all">
              {backupNodeState.data}
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={handleDownloadBackupFile}
                className="flex items-center space-x-2 px-5 py-2 text-xs font-mono font-bold uppercase bg-gradient-to-r from-[#6EA8C4] to-[#407B98] text-[#06141B] rounded-xl shadow-lg transition"
              >
                <Download className="w-4 h-4" />
                <span>Скачать файл .bak</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {restoringNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#06141B]/80 backdrop-blur-sm">
          <form onSubmit={handleRestoreSubmit} className="bg-[#0A1D26] border border-[#D9B96E]/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 text-[#D9B96E]">
                <Upload className="w-6 h-6" />
                <h3 className="font-serif text-lg font-bold text-[#F2F0E8]">Восстановление AWG</h3>
              </div>
              <button type="button" onClick={() => setRestoringNode(null)} className="text-[#A8B4B7] hover:text-[#F2F0E8]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#A8B4B7]">
              Загрузите или вставьте архив резервной копии для развертывания на ноде{' '}
              <strong className="text-[#F2F0E8]">«{restoringNode.name}»</strong>.
            </p>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#A8B4B7] uppercase mb-1.5">
                Загрузить из файла (.bak)
              </label>
              <input
                type="file"
                accept=".bak,.txt,.json"
                onChange={handleRestoreFileUpload}
                className="block w-full text-xs text-[#A8B4B7] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-mono file:bg-[#102833] file:text-[#D9B96E] hover:file:bg-[#1C3945]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-semibold text-[#A8B4B7] uppercase mb-1.5">
                Или вставьте данные архива:
              </label>
              <textarea
                rows={4}
                value={restoreData}
                onChange={(e) => setRestoreData(e.target.value)}
                placeholder="Вставьте base64 строку резервной копии..."
                className="w-full bg-[#06141B] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl p-3 text-xs text-[#F2F0E8] focus:outline-none font-mono"
                required
              />
            </div>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setRestoringNode(null)}
                disabled={isRestoring}
                className="px-4 py-2 text-xs font-mono uppercase text-[#A8B4B7] hover:text-[#F2F0E8] rounded-xl hover:bg-[#102833]"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isRestoring || !restoreData.trim()}
                className="px-5 py-2 text-xs font-mono font-bold uppercase bg-gradient-to-r from-[#F0D48D] to-[#D9B96E] text-[#06141B] rounded-xl shadow-lg transition disabled:opacity-50"
              >
                {isRestoring ? 'Восстановление...' : 'Восстановить конфигурацию'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

