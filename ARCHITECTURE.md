# Persona Capture Form — архитектура (reverse engineering newmaterial.ai)

Источник: чанк `/assets/persona-capture-form-COZg-zPr.js` (Vite ESM чанк, React 19 + React Router 7,
Framer Motion (motion) + Base UI). Деобфускация: webcrack → prettier. Полностью читаемый дамп:
`/tmp/opencode/persona-form.pretty.js` (2486 строк).

## Стек (наблюдаемо из импортов чанка)

| Технология | Свидетельство |
|---|---|
| React 19 | импорт `./chunk-EPOLDU6W-DDKLhvzC.js` → `r` (react), `L` (Link) |
| Framer Motion / motion | `motion` (`b.div`, `b.form`), `useMotionValue`, `useTransform`, `animate`, `useReducedMotion`, `AnimatePresence`, `MotionConfigContext` |
| Base UI | `useButton`, `useRenderElement`, `createBaseUIEventDetails`, `popupStateMapping`, `useBaseUiId` (чанк `button-D2XkC4S1.js` → компонент `Button`) |
| Tailwind CSS 4 | классы вида `w-70 h-80 rounded-[1.3125rem] bg-fg/12`, кастомные токены `--persona-capture-*` |
| React Router 7 | `<Link to="/privacy">` |

## Карта компонентов чанка persona-capture-form

Экспорты чанка: `Pt→P` (форма), `He→S` (SocialButton), `Ae→g` (faviconUrl).

```
PersonaCaptureForm (Pt)                    ← главный оркестратор, конечный автомат фаз
├─ FieldPanel (Se)                         ×3 — стопка "карточек" полей (name/email/role)
│   ├─ prompt-подпись (анимируется height/opacity при complete)
│   └─ FieldInput (Te) | RoleAutocomplete (_Component4)
├─ SubmitControl (_Component5)             ← круговой countdown-ring кнопка отправки
│   ├─ Button (Base UI)                     ← $e, вариант default/muted
│   ├─ иконки ArrowUp/Check/CheckFilled     ← Le, Ie, Ve из icons-DSyQTBjT.js
│   └─ AnimatePresence-переключение submitting/success ("Thanks")
├─ ReceiveUpdatesCheckbox (_Component2)    ← чекбокс "Receive updates" + link /privacy
├─ FaviconBadge (_Component3)              ← фавикон компании у аватара (corporate email)
├─ MessageComposer (_Component6)           ← follow-up сообщение (только source="get-in-touch")
├─ SocialButton (He)                       ← кнопки LinkedIn/X "Connect/Follow" (в follow-up)
└─ context: useTint() (tint-DSUULco-.js)   ← tint/textColor бренда
```

## Пропсы PersonaCaptureForm (точные)

```
onSubmitted()                        — колбэк успеха
glass: boolean = false               — blur-версия поверх контента
showIntro: boolean = true            — строка "Before we continue, let's make this personal."
source: string | undefined           — "get-in-touch" | др.; включает follow-up режим (если есть onSubmitMessage)
onSubmit(payload, {onSuccess, onError}) — отправка данных (владелец решает, куда слать)
onSubmitMessage({submissionId, messageId, message}) — follow-up сообщение (валидация ≤2000 симв.)
onSubscribe(submissionId)            — подписка из follow-up
initialState: {phase, revealed, fields, error} — восстановление состояния (SSR/инспекция)
onStateChange({phase, revealed, fields, error})
countdownDurationMs = 1800
countdownPaused = false
pauseCountdownOnHover = true
keyboardScope: "document" | "form"
messageFlightVariant: "throw" | "upward"
```

Payload отправки: `{ submissionId (uuid), name, email, company: role, receiveUpdates, source, pageUrl }`.

## Конечный автомат фаз

`data-persona-capture-phase` на корневом div:

```
phase = messagePhase ?? (success ? "success"
  : countdown ? "countdown"
  : submitting ? "submitting"
  : error ? "error"
  : step===0 ? "name" : step===1 ? "email" : "role")
```

