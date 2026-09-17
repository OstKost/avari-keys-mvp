# TASKS.md — Kanban Board (Avari Keys MVP)

## 📋 Kanban Board

| 📥 Backlog | 📝 To Do | ⚙️ In Progress | 🔍 In Review / Testing | ✅ Done |
|---|---|---|---|---|
| | [TASK-005](./tasks/TASK-005-master-frontend-ui.md) | | | [TASK-001](./tasks/TASK-001-project-scaffolding.md) |
| | [TASK-006](./tasks/TASK-006-contract-integration-tests.md) | | | [TASK-002](./tasks/TASK-002-slave-api-core.md) |
| | [TASK-007](./tasks/TASK-007-deployment-and-docs.md) | | | [TASK-003](./tasks/TASK-003-master-backend-auth-db.md) |
| | | | | [TASK-004](./tasks/TASK-004-master-backend-node-client-manager.md) |

---

## 📌 Список задач с кратким статусом

- **[TASK-001](./tasks/TASK-001-project-scaffolding.md)**: ✅ Базовый каркас проекта, Go-модули, Makefile, Frontend React/Vite scaffold.
- **[TASK-002](./tasks/TASK-002-slave-api-core.md)**: ✅ Slave API демон с оберткой над `manage_amneziawg.sh`, токен-авторизацией и Decoy страницей.
- **[TASK-003](./tasks/TASK-003-master-backend-auth-db.md)**: ✅ Master Backend — SQLite хранилище, регистрация, модерация админом `Forve`, JWT сессии.
- **[TASK-004](./tasks/TASK-004-master-backend-node-client-manager.md)**: ✅ Управление нодами (Cascade M0/S1 & Direct S2), Slave HTTP-клиент, создание и отзыв ключей.
- **[TASK-005](./tasks/TASK-005-master-frontend-ui.md)**: React Web UI — Дашборд пользователя (QR, .conf, выбор ноды) и Админ-панель (пользователи, ноды, аудит).
- **[TASK-006](./tasks/TASK-006-contract-integration-tests.md)**: Контрактные тесты Master $\leftrightarrow$ Slave API, тесты модерации и прав доступа.
- **[TASK-007](./tasks/TASK-007-deployment-and-docs.md)**: Документация развертывания, Caddy auto-HTTPS конфиги, systemd unit-файлы.
