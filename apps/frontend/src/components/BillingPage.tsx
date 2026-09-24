import { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Sparkles,
  Search,
  Calendar,
  Wallet,
  Copy,
  Check,
  RefreshCw,
  Users,
  Pencil,
  Save,
} from 'lucide-react';
import { User, BillingStatus, AdminBillingSummary, BillingRequisites } from '../types';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import { Loader } from './Loader';
import { Tooltip } from './Tooltip';

interface BillingPageProps {
  currentUser: User;
}

export function BillingPage({ currentUser }: BillingPageProps) {
  const { toast } = useToast();
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null);
  const [adminSummary, setAdminSummary] = useState<AdminBillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'user' | 'admin'>('user');

  // Payment dialog state
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payNote, setPayNote] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Requisites state
  const [requisites, setRequisites] = useState<BillingRequisites>({
    sbp_phone: '+7 (999) 000-00-00',
    sbp_bank: 'Т-Банк / Сбербанк',
  });
  const [isEditingRequisites, setIsEditingRequisites] = useState(false);
  const [editRequisitesForm, setEditRequisitesForm] = useState<BillingRequisites>({
    sbp_phone: '',
    sbp_bank: '',
  });
  const [savingRequisites, setSavingRequisites] = useState(false);

  // Admin filter
  const [searchFilter, setSearchFilter] = useState('');

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [status, adminData, reqsData] = await Promise.all([
        api.getBillingStatus(),
        currentUser.role === 'admin' ? api.getAdminBilling() : Promise.resolve(null),
        api.getBillingRequisites().catch(() => null),
      ]);
      setBillingStatus(status);
      if (adminData) {
        setAdminSummary(adminData);
      }
      if (reqsData) {
        setRequisites(reqsData);
      }
    } catch (err: any) {
      toast.error(err.message || 'Ошибка загрузки данных биллинга');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleStartEditRequisites = () => {
    setEditRequisitesForm({ ...requisites });
    setIsEditingRequisites(true);
  };

  const handleCancelEditRequisites = () => {
    setIsEditingRequisites(false);
  };

  const handleSaveRequisites = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingRequisites(true);
      const updated = await api.updateBillingRequisites(editRequisitesForm);
      setRequisites(updated);
      setIsEditingRequisites(false);
      toast.success('Реквизиты успешно сохранены!');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения реквизитов');
    } finally {
      setSavingRequisites(false);
    }
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast.success('Скопировано в буфер обмена');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmPay = async () => {
    try {
      setActionLoading(true);
      const parsedAmount = payAmount ? parseFloat(payAmount) : 0;
      const updated = await api.payDues(parsedAmount, payNote);
      setBillingStatus(updated);
      setShowPayModal(false);
      setPayAmount('');
      setPayNote('');
      toast.success('Оплата взноса успешно зафиксирована!');
      loadData(true);
    } catch (err: any) {
      toast.error(err.message || 'Ошибка сохранения оплаты');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSnooze = async () => {
    try {
      setActionLoading(true);
      const updated = await api.snoozeReminder(1);
      setBillingStatus(updated);
      toast.info('Напоминание о взносе отложено на завтра');
    } catch (err: any) {
      toast.error(err.message || 'Ошибка откладывания');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !billingStatus) {
    return <Loader size="section" text="Загрузка данных биллинга..." />;
  }

  const nextDueDate = billingStatus?.next_due_at
    ? new Date(billingStatus.next_due_at).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

  const lastPaidDate = billingStatus?.last_paid_at
    ? new Date(billingStatus.last_paid_at).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Нет записей';

  const filteredAdminRecords = (adminSummary?.records || []).filter((r) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      r.username.toLowerCase().includes(q) ||
      r.period_month.toLowerCase().includes(q) ||
      (r.note && r.note.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Title & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#F2F0E8] tracking-wide flex items-center space-x-3">
            <CreditCard className="w-6 h-6 text-[#D9B96E]" />
            <span>Кооперативный Биллинг</span>
          </h2>
          <p className="text-sm text-[#A8B4B7] mt-1 font-sans">
            Управление членскими взносами и поддержание распределенной инфраструктуры
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {currentUser.role === 'admin' && (
            <div className="flex bg-[#0D222C] p-1 rounded-xl border border-[#1C3945]">
              <button
                onClick={() => setViewMode('user')}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition ${
                  viewMode === 'user'
                    ? 'bg-[#D9B96E] text-[#06141B] font-bold shadow-md'
                    : 'text-[#A8B4B7] hover:text-[#F2F0E8]'
                }`}
              >
                Мой статус
              </button>
              <button
                onClick={() => setViewMode('admin')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition ${
                  viewMode === 'admin'
                    ? 'bg-[#D9B96E] text-[#06141B] font-bold shadow-md'
                    : 'text-[#A8B4B7] hover:text-[#F2F0E8]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Все участники</span>
              </button>
            </div>
          )}

          <Tooltip content="Обновить данные">
            <button
              onClick={() => loadData(false)}
              aria-label="Обновить"
              className="p-2.5 rounded-xl bg-[#0D222C] border border-[#1C3945] hover:border-[#D9B96E]/40 hover:bg-[#102833] text-[#A8B4B7] hover:text-[#F2F0E8] transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      {viewMode === 'user' && (
        <>
          {/* Status & Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Membership Status Card */}
            <div className="bg-[#0D222C]/90 border border-[#1C3945] rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-[#A8B4B7]">
                  Статус взноса
                </span>
                {billingStatus?.is_due ? (
                  <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-950/80 text-rose-300 border border-rose-600/40">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                    Требуется оплата
                  </span>
                ) : billingStatus?.status === 'snoozed' ? (
                  <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-600/40">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    Отложено
                  </span>
                ) : (
                  <span className="flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/40">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Оплачено
                  </span>
                )}
              </div>

              <div>
                <div className="text-3xl font-serif font-bold text-[#F2F0E8]">
                  {billingStatus?.days_remaining !== undefined && billingStatus.days_remaining > 0
                    ? `${billingStatus.days_remaining} дн.`
                    : 'Срок наступил'}
                </div>
                <p className="text-xs font-mono text-[#A8B4B7] mt-1">
                  Следующий расчетный срок: <span className="text-[#F0D48D]">{nextDueDate}</span>
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#1C3945] flex items-center justify-between">
                <span className="text-xs font-mono text-[#A8B4B7]">Цикл начислений:</span>
                <span className="text-xs font-mono font-semibold text-[#D9B96E]">Каждые 30 дней</span>
              </div>
            </div>

            {/* Last Paid Info Card */}
            <div className="bg-[#0D222C]/90 border border-[#1C3945] rounded-3xl p-6 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono uppercase tracking-wider text-[#A8B4B7]">
                  Последнее подтверждение
                </span>
                <Calendar className="w-4 h-4 text-[#D9B96E]" />
              </div>

              <div>
                <div className="text-xl font-serif font-bold text-[#F2F0E8]">
                  {lastPaidDate}
                </div>
                <p className="text-xs font-mono text-[#A8B4B7] mt-1">
                  Всего подтверждений: <span className="text-[#F0D48D] font-bold">{(billingStatus?.history || []).length}</span>
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#1C3945] flex items-center justify-between">
                <span className="text-xs font-mono text-[#A8B4B7]">Хранитель:</span>
                <span className="text-xs font-mono font-semibold text-[#F2F0E8]">@{currentUser.username}</span>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="bg-gradient-to-br from-[#102833] to-[#0A1D26] border border-[#D9B96E]/40 rounded-3xl p-6 flex flex-col justify-between shadow-xl">
              <div>
                <div className="flex items-center space-x-2 text-[#D9B96E] mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider">
                    Быстрое действие
                  </span>
                </div>
                <h3 className="font-serif text-lg font-bold text-[#F2F0E8]">
                  Внесли взнос?
                </h3>
                <p className="text-xs text-[#A8B4B7] mt-1 font-sans">
                  Нажмите кнопку ниже, чтобы зафиксировать оплату в журнале и продлить период доступа на 30 дней.
                </p>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  onClick={() => setShowPayModal(true)}
                  className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] hover:from-[#F0D48D] hover:to-[#D9B96E] text-[#06141B] font-bold text-xs uppercase tracking-wider font-mono py-3 px-4 rounded-xl shadow-lg shadow-[#D9B96E]/20 hover:shadow-[#D9B96E]/40 transition duration-200 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Я оплатил взнос</span>
                </button>

                {billingStatus?.is_due && (
                  <button
                    onClick={handleSnooze}
                    disabled={actionLoading}
                    className="w-full flex items-center justify-center space-x-2 bg-[#06141B] hover:bg-[#0A1D26] text-[#A8B4B7] hover:text-[#F2F0E8] border border-[#1C3945] font-mono text-xs uppercase tracking-wider py-2 px-3 rounded-xl transition duration-200 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Напомнить завтра</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Requisites Block */}
          <div className="bg-[#0A1D26]/80 border border-[#1C3945] rounded-3xl p-6 sm:p-8 backdrop-blur-md">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-[#102833] border border-[#1C3945] text-[#D9B96E]">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#F2F0E8]">
                    Реквизиты для перевода взносов
                  </h3>
                  <p className="text-xs text-[#A8B4B7] font-mono">
                    Используйте удобный способ перевода, затем нажмите «Оплачено»
                  </p>
                </div>
              </div>

              {currentUser.role === 'admin' && !isEditingRequisites && (
                <Tooltip content="Редактировать реквизиты">
                  <button
                    onClick={handleStartEditRequisites}
                    aria-label="Редактировать реквизиты"
                    className="p-2 rounded-xl border border-[#1C3945] bg-[#102833] text-[#D9B96E] hover:bg-[#1C3945] hover:text-[#F0D48D] transition shadow-sm"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </Tooltip>
              )}
            </div>

            {isEditingRequisites ? (
              <form onSubmit={handleSaveRequisites} className="space-y-4">
                <div className="max-w-xl bg-[#06141B] border border-[#D9B96E]/40 rounded-2xl p-5 space-y-4 shadow-lg">
                  <div className="text-xs font-mono uppercase text-[#D9B96E] font-bold flex items-center space-x-1.5">
                    <span>СБП / Карта РФ</span>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#A8B4B7] mb-1">
                      Номер телефона или карты
                    </label>
                    <input
                      type="text"
                      value={editRequisitesForm.sbp_phone}
                      onChange={(e) =>
                        setEditRequisitesForm({ ...editRequisitesForm, sbp_phone: e.target.value })
                      }
                      placeholder="+7 (999) 000-00-00"
                      className="w-full bg-[#0A1D26] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl px-3 py-2 text-sm text-[#F2F0E8] font-mono focus:outline-none transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-[#A8B4B7] mb-1">
                      Банк / Получатель
                    </label>
                    <input
                      type="text"
                      value={editRequisitesForm.sbp_bank}
                      onChange={(e) =>
                        setEditRequisitesForm({ ...editRequisitesForm, sbp_bank: e.target.value })
                      }
                      placeholder="Т-Банк / Сбербанк"
                      className="w-full bg-[#0A1D26] border border-[#1C3945] focus:border-[#D9B96E] rounded-xl px-3 py-2 text-sm text-[#F2F0E8] font-mono focus:outline-none transition"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={handleCancelEditRequisites}
                      disabled={savingRequisites}
                      className="px-4 py-2 rounded-xl border border-[#1C3945] text-xs font-mono text-[#A8B4B7] hover:text-[#F2F0E8] hover:bg-[#102833] transition"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={savingRequisites}
                      className="flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] text-[#06141B] font-bold text-xs font-mono uppercase tracking-wider shadow-lg shadow-[#D9B96E]/20 hover:shadow-[#D9B96E]/40 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{savingRequisites ? 'Сохранение...' : 'Сохранить реквизиты'}</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* SBP Card */}
                <div className="bg-[#06141B] border border-[#1C3945] rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-mono uppercase text-[#A8B4B7]">СБП / Карта РФ</span>
                    <div className="font-mono text-sm font-bold text-[#F2F0E8] mt-1 select-all">
                      {requisites.sbp_phone}
                    </div>
                    <div className="text-xs font-mono text-[#D9B96E] mt-0.5">{requisites.sbp_bank}</div>
                  </div>
                  <button
                    onClick={() => handleCopy(requisites.sbp_phone, 'sbp')}
                    className="mt-3 self-start flex items-center space-x-1 text-xs font-mono text-[#A8B4B7] hover:text-[#F2F0E8] transition"
                  >
                    {copiedField === 'sbp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'sbp' ? 'Скопировано' : 'Скопировать номер'}</span>
                  </button>
                </div>

                {/* Note Card */}
                <div className="bg-[#06141B] border border-[#1C3945] rounded-2xl p-4 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-mono uppercase text-[#A8B4B7]">Назначение перевода</span>
                    <div className="font-mono text-sm font-bold text-[#F2F0E8] mt-1">
                      Взнос @{currentUser.username}
                    </div>
                    <div className="text-xs font-mono text-[#A8B4B7] mt-0.5">Указывайте ник в комментарии</div>
                  </div>
                  <button
                    onClick={() => handleCopy(`Взнос @${currentUser.username}`, 'note')}
                    className="mt-3 self-start flex items-center space-x-1 text-xs font-mono text-[#A8B4B7] hover:text-[#F2F0E8] transition"
                  >
                    {copiedField === 'note' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'note' ? 'Скопировано' : 'Скопировать текст'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User History Table */}
          <div className="bg-[#0A1D26]/80 border border-[#1C3945] rounded-3xl p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#F2F0E8]">
                  История подтверждений оплат
                </h3>
                <p className="text-xs font-mono text-[#A8B4B7] mt-0.5">
                  Журнал отметок «Оплачено» для вашей учетной записи
                </p>
              </div>
            </div>

            {(!billingStatus?.history || billingStatus.history.length === 0) ? (
              <div className="text-center py-12 border border-dashed border-[#1C3945] rounded-2xl bg-[#06141B]/40">
                <CreditCard className="w-10 h-10 text-[#1C3945] mx-auto mb-3" />
                <p className="text-sm text-[#A8B4B7] font-mono">История оплат пока пуста</p>
                <p className="text-xs text-[#A8B4B7]/60 font-sans mt-1">
                  После нажатия «Я оплатил взнос» запись появится в этом списке
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#1C3945]">
                <table className="w-full text-left text-sm font-sans">
                  <thead className="bg-[#06141B] text-[#A8B4B7] font-mono text-xs uppercase border-b border-[#1C3945]">
                    <tr>
                      <th className="py-3.5 px-4">ID</th>
                      <th className="py-3.5 px-4">Дата и время</th>
                      <th className="py-3.5 px-4">Расчетный период</th>
                      <th className="py-3.5 px-4">Статус</th>
                      <th className="py-3.5 px-4">Примечание</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C3945]/60 bg-[#0A1D26]/40">
                    {billingStatus.history.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#102833]/50 transition">
                        <td className="py-3.5 px-4 font-mono text-xs text-[#A8B4B7]">
                          #{rec.id}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[#F2F0E8]">
                          {new Date(rec.created_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[#D9B96E] font-semibold">
                          {rec.period_month}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-600/40">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Подтверждено
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#D0D9DC] font-sans">
                          {rec.note || 'Регулярный кооперативный взнос (30 дней)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Admin Mode View */}
      {viewMode === 'admin' && currentUser.role === 'admin' && (
        <div className="space-y-6">
          {/* Admin Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-[#0D222C] border border-[#1C3945] rounded-2xl p-5">
              <span className="text-xs font-mono uppercase text-[#A8B4B7]">Всего платежей</span>
              <div className="text-2xl font-serif font-bold text-[#F2F0E8] mt-1">
                {adminSummary?.total_payments || 0}
              </div>
              <p className="text-xs font-mono text-[#D9B96E] mt-1">Всех подтвержденных взносов</p>
            </div>

            <div className="bg-[#0D222C] border border-[#1C3945] rounded-2xl p-5">
              <span className="text-xs font-mono uppercase text-[#A8B4B7]">Ожидают взноса</span>
              <div className="text-2xl font-serif font-bold text-amber-400 mt-1">
                {adminSummary?.users_due_count || 0}
              </div>
              <p className="text-xs font-mono text-[#A8B4B7] mt-1">Пользователей с наступившим сроком</p>
            </div>

            <div className="bg-[#0D222C] border border-[#1C3945] rounded-2xl p-5">
              <span className="text-xs font-mono uppercase text-[#A8B4B7]">Участников всего</span>
              <div className="text-2xl font-serif font-bold text-[#F2F0E8] mt-1">
                {adminSummary?.total_users || 0}
              </div>
              <p className="text-xs font-mono text-[#A8B4B7] mt-1">В базе данных</p>
            </div>
          </div>

          {/* Admin Records Table */}
          <div className="bg-[#0A1D26]/80 border border-[#1C3945] rounded-3xl p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#F2F0E8]">
                  Сводный реестр оплат кооператива
                </h3>
                <p className="text-xs font-mono text-[#A8B4B7] mt-0.5">
                  Все подтверждения оплат участников сети
                </p>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A8B4B7]" />
                <input
                  type="text"
                  placeholder="Поиск по нику / периоду..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#06141B] border border-[#1C3945] rounded-xl text-xs font-mono text-[#F2F0E8] placeholder-[#A8B4B7]/60 focus:outline-none focus:border-[#D9B96E]/60 transition"
                />
              </div>
            </div>

            {filteredAdminRecords.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[#1C3945] rounded-2xl bg-[#06141B]/40">
                <p className="text-sm text-[#A8B4B7] font-mono">Записей не найдено</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#1C3945]">
                <table className="w-full text-left text-sm font-sans">
                  <thead className="bg-[#06141B] text-[#A8B4B7] font-mono text-xs uppercase border-b border-[#1C3945]">
                    <tr>
                      <th className="py-3.5 px-4">ID</th>
                      <th className="py-3.5 px-4">Хранитель</th>
                      <th className="py-3.5 px-4">Дата и время</th>
                      <th className="py-3.5 px-4">Период</th>
                      <th className="py-3.5 px-4">Статус</th>
                      <th className="py-3.5 px-4">Примечание</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1C3945]/60 bg-[#0A1D26]/40">
                    {filteredAdminRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#102833]/50 transition">
                        <td className="py-3.5 px-4 font-mono text-xs text-[#A8B4B7]">
                          #{rec.id}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs font-bold text-[#F0D48D]">
                          @{rec.username}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[#F2F0E8]">
                          {new Date(rec.created_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-[#D9B96E]">
                          {rec.period_month}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-600/40">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Подтверждено
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#D0D9DC] font-sans">
                          {rec.note || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Payment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040C10]/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md bg-[#0A1D26] border border-[#D9B96E]/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-[#F2F0E8]">
            <div className="flex items-center space-x-3 mb-6">
              <div className="p-3 rounded-2xl bg-[#102833] text-[#D9B96E] border border-[#1C3945]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-[#F2F0E8]">
                  Подтвердить оплату
                </h3>
                <p className="text-xs font-mono text-[#A8B4B7]">
                  Фиксация внесения взноса на 30 дней
                </p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-mono uppercase text-[#A8B4B7] mb-1.5">
                  Сумма (необязательно, ₽)
                </label>
                <input
                  type="number"
                  placeholder="Например, 150"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#06141B] border border-[#1C3945] rounded-xl text-sm font-mono text-[#F2F0E8] focus:outline-none focus:border-[#D9B96E]/60 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-[#A8B4B7] mb-1.5">
                  Комментарий / Способ перевода
                </label>
                <input
                  type="text"
                  placeholder="Например: СБП Т-Банк или USDT"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#06141B] border border-[#1C3945] rounded-xl text-sm font-mono text-[#F2F0E8] focus:outline-none focus:border-[#D9B96E]/60 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                disabled={actionLoading}
                className="py-3 px-4 rounded-xl border border-[#1C3945] text-[#A8B4B7] hover:text-[#F2F0E8] hover:bg-[#102833] font-mono text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmPay}
                disabled={actionLoading}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-[#F0D48D] via-[#D9B96E] to-[#A98A48] hover:from-[#F0D48D] hover:to-[#D9B96E] text-[#06141B] font-bold text-xs uppercase tracking-wider font-mono py-3 px-4 rounded-xl shadow-lg shadow-[#D9B96E]/20 transition cursor-pointer"
              >
                <span>{actionLoading ? 'Сохранение...' : 'Подтвердить'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
