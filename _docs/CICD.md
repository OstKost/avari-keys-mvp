# 🚀 Безопасный CI/CD пайплайн (GitHub Actions -> VPS 157.22.252.225)

Настроен автоматический, безопасный и атомарный процесс непрерывной интеграции и доставки (CI/CD) на базе **GitHub Actions**.

---

## 🏗 Архитектура и Режимы работы

Пайплайн разделен на автоматическую и ручную части для обеспечения максимальной стабильности продакшена:

```mermaid
flowchart TD
    subgraph CI["1. CI (Автоматически на PR и push)"]
        A["Push в develop / main / master"] --> B["Go Vet & Race Tests"]
        A --> C["Сборка статических Go бинарников (amd64)"]
        A --> D["Сборка React SPA (npm run build)"]
    end

    subgraph CD_Auto["2. Автоматический деплой на push в main"]
        D --> E{"Push в main / master?"}
        E -- Да --> F["Деплой Frontend SPA на Master VPS 157.22.252.225"]
        E -- Да --> G["Деплой avari-master на Master VPS 157.22.252.225"]
        E -- Да --> H["Атомарный деплой avari-slave на ВСЕ Slave-ноды"]
    end

    subgraph CD_Manual["3. Ручной деплой (On-Demand / Dispatch)"]
        I["Вкладка Actions -> Run workflow"] --> J{"Выбор цели (Target)"}
        J -- master-api --> K["Деплой avari-master"]
        J -- slave-api / all-slaves --> L["Деплой avari-slave на один или все хосты"]
        J -- all --> M["Полный деплой всех компонентов"]
    end
```

| Компонент | Как обновляется | Описание |
|---|---|---|
| **Frontend Web SPA** | **Автоматически** при каждом push/merge в `main` | Атомарный swap статики на Master сервере. |
| **Master API (`avari-master`)** | **Автоматически** при push в `main` (или вручную) | Обновляет бинарник и перезапускает systemd сервис `avari-master`. |
| **Slave API (`avari-slave`)** | **Автоматически** при push в `main` (или вручную) | Атомарно обновляет бинарник и перезапускает `avari-slave` на всех нодах сети (`157.22.252.225`, `185.213.240.136`, `157.228.142.20`, `157.228.130.7`). |

---

## 🔒 Принципы безопасности

1. **Изоляция секретов**: Пароли и ключи хранятся исключительно в зашифрованных GitHub Secrets (`SSH_PRIVATE_KEY`).
2. **ED25519 SSH-ключи**: Выделенный SSH-ключ, созданный только для CI/CD.
3. **Атомарная замена (Atomic Swap)**:
   - Файлы загружаются во временную директорию `/tmp/avari-...`.
   - Применяются через утилиты `install -m 755` и `rsync --delete`, исключая повреждение бинарников или незавершенную загрузку.
4. **Health Check**: После рестарта сервис опрашивается на статус `active`. Если сервис упал — GitHub Actions завершится с ошибкой и уведомит вас.
5. **Защита от состояния гонки (Race conditions)**: Независимые блокировки `concurrency` для деплоя фронтенда и бэкенда.

---

## 📋 Инструкция по настройке за 3 шага

### Шаг 1. Генерация выделенного SSH-ключа

На вашем локальном компьютере выполните команду:

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key -N ""
```

Будут созданы два файла:
- `~/.ssh/github_deploy_key` — **Приватный ключ** (нужен для GitHub Secrets).
- `~/.ssh/github_deploy_key.pub` — **Публичный ключ** (нужен для сервера).

---

### Шаг 2. Добавление публичного ключа на VPS (`157.22.252.225`)

Скопируйте публичный ключ на ваш сервер:

```bash
ssh-copy-id -i ~/.ssh/github_deploy_key.pub root@157.22.252.225
```

*Либо вручную добавьте содержимое файла `~/.ssh/github_deploy_key.pub` в конец файла `/root/.ssh/authorized_keys` на сервере `157.22.252.225`.*

Проверьте подключение:
```bash
ssh -i ~/.ssh/github_deploy_key root@157.22.252.225 "echo 'SSH доступ успешно настроен!'"
```

---

### Шаг 3. Добавление Секрета в GitHub

1. Откройте репозиторий на GitHub: **`https://github.com/OstKost/avari-keys-mvp`**.
2. Перейдите в **Settings** $\to$ **Secrets and variables** $\to$ **Actions**.
3. Нажмите **New repository secret** и добавьте:

| Название секрета | Обязательно? | Значение по умолчанию | Описание |
|---|---|---|---|
| **`SSH_PRIVATE_KEY`** | **Да (Критично)** | *(нет)* | Полное содержимое приватного ключа `~/.ssh/github_deploy_key` (включая строки `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END OPENSSH PRIVATE KEY-----`). |
| `SSH_HOST` | Нет | `157.22.252.225` | IP-адрес или домен вашего VPS. |
| `SSH_USER` | Нет | `root` | Пользователь на сервере. |
| `SSH_PORT` | Нет | `22` | Порт SSH (если меняли стандартный порт). |

---

## 🎯 Как запускать обновления

### 1. Обновление Frontend SPA (Веб-интерфейс):
- Происходит **полностью автоматически** при любом коммите или merge в ветку `main` / `master`.

### 2. Обновление Master API или Slave узлов (Вручную):
1. Перейдите на вкладку **Actions** в репозитории на GitHub.
2. В левой колонке выберите **CI/CD Pipeline**.
3. Нажмите синюю кнопку **Run workflow**:
   - **Branch**: выберите `main` (или нужную ветку).
   - **Компонент для деплоя**:
     - `all` — обновить всё (Frontend + Master API + Slave API).
     - `master-api` — обновить только Master Backend API (`avari-master`).
     - `slave-api` — обновить только Slave API (`avari-slave`).
     - `frontend-only` — принудительно обновить только Frontend.
   - **IP/Хост целевого VPS**: по умолчанию `157.22.252.225` (если нужно обновить Slave API на зарубежной ноде S2, укажите IP-адрес S2).
4. Нажмите зеленую кнопку **Run workflow**.

---

## 🛠 Полезные команды на VPS для проверки:

```bash
# Проверить статус сервисов
systemctl status avari-master avari-slave caddy --no-pager

# Просмотр логов бэкенда в реальном времени
journalctl -u avari-master -f

# Проверить версию/дату установленного бинарника
ls -la /usr/local/bin/avari-master
```
