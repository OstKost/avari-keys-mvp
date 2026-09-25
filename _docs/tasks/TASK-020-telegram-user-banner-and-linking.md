# TASK-020: Telegram User Banner and Deep Linking Notifications

- **Статус**: ✅ Done
- **Ветка**: `feature/TASK-020-telegram-user-banner-and-linking` $\rightarrow$ `develop`
- **Исполнитель**: Antigravity (Pair Programming)

---

## 🎯 Цели и решенные задачи

1. **Баннер-приглашение над списком VPN-ключей**:
   - Создан компонент [`TelegramBanner.tsx`](file:///Volumes/KingstonM2/Projects/avari-keys-mvp/apps/frontend/src/components/TelegramBanner.tsx) на странице «Мои устройства».
   - Баннер ненавязчиво отображается только когда Telegram-бот включен и пользователь еще не привязал свой аккаунт.
   - Пользователь может в один клик перейти по персональной ссылке `deep_link` (`https://t.me/<bot_username>?start=link_<username>`), скопировать команду `/link <username>` или скрыть баннер.
2. **Персональная привязка пользователя к Telegram**:
   - Бот связывает `telegram_chats.user_id = user.ID` при старте по deep link или при вводе команды `/link <username>`.
   - Пользователю приходят персональные уведомления о необходимости внести взнос, а также уведомления о сбоях/восстановлении серверов сети.
3. **API эндпоинты для статуса Telegram пользователя**:
   - `GET /api/v1/user/telegram` — возвращает статус привязки, username бота, статус оповещений и готовую ссылку для перехода.
   - `POST /api/v1/user/telegram/unlink` — позволяет отвязать чат от учетной записи.
4. **Индикатор активной привязки**:
   - Когда аккаунт привязан к боту, над ключами отображается компактная плашка «Telegram-оповещения активны» с кнопкой перехода в чат с ботом.

---

## 🧪 Верификация

- `apps/backend`: `go vet ./...` && `go test -v -race ./...` (PASS).
- `apps/backend`: `CGO_ENABLED=0 go build` для `slave` и `master` (OK).
- `apps/frontend`: `npm run build` (OK, 0 ошибок TypeScript).