- `step` (revealed): 0 name → 1 email → 2 role. Вперед: Enter/Tab/клик → валидация текущего поля.
- Назад: Backspace на пустом поле, Escape, Shift+Tab, Cmd/Ctrl+Z, клик по completed-полю.
- Pre-submit: `role` (шаг 2) → submit → фаза `countdown` (кольцо 1.8s; hover ставит паузу; Escape/клик отменяет → назад на role) → `submitting` → `onSubmit(payload,{onSuccess,onError})` → `success` | `error`.
- Авто-скип: если в localStorage-независимом初始 state name+email валидны — сразу шаг 2.
- `success`: blur+fade полей, "Thanks" у кнопки; в режиме get-in-touch через 2.4s → `follow-up` (MessageComposer) → `message-sending` → `message-sent` | `message-error`.
- Ошибки — inline через `role="alert"` sr-only span (ключ по счётчику для перезапуска анонса).

## Логика сбора данных (утилиты)

- `ROLE_SUGGESTIONS` — 196 должностей; prefix-match по вводу (ghost-text автодополнение; Tab/клик принимает).
- `FREE_EMAIL_DOMAINS` — ~37 публичных доменов; corporate-domain (`nt()`) включает фавикон-бейдж.
- email-валидация: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
- `splitName()` — firstName из "Last, First" или "First Last".
- debounce 400ms на запрос фавикона.
- Плейсхолдеры имени/email — случайная "персона" из списка исторических личностей (Ada Lovelace и др.).

## Движение/анимация (константы)

- базовый spring: `{duration:0.5, type:"spring", bounce:0}` (везде через `S`)
- "pop" spring: `{stiffness:110, damping:22, mass:1}` (успех-масштаб)
- шаг стопки полей: 24px (`dt`), панель высотой 94px (124 c footer)
- countdown: SVG circle r=15, strokeDasharray=2πr, rAF-луп с экспоненциальным hover-damping (τ=180/220ms)
- полёт сообщения (MessageComposer): численный интегратор `flightMotion(variant)` ("throw"/"upward", rotation+translate)
- всё уважает `useReducedMotion` (transition `{duration:0}`)

## Цепочка использования (проверено по импортам чанков)

```
app → PaperStack (paper-stack-_BS6s43l.js)          ← плавающая "стопка бумаг" с fan-layout
  ├─ PersonaCard (Vt)                               ← обёртка формы
  │   └─ PersonaCaptureForm (P из persona-capture-form)
  │       onSubmit       → POST /session-agent  intent=submit-persona       (+analytics ut(), receiveUpdates:"true"/"false")
  │       onSubmitMessage→ POST /session-agent  intent=submit-contact-message (только source="get-in-touch")
  │       onSubscribe    → POST /session-agent  intent=subscribe-contact-updates {submissionId}
  │         · ответ валидируется: error-message extractor + проверка intent в ответе
  │         · submit-persona возвращает {personName:{firstName}} → onSuccess({firstName})
  ├─ карточки kind:"paper" | kind:"persona", personaMode:"gate"|"browse"
  ├─ CardTag (Fe) — вертикальная бирка на правом краю стопки
  └─ Discord presence/audience (GET /api/presence/audience?context=…&slug=…) — "X is available right now."
content.layout (content.layout-_Xgixw_r.js) — импортирует S (SocialButton) для статей
```

Итого UI-иерархия страницы: `PaperStack` (куча карточек, драг через `data-drag-handle`,
циклическая навигация сверху стопки) → поверх — persona-карточка с формой в режиме gate.

## CSS-токены (извлечены из root-Dz-Vsc7R.css → src/index.css)

Форма и карта живут на этих переменных (значения свет/тьма через `light-dark()`,
сайт переключает `color-scheme` классами `.light`/`.dark`/`.system`):

