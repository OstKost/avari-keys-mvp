# TASK-001: Базовый каркас проекта и структура репозитория

## 1. Описание задачи (Specific)
Инициализировать файловую структуру монорепозитория для `avari-keys-mvp`, настроить Go-модули для бэкенда (`apps/backend`), базовый проект React/Vite/Tailwind для фронтенда (`apps/frontend`), единый `Makefile` для сборки и запуска, а также базовые конфигурационные файлы.

## 2. Критерии приемки (Measurable)
- [ ] В корне создан `Makefile` с целями `build`, `test`, `lint`, `clean`, `dev-master`, `dev-slave`, `dev-ui`.
- [ ] В `apps/backend/` инициализирован Go-модуль `github.com/OstKost/avari-keys-mvp/apps/backend` (Go 1.22+).
- [ ] В `apps/backend/cmd/master` и `apps/backend/cmd/slave` созданы минимальные компилируемые точки входа (`main.go`).
- [ ] В `apps/frontend/` инициализирован проект Vite + React + TypeScript + Tailwind CSS.
- [ ] Команда `make test` и `make build` успешно отрабатывают без ошибок.

## 3. Достижимость (Achievable)
Используются стандартные инструменты Go tooling и Vite scaffolding без избыточных внешних зависимостей.

## 4. Актуальность (Relevant)
Является фундаментом для реализации независимых компонентов системы (Slave API, Master Backend и Web UI).

## 5. Ограничение по времени и ветка (Time-bound & Gitflow)
- **Ветка**: `feature/TASK-001-project-scaffolding`
- **Слияние**: в `develop`
