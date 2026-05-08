export const calendarTemplate = {
  styleText: `:root {
  --bg: oklch(99% 0.002 240);
  --surface: oklch(100% 0 0 / 0.86);
  --surface-strong: oklch(100% 0 0 / 0.95);
  --fg: oklch(18% 0.012 250);
  --muted: oklch(54% 0.012 250);
  --border: oklch(92% 0.005 250);
  --accent: oklch(58% 0.18 255);
  --accent-2: oklch(72% 0.08 220);
  --accent-soft: oklch(58% 0.18 255 / 0.12);
  --shadow-card: 0 1px 3px oklch(0% 0 0 / 0.04), 0 8px 24px oklch(0% 0 0 / 0.06);
  --shadow-float: 0 14px 36px oklch(210 0.05 0 / 0.12);
  --font-display: 'Trebuchet MS', 'Segoe UI', sans-serif;
  --font-body: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  --font-mono: 'Consolas', 'Courier New', monospace;
  --header-bg: color-mix(in oklab, var(--bg) 82%, transparent);
}

:root[data-theme='dark'] {
  --bg: oklch(18% 0.03 295);
  --surface: oklch(24% 0.03 300 / 0.9);
  --surface-strong: oklch(28% 0.04 300 / 0.96);
  --fg: oklch(95% 0.01 320);
  --muted: oklch(78% 0.02 315);
  --border: oklch(36% 0.04 300);
  --accent: oklch(74% 0.2 332);
  --accent-2: oklch(72% 0.15 290);
  --accent-soft: oklch(74% 0.2 332 / 0.18);
  --shadow-card: 0 1px 2px oklch(0% 0 0 / 0.34), 0 14px 34px oklch(0% 0 0 / 0.32);
  --shadow-float: 0 18px 46px oklch(0% 0 0 / 0.42);
}

*, *::before, *::after { box-sizing: border-box; }

html {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

body {
  margin: 0;
  min-height: 100dvh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, var(--accent-soft), transparent 26%),
    radial-gradient(circle at bottom right, oklch(72% 0.08 220 / 0.14), transparent 28%),
    var(--bg);
  color: var(--fg);
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.025;
  pointer-events: none;
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(var(--border) 1px, transparent 1px),
    linear-gradient(90deg, var(--border) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.14;
  pointer-events: none;
}

body.calendar-page-react #root {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.header {
  position: relative;
  z-index: 12;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 14px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border);
  background: var(--header-bg);
  backdrop-filter: blur(22px) saturate(180%);
}

.header::after {
  content: '';
  position: absolute;
  left: 24px;
  right: 24px;
  bottom: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent-soft), transparent);
}

.header-wordmark {
  display: flex;
  align-items: center;
  gap: 10px;
}

.header-wordmark .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 0 0 0 oklch(58% 0.18 255 / 0.4);
  animation: pulse-dot 2.4s ease-in-out infinite;
}

.header-wordmark .text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.header-wordmark strong {
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.02em;
}

.header-wordmark span {
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.header-center {
  display: flex;
  justify-content: center;
}

.header-nav-btn,
.event-btn,
.icon-btn {
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.header-nav-btn {
  min-height: 40px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid oklch(58% 0.18 255 / 0.16);
  background: var(--surface-strong);
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  box-shadow: var(--shadow-card);
}

.header-nav-btn.back-btn {
  padding: 0 20px 0 14px;
  gap: 10px;
  border-color: oklch(58% 0.18 255 / 0.22);
  background: linear-gradient(135deg, oklch(58% 0.18 255 / 0.1), var(--surface-strong));
}

.back-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: oklch(58% 0.18 255 / 0.12);
  border: 1px solid oklch(58% 0.18 255 / 0.18);
}

.back-icon svg {
  width: 14px;
  height: 14px;
}

.header-nav-btn:hover,
.event-btn:hover,
.icon-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-float);
}

.header-meta {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.header-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid oklch(58% 0.18 255 / 0.1);
  background: var(--surface);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.header-badge .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-btn {
  min-width: 38px;
  height: 38px;
  padding: 0 12px;
  border-radius: 14px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.icon-btn svg { width: 16px; height: 16px; }

.theme-btn-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.page {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  width: min(1220px, calc(100% - 32px));
  margin: 14px auto 16px;
}

.calendar-shell {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  border: 1px solid var(--border);
  border-radius: 32px;
  background: var(--surface);
  backdrop-filter: blur(12px);
  box-shadow: var(--shadow-float);
  overflow: hidden;
  position: relative;
}

.calendar-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at top right, var(--accent-soft), transparent 22%),
    radial-gradient(circle at bottom left, oklch(72% 0.08 220 / 0.1), transparent 24%);
  pointer-events: none;
}

.calendar-top,
.calendar-meta,
.calendar-grid-wrap,
.calendar-footer {
  position: relative;
  z-index: 1;
}

.calendar-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 20px 14px;
  border-bottom: 1px solid var(--border);
}

.calendar-title small,
.mini-stat span,
.weekday,
.legend-item,
.event-tray-head span,
.event-pill-time,
.modal-event-time,
.day-modal-kicker {
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.calendar-title small {
  display: block;
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}

.calendar-title h1 {
  margin: 0;
  font-size: clamp(28px, 4vw, 38px);
  line-height: 1;
  letter-spacing: -0.05em;
}

.calendar-title p {
  margin: 6px 0 0;
  color: var(--muted);
  font-size: 14px;
}

.calendar-status {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid oklch(58% 0.18 255 / 0.14);
  background: var(--surface-strong);
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.calendar-status::before {
  content: '';
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
}

.calendar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calendar-meta {
  display: flex;
  gap: 12px;
  padding: 14px 20px 0;
  flex-wrap: wrap;
}

.mini-stat {
  min-width: 160px;
  padding: 12px 14px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--surface-strong);
  box-shadow: var(--shadow-card);
}

.mini-stat span {
  display: block;
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}

.mini-stat strong {
  font-size: 16px;
  letter-spacing: -0.03em;
}

.calendar-grid-wrap {
  min-height: 0;
  padding: 14px 20px;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  grid-template-rows: 22px repeat(5, minmax(0, 1fr));
  gap: 8px;
  height: 100%;
}

.weekday {
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.08em;
  padding: 2px 4px 6px;
}

.day {
  min-height: 0;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 22px;
  background: var(--surface-strong);
  box-shadow: var(--shadow-card);
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.day:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-float);
}

.day.muted {
  background: oklch(100% 0 0 / 0.35);
  box-shadow: none;
  cursor: default;
}

.day.today {
  border-color: oklch(58% 0.18 255 / 0.32);
  box-shadow: 0 0 0 1px oklch(58% 0.18 255 / 0.2), 0 8px 30px oklch(58% 0.18 255 / 0.16);
}

.day.selected,
.day.featured {
  background: linear-gradient(180deg, oklch(58% 0.18 255 / 0.12), var(--surface-strong));
}

.day.featured::after {
  content: '';
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px dashed color-mix(in oklab, var(--day-accent, var(--accent)) 46%, transparent);
  opacity: 0.76;
}

.day-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.day-num {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.event-count {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklab, var(--day-accent, var(--accent)) 12%, transparent);
  color: var(--day-accent, var(--accent));
  border: 1px solid color-mix(in oklab, var(--day-accent, var(--accent)) 22%, transparent);
  font-family: var(--font-mono);
  font-size: 10px;
}

.day-label {
  min-height: 30px;
  font-size: 12px;
  line-height: 1.3;
  color: color-mix(in oklab, var(--fg) 84%, var(--muted));
  margin-bottom: 8px;
}

.markers {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

.marker {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: color-mix(in oklab, var(--marker-tone, var(--accent)) 30%, transparent);
}

.marker.strong { background: var(--marker-tone, linear-gradient(135deg, var(--accent), var(--accent-2))); }

.calendar-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px 18px;
  flex-wrap: wrap;
}

.footer-main {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  flex: 1;
}

.legend {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.05em;
  color: var(--muted);
}

.legend-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: oklch(58% 0.18 255 / 0.24);
}

.legend-dot.strong { background: linear-gradient(135deg, var(--accent), var(--accent-2)); }

.note {
  color: var(--muted);
  font-size: 12px;
}

.event-tray {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: var(--surface-strong);
  box-shadow: var(--shadow-card);
}

.event-tray-head {
  min-width: 110px;
}

.event-tray-head span {
  display: block;
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.08em;
}

.event-tray-head strong {
  display: block;
  font-size: 14px;
  letter-spacing: -0.03em;
}

.event-pills {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  flex: 1;
}

.event-pill,
.event-empty {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 12px;
  border-radius: 18px;
  border: 1px solid color-mix(in oklab, var(--event-accent, var(--accent)) 20%, var(--border));
  background: color-mix(in oklab, var(--event-accent, var(--accent)) 10%, var(--surface-strong));
}

.event-pill.is-active {
  background: color-mix(in oklab, var(--event-accent, var(--accent)) 16%, var(--surface-strong));
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--event-accent, var(--accent)) 22%, transparent);
}

.event-pill-time {
  font-size: 10px;
  color: var(--event-accent, var(--accent));
}

.event-pill-copy {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.event-pill-label,
.event-empty {
  font-size: 12px;
  color: var(--fg);
}

.event-pill-meta {
  font-size: 10px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.event-empty {
  color: var(--muted);
  border-color: var(--border);
  background: var(--surface);
  border-style: dashed;
}

.event-empty.loading {
  background:
    linear-gradient(90deg, transparent, color-mix(in oklab, var(--surface-strong) 72%, white), transparent),
    var(--surface);
  background-size: 220px 100%, auto;
  animation: tray-shimmer 1.4s linear infinite;
}

.event-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.event-btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid oklch(58% 0.18 255 / 0.18);
  background: var(--surface-strong);
  color: var(--fg);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.event-btn.primary {
  background: oklch(58% 0.18 255 / 0.1);
  color: var(--accent);
}

.event-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.day-modal,
.create-event-modal {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  visibility: hidden;
  pointer-events: none;
  overflow: hidden;
}

.create-event-modal { z-index: 40; }

.day-modal.is-open,
.create-event-modal.is-open {
  visibility: visible;
  pointer-events: auto;
}

.day-modal-backdrop,
.create-event-backdrop {
  position: absolute;
  inset: 0;
  background: oklch(14% 0.03 295 / 0.34);
  opacity: 0;
  backdrop-filter: blur(14px) saturate(115%);
  -webkit-backdrop-filter: blur(14px) saturate(115%);
  will-change: opacity, backdrop-filter;
  transform: translateZ(0);
  transition: opacity 0.14s ease-out;
}

.day-modal-card {
  position: relative;
  width: min(760px, calc(100% - 24px));
  border-radius: 32px;
  border: 1px solid var(--border);
  background: var(--surface-strong);
  box-shadow: 0 24px 80px oklch(0% 0 0 / 0.24);
  overflow: hidden;
  opacity: 0;
  transform: translateY(18px) scale(0.98);
  will-change: transform, opacity;
  backface-visibility: hidden;
  transition: transform 0.22s ease-out, opacity 0.18s ease-out;
}

.day-modal.is-open .day-modal-backdrop,
.day-modal.is-open .create-event-backdrop,
.create-event-modal.is-open .day-modal-backdrop,
.create-event-modal.is-open .create-event-backdrop {
  opacity: 1;
}

.day-modal.is-open .day-modal-card,
.create-event-modal.is-open .day-modal-card {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.day-modal-header,
.day-modal-body,
.day-modal-actions {
  position: relative;
  z-index: 1;
}

.day-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  padding: 28px 28px 18px;
}

.day-modal-kicker {
  display: block;
  color: var(--muted);
  font-size: 10px;
  letter-spacing: 0.09em;
  margin-bottom: 8px;
}

.day-modal-title {
  margin: 0;
  font-size: clamp(44px, 8vw, 78px);
  line-height: 0.95;
  letter-spacing: -0.06em;
}

.day-modal-subtitle {
  margin: 10px 0 0;
  color: var(--muted);
  font-size: 16px;
}

.day-modal-body {
  padding: 0 28px 18px;
  display: grid;
  gap: 12px;
}

.modal-event {
  display: grid;
  grid-template-columns: 84px minmax(0, 1fr);
  gap: 14px;
  align-items: center;
  padding: 16px 18px;
  border-radius: 22px;
  border: 1px solid color-mix(in oklab, var(--event-accent, var(--accent)) 16%, var(--border));
  background: color-mix(in oklab, var(--event-accent, var(--accent)) 6%, var(--surface));
  box-shadow: var(--shadow-card);
  cursor: pointer;
}

.modal-event.is-active {
  border-color: color-mix(in oklab, var(--event-accent, var(--accent)) 30%, transparent);
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--event-accent, var(--accent)) 24%, transparent);
}

.modal-event-time {
  color: var(--event-accent, var(--accent));
  font-size: 20px;
  letter-spacing: -0.04em;
}

.modal-event-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.modal-event-label {
  font-size: 20px;
  line-height: 1.1;
  letter-spacing: -0.04em;
}

.modal-event-meta {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.modal-empty {
  padding: 18px;
  border-radius: 22px;
  border: 1px dashed oklch(58% 0.18 255 / 0.18);
  color: var(--muted);
  background: var(--surface);
}

.day-modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 28px 28px;
  flex-wrap: wrap;
}

.day-modal-note {
  color: var(--muted);
  font-size: 13px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.calendar-toast-stack {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 60;
  display: grid;
  gap: 10px;
}

.calendar-toast {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
  max-width: 360px;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--surface-strong) 92%, transparent);
  box-shadow: var(--shadow-float);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.calendar-toast.hide {
  opacity: 0;
  transform: translateY(8px);
}

.calendar-toast.success {
  border-color: oklch(69% 0.17 152 / 0.28);
}

.calendar-toast.error {
  border-color: oklch(65% 0.2 20 / 0.28);
}

.calendar-toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  flex-shrink: 0;
}

.calendar-toast.success .calendar-toast-dot {
  background: oklch(69% 0.17 152);
}

.calendar-toast.error .calendar-toast-dot {
  background: oklch(65% 0.2 20);
}

@keyframes tray-shimmer {
  from { background-position: -220px 0, 0 0; }
  to { background-position: calc(100% + 220px) 0, 0 0; }
}

.form-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

.form-input {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--fg);
  font-family: var(--font-body);
  font-size: 15px;
  padding: 12px 16px;
  outline: none;
  transition: border-color 0.2s ease;
  width: 100%;
}

.form-input:focus {
  border-color: oklch(58% 0.18 255 / 0.5);
}

.form-time-row {
  display: flex;
  gap: 12px;
}

.corner-decor,
.shape-orbit,
.shape-ribbon,
.mesh-line,
.shape-ring,
.shape-spark,
.frame-mark {
  position: fixed;
  pointer-events: none;
}

.corner-decor { width: 120px; height: 120px; }
.corner-decor.top-left { top: 0; left: 0; background: radial-gradient(circle at 0 0, var(--accent-soft), transparent 60%); }
.corner-decor.top-right { top: 0; right: 0; background: radial-gradient(circle at 100% 0, oklch(72% 0.08 220 / 0.18), transparent 60%); }
.corner-decor.bottom-left { left: 0; bottom: 0; background: radial-gradient(circle at 0 100%, oklch(58% 0.18 255 / 0.08), transparent 60%); }
.corner-decor.bottom-right { right: 0; bottom: 0; background: radial-gradient(circle at 100% 100%, oklch(72% 0.08 220 / 0.14), transparent 60%); }
.shape-orbit { border-radius: 50%; border: 1px solid oklch(58% 0.18 255 / 0.2); }
.shape-orbit { width: 240px; height: 240px; right: -90px; top: 110px; }
.shape-orbit.left { width: 220px; height: 220px; left: -82px; top: 29%; right: auto; }
.shape-ribbon.top { width: 220px; height: 220px; top: 96px; right: -128px; border: 1px solid oklch(72% 0.08 220 / 0.22); border-radius: 28px; transform: rotate(45deg); }
.shape-ribbon.bottom { width: 220px; height: 220px; left: -144px; bottom: 82px; border: 1px solid oklch(58% 0.18 255 / 0.18); border-radius: 40px; transform: rotate(45deg); }
.mesh-line.one { top: 142px; left: 12%; width: 220px; height: 1px; transform: rotate(-14deg); background: linear-gradient(90deg, transparent, var(--accent-soft), transparent); }
.mesh-line.two { top: 61%; right: 8%; width: 280px; height: 1px; transform: rotate(18deg); background: linear-gradient(90deg, transparent, oklch(72% 0.08 220 / 0.18), transparent); }
.mesh-line.three { top: 31%; right: 14%; width: 180px; height: 1px; transform: rotate(-30deg); background: linear-gradient(90deg, transparent, var(--accent-soft), transparent); }
.mesh-line.four { left: 8%; bottom: 17%; width: 250px; height: 1px; transform: rotate(23deg); background: linear-gradient(90deg, transparent, oklch(58% 0.18 255 / 0.14), transparent); }
.shape-ring { border-radius: 50%; border: 1px dashed oklch(58% 0.18 255 / 0.2); opacity: 0.68; }
.shape-ring.one { width: 142px; height: 142px; top: 116px; left: 10%; }
.shape-ring.two { width: 112px; height: 112px; right: 13%; bottom: 124px; }
.shape-spark { width: 22px; height: 22px; border-radius: 7px; border: 1px solid oklch(58% 0.18 255 / 0.24); background: linear-gradient(135deg, oklch(58% 0.18 255 / 0.14), transparent 72%); transform: rotate(45deg); }
.shape-spark.one { top: 184px; right: 21%; }
.shape-spark.two { left: 18%; bottom: 144px; }
.frame-mark { width: 54px; height: 54px; border-color: oklch(58% 0.18 255 / 0.18); border-style: solid; }
.frame-mark.top-left { top: 88px; left: 22px; border-width: 1px 0 0 1px; border-top-left-radius: 14px; }
.frame-mark.bottom-right { right: 22px; bottom: 28px; border-width: 0 1px 1px 0; border-bottom-right-radius: 14px; }

@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 0 oklch(58% 0.18 255 / 0.36); }
  50% { box-shadow: 0 0 0 7px oklch(58% 0.18 255 / 0); }
}

@media (max-width: 960px) {
  .calendar-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .calendar-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .weekday { display: none; }
}

@media (max-width: 820px) {
  .header {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .header-wordmark,
  .header-meta {
    justify-content: center;
  }
}

@media (max-width: 560px) {
  .page {
    width: min(100% - 16px, 100%);
    margin-top: 10px;
    margin-bottom: 12px;
  }

  .calendar-shell {
    border-radius: 24px;
  }

  .calendar-top,
  .calendar-meta,
  .calendar-grid-wrap,
  .calendar-footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .calendar-grid {
    grid-template-columns: 1fr;
    grid-template-rows: repeat(31, minmax(78px, auto));
    overflow: auto;
    padding-right: 2px;
  }

  .day-modal,
  .create-event-modal {
    padding: 12px;
  }

  .day-modal-header,
  .day-modal-body,
  .day-modal-actions {
    padding-left: 18px;
    padding-right: 18px;
  }

  .modal-event {
    grid-template-columns: 1fr;
    gap: 6px;
  }

  .modal-event-time {
    font-size: 16px;
  }

  .modal-event-label {
    font-size: 18px;
  }

  .header-badge,
  .theme-btn-label {
    display: none;
  }

  .form-time-row {
    flex-direction: column;
  }

  .calendar-toast-stack {
    left: 12px;
    right: 12px;
    bottom: 12px;
  }

  .calendar-toast {
    min-width: 0;
    max-width: none;
  }
}`,
  bodyHtml: `<div class="corner-decor top-left"></div>
<div class="corner-decor top-right"></div>
<div class="corner-decor bottom-left"></div>
<div class="corner-decor bottom-right"></div>
<div class="shape-orbit"></div>
<div class="shape-orbit left"></div>
<div class="shape-ribbon top"></div>
<div class="shape-ribbon bottom"></div>
<div class="mesh-line one"></div>
<div class="mesh-line two"></div>
<div class="mesh-line three"></div>
<div class="mesh-line four"></div>
<div class="shape-ring one"></div>
<div class="shape-ring two"></div>
<div class="shape-spark one"></div>
<div class="shape-spark two"></div>
<div class="frame-mark top-left"></div>
<div class="frame-mark bottom-right"></div>

<header class="header">
  <div class="header-wordmark">
    <div class="dot"></div>
    <div class="text">
      <strong>FCYT UADER</strong>
      <span>Agenda inteligente personal</span>
    </div>
  </div>
  <div class="header-center">
    <button class="header-nav-btn back-btn" type="button" onclick="openChatPage()">
      <span class="back-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m15 18-6-6 6-6"></path>
        </svg>
      </span>
      Volver al chat
    </button>
  </div>
  <div class="header-meta">
    <div class="header-badge">
      <span class="status-dot"></span>
      Inteligencia Artificial
    </div>
    <div class="header-actions">
      <button class="icon-btn" type="button" title="Agendas" onclick="openAgendasPage()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <span class="theme-btn-label">Agendas</span>
      </button>
      <button class="icon-btn" type="button" title="Cambiar tema" onclick="toggleCalendarTheme()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"></path>
        </svg>
        <span class="theme-btn-label" id="calendarThemeLabel">Modo claro</span>
      </button>
    </div>
  </div>
</header>

<main class="page">
  <section class="calendar-shell">
    <div class="calendar-top">
      <div class="calendar-title">
        <small>panel central</small>
        <h1 id="calendarMonthTitle">Cargando...</h1>
        <p>Vista mensual conectada al asistente para planificar compromisos, foco personal y recordatorios.</p>
        <div class="calendar-status" id="monthStatus">Preparando tablero</div>
      </div>
      <div class="calendar-actions" aria-label="Navegacion del calendario">
        <button class="icon-btn" id="prevMonthBtn" type="button" aria-label="Mes anterior">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <button class="icon-btn" id="todayBtn" type="button" aria-label="Hoy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        </button>
        <button class="icon-btn" id="nextMonthBtn" type="button" aria-label="Mes siguiente">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>

    <div class="calendar-meta">
      <div class="mini-stat">
        <span>eventos</span>
        <strong id="statEventCount">— cargando</strong>
      </div>
      <div class="mini-stat">
        <span>dias con eventos</span>
        <strong id="statDaysWithEvents">—</strong>
      </div>
      <div class="mini-stat">
        <span>mes</span>
        <strong id="statMonthLabel">—</strong>
      </div>
      <div class="mini-stat">
        <span>ritmo</span>
        <strong id="statFocusLabel">—</strong>
      </div>
    </div>

    <div class="calendar-grid-wrap">
      <div class="calendar-grid" id="calendarGrid">
        <div class="weekday">lun</div>
        <div class="weekday">mar</div>
        <div class="weekday">mie</div>
        <div class="weekday">jue</div>
        <div class="weekday">vie</div>
        <div class="weekday">sab</div>
        <div class="weekday">dom</div>
      </div>
    </div>

    <div class="calendar-footer">
      <div class="footer-main">
        <div class="legend">
          <div class="legend-item"><span class="legend-dot strong"></span>dia con actividad</div>
          <div class="legend-item"><span class="legend-dot"></span>espacio libre</div>
          <div class="legend-item"><span class="legend-dot strong"></span>hoy destacado</div>
        </div>
        <div class="event-tray">
          <div class="event-tray-head">
            <span>dia activo</span>
            <strong id="activeDayLabel">—</strong>
          </div>
          <div class="event-pills" id="eventPills"></div>
          <div class="event-actions">
            <button class="event-btn primary" id="addEventBtn" type="button">agregar evento</button>
            <button class="event-btn" id="removeEventBtn" type="button">quitar evento</button>
          </div>
        </div>
      </div>
      <div class="note">Selecciona un dia para ver y editar sus eventos.</div>
    </div>
  </section>
</main>

<div class="day-modal" id="dayModal" aria-hidden="true">
  <div class="day-modal-backdrop" id="dayModalBackdrop"></div>
  <section class="day-modal-card" role="dialog" aria-modal="true" aria-labelledby="modalDayTitle">
    <div class="day-modal-header">
      <div>
        <span class="day-modal-kicker">detalle del dia</span>
        <h2 class="day-modal-title" id="modalDayTitle">—</h2>
        <p class="day-modal-subtitle" id="modalDaySubtitle">—</p>
      </div>
      <button class="icon-btn day-modal-close" id="closeModalBtn" type="button" aria-label="Cerrar detalle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="day-modal-body" id="modalEventList"></div>
    <div class="day-modal-actions">
      <div class="day-modal-note">Selecciona un evento o usa los botones para gestionarlo.</div>
      <div class="event-actions">
        <button class="event-btn primary" id="modalAddEventBtn" type="button">agregar evento</button>
        <button class="event-btn" id="modalRemoveEventBtn" type="button">quitar evento</button>
      </div>
    </div>
  </section>
</div>

<div class="create-event-modal" id="createEventModal" aria-hidden="true">
  <div class="create-event-backdrop" id="createEventBackdrop"></div>
  <section class="day-modal-card" role="dialog" aria-modal="true" aria-labelledby="createEventHeading">
    <div class="day-modal-header">
      <div>
        <span class="day-modal-kicker">nuevo evento</span>
        <h2 class="day-modal-title" id="createEventHeading" style="font-size:clamp(28px,4vw,48px);letter-spacing:-0.04em">Crear evento</h2>
        <p class="day-modal-subtitle" id="createEventSubtitle">—</p>
      </div>
      <button class="icon-btn" id="closeCreateEventBtn" type="button" aria-label="Cancelar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="day-modal-body">
      <div class="form-group">
        <label class="form-label" for="newEventTitle">Título</label>
        <input class="form-input" id="newEventTitle" type="text" placeholder="Ej: Reunión de equipo" maxlength="120" />
      </div>
      <div class="form-time-row">
        <div class="form-group">
          <label class="form-label" for="newEventStart">Hora inicio</label>
          <input class="form-input" id="newEventStart" type="time" value="09:00" />
        </div>
        <div class="form-group">
          <label class="form-label" for="newEventEnd">Hora fin</label>
          <input class="form-input" id="newEventEnd" type="time" value="10:00" />
        </div>
      </div>
      <p id="createEventError" style="color:oklch(65% 0.2 20);font-size:13px;margin:0;display:none"></p>
    </div>
    <div class="day-modal-actions">
      <div class="day-modal-note">El evento se guardará en tu agenda principal.</div>
      <div class="event-actions">
        <button class="event-btn" id="cancelCreateEventBtn" type="button">Cancelar</button>
        <button class="event-btn primary" id="submitCreateEventBtn" type="button">Guardar evento</button>
      </div>
    </div>
  </section>
</div>

<div class="calendar-toast-stack" id="calendarToastStack" aria-live="polite"></div>`,
} as const;
