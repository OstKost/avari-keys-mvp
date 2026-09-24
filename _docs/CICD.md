# 🚀 Безопасный CI/CD пайплайн (GitHub Actions -> VPS 157.22.252.225)

Настроен автоматический, безопасный и атомарный процесс непрерывной интеграции и доставки (CI/CD) на базе **GitHub Actions**.

---

## 🏗 Архитектура пайплайна

```mermaid
flowchart TD
    A["Push / Merge в main / master"] --> B["GitHub Actions Runner"]
    subgraph CI["1. CI (Сборка и Тесты)"]
        B --> C["Go Vet & Race Tests"]
        B --> D["Сборка статических Go бинарников (amd64)"]
        B --> E["Сборка React SPA (npm run build)"]
    end
    CI --> F{"Все проверки пройдены?"}
    F -- Нет --> G["❌ Остановка (Блокировка релиза)"]
    F -- Да --> H["2. Безопасный Deploy на VPS 157.22.252.225"]
    subgraph CD["Атомарное обновление на VPS"]
        H --> I["Загрузка в /tmp/avari-deploy-ID"]
        I --> J["install -m 755 в /usr/local/bin/avari-*"]
        I --> K["rsync --delete в /var/www/avari-keys/frontend"]
        J --> L["systemctl daemon-reload & restart"]
        K --> L
        L --> M["Health Check (systemctl is-active)"]
    end
    M --> N["✅ Продакшен успешно обновлен!"]
```

---

## 🔒 Принципы безопасности

1. **Изоляция секретов**: Пароли и ключи хранятся исключительно в зашифрованных GitHub Secrets.
2. **ED25519 SSH-ключи**: Рекомендуется использовать отдельный SSH-ключ, созданный специально для CI/CD.
3. **Атомарная замена (Atomic Swap)**:
   - Бинарники и статика сначала загружаются во временную директорию `/tmp/avari-deploy-<run_id>`.
   - Применяются через утилиту `install` и `rsync`, исключая ситуацию, когда сервис перезапускается с поврежденными/недокачанными файлами.
4. **Health Check**: После рестарта сервис опрашивается на статус `active`. Если сервис упал — GitHub Actions завершится с ошибкой и уведомит вас.
5. **Защита от состояния гонки (Race conditions)**: `concurrency: production-vps-deploy` блокирует одновременный запуск двух деплоев.

---

## 📋 Инструкция по настройке за 3 шага

### Шаг 1. Генерация выделенного SSH-ключа

На вашем локальном компьютере (или прямо на VPS) выполните команду:

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

## 🎯 Как теперь работает обновление:

- **Автоматически**: Любой коммит или слияние (Merge) в ветку `main` или `master` автоматически запускает тестирование, сборку и обновление продакшена на VPS.
- **Вручную (Manual Trigger)**:
  Вкладка **Actions** в GitHub $\to$ **CI/CD Pipeline** $\to$ кнопка **Run workflow** $\to$ выбрать ветку `main` $\to$ **Run**.

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
