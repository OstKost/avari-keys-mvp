# TASK-022: Полный редизайн системы сбора статистики и телеметрии AmneziaWG

**Статус**: ✅ Done
**Ветка**: `feature/TASK-022-stats-telemetry-redesign`
**Исполнитель**: Antigravity & Codex

---

## 🎯 Цель задачи
Полностью переработать сбор статистики и телеметрии сетевого трафика AmneziaWG/WireGuard:
1. Устранить потерю статистики при сбросе счетчиков ядра Linux (после перезагрузки или перезапуска `awg-quick`).
2. Заменить ненадежный поиск конфигурационных файлов на диске детерминированным сопоставлением пиров по **`PublicKey`**.
3. Реализовать фоновый сбор телеметрии на Master (Telemetry Collector Worker) с вычислением дельт и сохранением в SQLite (`client_configs`, `peer_traffic_daily`, `node_traffic_daily`).
4. Обеспечить моментальную отдачу дашборда и списков ключей из локальной БД/кэша памяти без синхронных блокирующих вызовов к Slave.

---

## 📋 Чек-лист реализации

### 1. Slave API & Runner
- [x] Расширить `PeerStats` полями `public_key`, `interface`, `allowed_ips`, `endpoint`.
- [x] В `ClientResponse` гарантировать заполнение `public_key`.
- [x] Оптимизировать `real_runner.go`: чистый сбор через `awg show all dump` / `wg show all dump` и `/proc/net/dev`.

### 2. SQLite Schema & Storage
- [x] Миграция `client_configs`: добавить `public_key`, `allocated_ip`, `total_rx_bytes`, `total_tx_bytes`, `last_handshake_epoch`, `last_seen_at`.
- [x] Создать таблицы `peer_traffic_daily` и `node_traffic_daily`.
- [x] Методы обновления накопительного трафика и подсчета помесячного объема.

### 3. Master Telemetry Worker & Delta Engine
- [x] Фоновый воркер опроса нод (каждые 15–30с) с пулом горутин.
- [x] Расчет дельт (`Δ = current - previous`, обработка ребутов).
- [x] Кэширование дашборда и неблокирующий API.

### 4. Frontend & Тесты
- [x] Актуализация отображения трафика за месяц, суммарного трафика и статуса рукопожатий.
- [x] Unit и интеграционные тесты для Delta Engine и Telemetry Worker.

