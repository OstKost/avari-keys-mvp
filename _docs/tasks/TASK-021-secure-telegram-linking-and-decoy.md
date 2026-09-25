# TASK-021: Безопасная привязка Telegram-бота по токену и Decoy-заглушка для неизвестных пользователей

- **Статус**: ✅ Done
- **Ветка**: `feature/TASK-021-secure-telegram-linking-and-decoy` $\rightarrow$ `develop`
- **Исполнитель**: Antigravity (Pair Programming)

---

## 🎯 Цели и решенные задачи

1. **Защищенная привязка по индивидуальному крипто-токену**:
   - Устранена уязвимость публичной привязки через открытое имя пользователя (`/link <username>` или `start=link_<username>`).
   - Создана таблица `telegram_link_tokens` в SQLite для хранения сгенерированных одноразовых безопасных токенов привязки.
   - Эндпоинт `GET /api/v1/user/telegram` генерирует индивидуальный токен для авторизованного пользователя и отдает защищенный `deep_link` вида `https://t.me/<bot>?start=link_<token>`.
   - При переходе по ссылке и нажатии Start в Telegram, бот валидирует токен, связывает чат с аккаунтом активного пользователя и сжигает использованный токен.

2. **Decoy-ответ («Привет! Как дела?») для всех неопределенных пользователей**:
   - Любой неавторизованный/непривязанный пользователь, пишущий в бота (включая команды `/start`, `/help`, `/status`, `/nodes`, `/billing`, `/test`, попытки невалидных ссылок или произвольный текст), получает исключительно нейтральный ответ: `"Привет! Как дела?"`.
   - Неопределенные пользователи не сохраняются в базу получателей рассылок, не получают доступ к командам и меню управления, не могут видеть статусы серверов и биллинг.

3. **Интерфейс пользователя**:
   - В баннере [`TelegramBanner.tsx`](file:///Volumes/KingstonM2/Projects/avari-keys-mvp/apps/frontend/src/components/TelegramBanner.tsx) кнопка копирования теперь сохраняет в буфер защищенную персональную ссылку на подключение бота вместо незащищенной текстовой команды.

---

## 🧪 Верификация

- `apps/backend`: `go vet ./...` (PASS, 0 warnings).
- `apps/backend`: `go test -v -race ./...` (PASS, включая новые тесты `TestTelegramLinkTokensStorage` и `TestTelegramBotSecurityAndLinking`).
- `apps/backend`: `CGO_ENABLED=0 go build -o /dev/null ./cmd/slave && CGO_ENABLED=0 go build -o /dev/null ./cmd/master` (PASS).
- `apps/frontend`: `npm run build` (PASS, 0 ошибок сборки/типов).