| Переменная | Значение | Роль |
|---|---|---|
| `--bg` | `light-dark(#fff, #0a0a0a)` | фон карты |
| `--fg` | `light-dark(#2a292e, #ededed)` | текст |
| `--muted` | `light-dark(#6b7280, #a1a1aa)` | вторичный текст |
| `--persona-capture-bg` | `light-dark(#1c2326, #edf0f1)` | (фон режима) |
| `--persona-capture-shell-bg` | `#0000000a` | подложка карты |
| `--persona-capture-card-bg` | `var(--bg)` | внутренняя карточка |
| `--persona-capture-card-outline` | `#ffffff80` | внешняя рамка (в labs-теме: `var(--discord-invite-card-outline)`) |
| `--persona-capture-inner-outline` | `light-dark(#fff, #ffffff14)` | внутренний контур |
| `--persona-capture-action-bg/fg` | `white/black` | кнопка отправки |
| `--persona-capture-action-outline` | `color-mix(fg 12%)` | контур неактивной кнопки |
| `--persona-capture-cancel-bg` | `#f58220` | оранжевый при отмене countdown |
| `--persona-capture-action-shadow` | `transparent` | тень кнопки |
| `--mild-shadow` | `0 2px 12px #00000014` | `.shadow-mild` (карта) |
| `--subtle-shadow` | `0 1px 12px #0000000f` | favicon-бейдж |
| `--content-shadow` | `0 2px 16px 0 #00000005` | стеклянные элементы |

Типографика: `ABC Favorit` (Book=350 — это `font-weight-normal`!),
`.text-caption` = 1rem/1.125rem@40rem, `.text-footnote` = 0.875rem/1rem,
`.text-body` = 1.125rem, letter-spacing −0.02em.
Шрифты скачаны в `public/fonts/` (Book/Regular/Medium/Mono/Lining).

Кастомные Tailwind-варианты: `touch:` = `&:where(:hover,:active)`,
`pointer-coarse:`/`pointer-fine:` = media `(pointer: …)`.
Кастомный ease: `--ease-damped-spring` (linear()).

Токены labs-темы (тёмный вариант статьи): `--persona-capture-card-outline:
var(--discord-invite-card-outline)`, `shell-bg: #ffffff0a`,
`card-bg: var(--discord-invite-bar-bg)`, `action-bg: var(--bg)`, `action-fg: var(--fg)`.

## Статус реализации (в проекте /home/agent/re)

| Компонент | Статус |
|---|---|
| PersonaCaptureForm (фазовая машина, клавиатура, submit/countdown/cancel) | ✅ реализован |
| FieldPanel / FieldInput / RoleAutocomplete | ✅ реализованы |
| SubmitControl (countdown rAF-луп, hover-пауза, success pop, "Thanks") | ✅ реализован |
| ReceiveUpdatesCheckbox / FaviconBadge | ✅ реализованы |
| Иконки (ArrowRight/Check/X) + IconButton | ✅ извлечены из icons-чанка |
| PersonaCard wiring (API-заглушки) | ✅ реализован |
| CSS-токены + шрифты ABC Favorit | ✅ перенесены |
| MessageComposer (follow-up) | ⛔ заглушка |
| PaperStack (fan-layout, drag) | ⛔ заглушка |

## Осталось доразведать (след. шаги)

- [x] потребитель формы: PaperStack + PersonaCard; source="get-in-touch"
- [x] CSS-переменные `--persona-capture-*`, `--color-*`, `shadow-mild`
- [x] шрифты ABC Favorit
- [x] иконки из icons-DSyQTBjT.js (Le=стрелка, Ie=check, Ve=X; $e=IconButton div-кнопка)
- [ ] follow-up bubble (speech-bubble-path), MessageComposer целиком (строки 362–997 persona-form.pretty.js)
- [ ] драг стопки (data-drag-handle, useDragControls), fan-layout In() полностью
- [ ] досканально: `--artifact-presentation-*` для SocialButton, `--more-context-arrow-size`
