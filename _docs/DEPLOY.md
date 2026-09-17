# Инструкция по развертыванию Avari Keys MVP

В этом документе описан пошаговый процесс развертывания распределенной инфраструктуры:
- **Сервер M0 (РФ)**: Master Web UI (`m0.vpn.test`), Master Backend API (`m0api.vpn.test`), Cascade Ingress (`s1.vpn.test`).
- **Сервер S1 (EU)**: Cascade Egress (выход в интернет).
- **Сервер S2 (EU)**: Прямой узел AWG (`s2.vpn.test`).

---

## ⚠️ Шаг 0: Подготовка серверов и отключение конфликтующих веб-серверов

На многих VPS провайдерах по умолчанию уже запущен Nginx или Apache, который занимает порты `80` и `443`. Перед запуском Caddy обязательно остановите и отключите их:

```bash
# Выполните на серверах M0 и S2:
sudo systemctl stop nginx apache2 2>/dev/null || true
sudo systemctl disable nginx apache2 2>/dev/null || true
```

---

## Шаг 1: Установка AmneziaWG и настройка Каскада

### 1.1. Настройка Каскада (M0 $\to$ S1):
1. На сервере **S1 (Зарубеж)** и **M0 (РФ)** установите AmneziaWG по инструкции:
   [https://github.com/bivlked/amneziawg-installer](https://github.com/bivlked/amneziawg-installer)
2. Настройте каскадную связку между M0 и S1 по официальному руководству:
   [CASCADE.md](https://github.com/bivlked/amneziawg-installer/blob/main/CASCADE.md)
3. Убедитесь, что на M0 скрипт `/root/awg/manage_amneziawg.sh` доступен и работает.

### 1.2. Настройка прямого сервера S2:
1. На сервере **S2 (Зарубеж)** установите AmneziaWG:
   ```bash
   bash <(curl -sSL https://raw.githubusercontent.com/bivlked/amneziawg-installer/main/amneziawg-install.sh)
   ```

---

## Шаг 2: Установка Caddy (Автоматический Let's Encrypt HTTPS)

На серверах **M0** и **S2** установите Caddy:

```bash
# Ubuntu / Debian
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy
```

---

## Шаг 3: Сборка и развертывание бинарников

Соберите бинарники на вашей рабочей машине под Linux:

```bash
# Сборка под Linux (AMD64 / ARM64)
cd apps/backend
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o ../../dist/avari-master ./cmd/master
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -ldflags="-s -w" -o ../../dist/avari-slave ./cmd/slave

# Сборка фронтенда
cd ../frontend
npm run build
```

---

## Шаг 4: Настройка сервера M0 (Master)

1. Скопируйте файлы на M0:
   ```bash
   # Бинарники
   scp dist/avari-master root@m0.ip:/usr/local/bin/
   scp dist/avari-slave root@m0.ip:/usr/local/bin/
   
   # Фронтенд
   ssh root@m0.ip "mkdir -p /var/www/avari-keys/frontend /opt/avari-keys/data"
   scp -r apps/frontend/dist/* root@m0.ip:/var/www/avari-keys/frontend/
   
   # Systemd юниты
   scp deploy/systemd/avari-master.service root@m0.ip:/etc/systemd/system/
   scp deploy/systemd/avari-slave.service root@m0.ip:/etc/systemd/system/
   
   # Caddyfile
   scp deploy/caddy/Caddyfile.master root@m0.ip:/etc/caddy/Caddyfile
   ```

2. Запустите сервисы на M0:
   ```bash
   ssh root@m0.ip
   chmod +x /usr/local/bin/avari-master /usr/local/bin/avari-slave
   systemctl daemon-reload
   systemctl enable --now avari-master avari-slave caddy
   ```

3. **Получите пароль администратора Forve**:
   ```bash
   journalctl -u avari-master -n 50 --no-pager
   ```
   В логе будет выведен сгенерированный пароль для пользователя `Forve`.

4. **Получите API Key для локального Cascade Slave API**:
   ```bash
   journalctl -u avari-slave -n 50 --no-pager
   ```
   Скопируйте сгенерированный ключ `SLAVE API KEY`.

---

## Шаг 5: Настройка сервера S2 (Direct Slave)

1. Скопируйте бинарник и конфигурацию на S2:
   ```bash
   scp dist/avari-slave root@s2.ip:/usr/local/bin/
   scp deploy/systemd/avari-slave.service root@s2.ip:/etc/systemd/system/
   scp deploy/caddy/Caddyfile.slave root@s2.ip:/etc/caddy/Caddyfile
   ```

2. Запустите сервисы на S2:
   ```bash
   ssh root@s2.ip
   chmod +x /usr/local/bin/avari-slave
   systemctl daemon-reload
   systemctl enable --now avari-slave caddy
   ```

3. **Получите API Key для S2 Slave API**:
   ```bash
   journalctl -u avari-slave -n 50 --no-pager
   ```

---

## Шаг 6: Подключение нод в веб-интерфейсе

1. Откройте в браузере `https://m0.vpn.test`.
2. Войдите под администратором `Forve` с паролем из шага 4.
3. Перейдите на вкладку **«Серверы (Ноды)»** $\to$ **«Добавить Slave Сервер»**:
   - **Нода 1 (Каскад)**:
     - Название: `Каскад M0 (РФ) -> S1 (EU)`
     - Тип: `Каскад`
     - URL: `https://s1.vpn.test` (или `http://127.0.0.1:8081` если локально на M0)
     - API Key: Ключ из шага 4.
   - **Нода 2 (Прямой)**:
     - Название: `Прямой туннель S2 (EU)`
     - Тип: `Прямой`
     - URL: `https://s2.vpn.test`
     - API Key: Ключ из шага 5.
4. Нажмите **«Проверить Health»** — обе ноды должны перейти в статус `Online` (зеленый индикатор).

Готово! Теперь пользователи могут регистрироваться (вы подтверждаете их во вкладке «Пользователи») и создавать как каскадные, так и прямые AmneziaWG ключи в один клик.
