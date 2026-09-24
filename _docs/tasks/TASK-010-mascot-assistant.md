# TASK-010: Интерактивный UI-помощник (Маскот), онбординг и база знаний

**Статус**: ✅ Done  
**Исполнитель**: Antigravity  
**Ветка**: `feature/TASK-010-mascot-assistant`  

---

## 🎯 Цель задачи
Интеграция дружелюбного маскота-ассистента в веб-интерфейс Avari Keys для помощи новичкам:
1. Приветствие на экране авторизации/регистрации (`AuthModal`).
2. Пошаговый онбординг первого VPN-ключа (`OnboardingTour`).
3. Контекстный бабл «Нужна помощь?» над маскотом в окне создания ключа (`CreateKeyModal`) с модальным меню из 5 популярных вопросов и понятных ответов.
4. Плавающий маскот-виджет (`FloatingMascot`) с возможностью сворачивания и перезапуска обучения в любой момент.

---

## 🛠 Реализация
1. **Ассет маскота**: `apps/frontend/public/assets/mascot.png`
2. **База знаний**: `apps/frontend/src/utils/faqData.ts` (5 структурированных ответов для новичков).
3. **Компоненты ассистента**: `apps/frontend/src/components/MascotAssistant.tsx`:
   - `MascotAvatar`: Аватар персонажа с золотым свечением.
   - `MascotAuthGreeting`: Приветственный блок на форме авторизации.
   - `MascotHelpBubble`: Интерактивный бабл над маскотом «Нужна помощь?».
   - `MascotFaqModal`: Модальное окно с 5 вопросами-аккордеонами.
   - `FloatingMascot`: Плавающий виджет в правом нижнем углу экрана.
4. **Интерактивный тур**: `apps/frontend/src/components/OnboardingTour.tsx` (шаги 1–4 от кнопки создания до QR-кода).
5. **Интеграция**:
   - `AuthModal.tsx`: баннер приветствия.
   - `CreateKeyModal.tsx`: бабл «Нужна помощь?» и FAQ-модалка.
   - `KeyModal.tsx`: совет Хранителя и ссылка на инструкцию.
   - `App.tsx`: OnboardingTour, FloatingMascot, FAQ, пустой экран с маскотом.

---

## ✅ Верификация
- [x] `cd apps/frontend && npm run build` (tsc & vite build: PASS)
- [x] `cd apps/backend && go test -v -race ./...` (PASS)
