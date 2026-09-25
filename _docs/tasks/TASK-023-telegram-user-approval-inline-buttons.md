# TASK-023: Модерация и одобрение новых пользователей через Inline-кнопки в Telegram-боте

- **Статус**: ✅ Done
- **Ветка**: `feature/TASK-023-telegram-user-approval-inline-buttons` $\rightarrow$ `develop`
- **Исполнитель**: Antigravity (Pair Programming)

---

## 🎯 Цели и решенные задачи

1. **Inline-кнопки под оповещением о новом пользователе**:
   - При регистрации нового аккаунта Telegram-бот отправляет администраторам уведомление с интерактивной Inline-клавиатурой:
     - `[✅ Одобрить]` (callback_data: `approve_user:<id>`)
     - `[❌ Отклонить]` (callback_data: `reject_user:<id>`)
   - Поддерживаются методы Telegram Bot API: `sendMessage` с `reply_markup` (`InlineKeyboardMarkup`), `answerCallbackQuery` и `editMessageText`.

2. **Обработка нажатий (Callback Queries) и безопасность**:
   - Polling воркер обрабатывает `callback_query` события.
   - Проверяются права администратора (`IsAdmin == true`) у пользователя, нажавшего кнопку. Для неадминистраторов возвращается всплывающее предупреждение `⛔ У вас нет прав администратора`.
   - При нажатии `[✅ Одобрить]`:
     - Пользователь активируется в базе данных (`IsActive = true`).
     - Записывается запись в аудит-лог (`admin_user_activate_tg`) с указанием Telegram username модератора.
     - Сообщение в Telegram обновляется: кнопки убираются, а статус меняется на `🟢 Одобрен (модератор: @...)`.
     - Если пользователь уже привязал Telegram, ему отправляется личное уведомление об активации.
   - При нажатии `[❌ Отклонить]`:
     - Статус учетной записи деактивируется / остается неактивным.
     - Записывается аудит-лог (`admin_user_reject_tg`).
     - Сообщение обновляется на `🔴 Отклонен (модератор: @...)`.

---

## 🧪 Верификация

- `apps/backend`: `go vet ./...` (PASS).
- `apps/backend`: `go test -v -race ./...` (PASS, включая новые контрактные тесты `TestTelegramBotUserApprovalCallbackQuery`).
- `apps/backend`: `CGO_ENABLED=0 go build -o /dev/null ./cmd/slave && CGO_ENABLED=0 go build -o /dev/null ./cmd/master` (PASS).
- `apps/frontend`: `npm run build` (PASS).
