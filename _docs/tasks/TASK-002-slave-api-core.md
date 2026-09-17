# TASK-002: Slave API Daemon & Wrapper над manage_amneziawg.sh

## 1. Описание задачи (Specific)
Реализовать легковесный HTTP-сервер для Slave-ноды (`apps/backend/cmd/slave`), который выступает REST API фасадом над скриптом `manage_amneziawg.sh`. Сервер должен поддерживать:
- Авторизацию по заголовку `X-API-Key` (или Bearer токену).
- Автогенерацию и печать токена при первом запуске (если не передан через переменную окружения `SLAVE_API_KEY`).
- Защиту от прямого сканирования (отдача decoy-страницы на `GET /`).
- Эндпоинты управления клиентами (`POST /api/v1/clients`, `DELETE /api/v1/clients/{name}`, `GET /api/v1/clients`, `GET /api/v1/clients/{name}`, `GET /api/v1/stats`, `GET /health`).
- Абстрактный интерфейс `CommandRunner` с реальной реализацией (`exec.Command`) и моком (`MockRunner`) для тестирования без физического AWG.

## 2. Критерии приемки (Measurable)
- [ ] Неавторизованные запросы к `/api/v1/*` возвращают `401 Unauthorized`.
- [ ] Запрос к `/` возвращает HTML нейтральной страницы (decoy).
- [ ] Запрос к `/health` возвращает статус `{"status": "ok", "awg_available": true/false}`.
- [ ] Вызов `POST /api/v1/clients` с валидным именем безопасно вызывает `manage_amneziawg.sh add <name>` и парсит полученный конфиг + QR-код в формате base64/data URL.
- [ ] Санитизация входных данных: валидация имени клиента (только `[a-zA-Z0-9_-]`, защита от command injection).
- [ ] Unit-тесты покрывают все HTTP-хэндлеры с использованием `MockRunner` (покрытие > 80%).

## 3. Достижимость (Achievable)
Используется стандартная библиотека Go (`net/http`) либо компактный роутер (`chi` / `go 1.22 mux`).

## 4. Актуальность (Relevant)
Критически важно для работы как каскадного узла (M0), так и автономного узла прямого выхода (S2).

## 5. Ограничение по времени и ветка (Time-bound & Gitflow)
- **Ветка**: `feature/TASK-002-slave-api-core`
- **Слияние**: в `develop`
