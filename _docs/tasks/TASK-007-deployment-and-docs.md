# TASK-007: Документация развертывания, systemd и reverse-proxy

## 1. Описание задачи (Specific)
Подготовить готовую инфраструктурную обвязку и документацию для развертывания Avari Keys MVP на живых серверах (M0, S1, S2):
- Инструкция по установке AmneziaWG через `bivlked/amneziawg-installer`:
  - Настройка каскада M0 (РФ) $\to$ S1 (EU) по `CASCADE.md`.
  - Настройка прямого узла S2 (EU).
- `systemd` unit-файлы:
  - `avari-master.service` (для Master Backend на M0).
  - `avari-slave.service` (для Slave API на M0 и S2).
- Примеры конфигураций веб-сервера (Caddy / Nginx) с автоматическим получением сертификатов Let's Encrypt:
  - `m0.vpn.test` (Frontend SPA).
  - `m0api.vpn.test` (Master Backend API).
  - `s1.vpn.test` / `s2.vpn.test` (Slave API + Decoy landing page).
- Скрипт быстрого обновления и установки бинарников.

## 2. Критерии приемки (Measurable)
- [ ] Готовые systemd unit-файлы с автоперезапуском (`Restart=always`) и безопасным пользователем.
- [ ] Проверенные конфигурации Caddyfile и Nginx conf.
- [ ] Пошаговый `DEPLOY.md` в корне или `_docs/` с командами от покупки серверов до выдачи первого ключа.

## 3. Достижимость (Achievable)
Опирается на готовые стандартные практики Linux systemd и Caddy/Nginx.

## 4. Актуальность (Relevant)
Обеспечивает легкий ввод системы в эксплуатацию за считанные минуты.

## 5. Ограничение по времени и ветка (Time-bound & Gitflow)
- **Ветка**: `feature/TASK-007-deployment-and-docs`
- **Слияние**: в `develop`
