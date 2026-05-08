export const chatTemplate = {
  styleText: `:root {
  --bg: oklch(99% 0.002 240);
  --surface: oklch(100% 0 0 / 0.88);
  --surface-strong: oklch(100% 0 0 / 0.95);
  --fg: oklch(18% 0.012 250);
  --muted: oklch(54% 0.012 250);
  --border: oklch(92% 0.005 250);
  --accent: oklch(58% 0.18 255);
  --accent-2: oklch(72% 0.08 220);
  --accent-soft: oklch(58% 0.18 255 / 0.12);
  --ambient-1: oklch(58% 0.18 255 / 0.1);
  --ambient-2: oklch(72% 0.08 220 / 0.14);
  --grid-line: oklch(92% 0.005 250);
  --texture-dot: oklch(18% 0.012 250 / 0.08);
  --texture-haze: oklch(58% 0.18 255 / 0.035);
  --signal-line: oklch(58% 0.18 255 / 0.2);
  --signal-line-soft: oklch(72% 0.08 220 / 0.2);
  --success: oklch(69% 0.17 152);
  --shadow-card: 0 1px 3px oklch(0% 0 0 / 0.04), 0 8px 24px oklch(0% 0 0 / 0.06);
  --shadow-float: 0 14px 36px oklch(210 0.05 0 / 0.12);
  --shadow-glow-strong: 0 0 0 1.5px oklch(58% 0.18 255 / 0.28), 0 10px 34px oklch(58% 0.18 255 / 0.2);
  --font-display: 'Trebuchet MS', 'Segoe UI', sans-serif;
  --font-body: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  --font-mono: 'Consolas', 'Courier New', monospace;
  --radius-sm: 4px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-xl: 28px;
  --header-bg: color-mix(in oklab, var(--bg) 82%, transparent);
  --input-fade: color-mix(in oklab, var(--bg) 94%, transparent);
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
  --ambient-1: oklch(74% 0.2 332 / 0.11);
  --ambient-2: oklch(66% 0.12 306 / 0.12);
  --grid-line: oklch(36% 0.04 300);
  --texture-dot: oklch(95% 0.01 320 / 0.045);
  --texture-haze: oklch(74% 0.2 332 / 0.03);
  --signal-line: oklch(74% 0.2 332 / 0.18);
  --signal-line-soft: oklch(66% 0.12 306 / 0.16);
  --success: oklch(77% 0.17 156);
  --shadow-card: 0 1px 2px oklch(0% 0 0 / 0.34), 0 14px 34px oklch(0% 0 0 / 0.32);
  --shadow-float: 0 18px 46px oklch(0% 0 0 / 0.42);
  --shadow-glow-strong: 0 0 0 1.5px oklch(74% 0.2 332 / 0.4), 0 14px 36px oklch(74% 0.2 332 / 0.22);
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-body);
  font-size: 15px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

body {
  min-height: 100dvh;
  overflow: hidden;
  background:
    radial-gradient(circle at top left, var(--ambient-1), transparent 26%),
    radial-gradient(circle at bottom right, var(--ambient-2), transparent 28%),
    var(--bg);
  color: var(--fg);
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    radial-gradient(circle at 1px 1px, var(--texture-dot) 0.9px, transparent 0),
    radial-gradient(circle at 50% 50%, var(--texture-haze), transparent 68%);
  background-size: 18px 18px, 100% 100%;
  background-position: 0 0, center;
  opacity: 0.42;
  pointer-events: none;
}

body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(var(--grid-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid-line) 1px, transparent 1px);
  background-size: 60px 60px;
  opacity: 0.14;
  pointer-events: none;
}

body.chat-page-react #root {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

::selection {
  background: var(--accent-soft);
  color: var(--fg);
}

::-webkit-scrollbar { width: 7px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: oklch(54% 0.012 250 / 0.28);
  border-radius: 999px;
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
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.header-nav-btn:hover {
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
  transition: all 0.2s ease;
}

.icon-btn:hover {
  color: var(--fg);
  border-color: var(--border);
  background: var(--surface);
}

.icon-btn svg {
  width: 16px;
  height: 16px;
}

.theme-btn-label {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.chat-shell {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}

.chat-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 30px 24px 20px;
  scroll-behavior: smooth;
  position: relative;
}

.msg-center-wrap {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
}

.msg-center-wrap::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  background: linear-gradient(180deg, transparent, color-mix(in oklab, var(--accent) 22%, transparent) 15%, color-mix(in oklab, var(--accent) 14%, transparent) 85%, transparent);
  transform: translateX(-50%);
  pointer-events: none;
  opacity: 0.6;
}

.msg-row,
.typing-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  animation: msg-enter 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

.msg-row.user { flex-direction: row-reverse; }

@keyframes msg-enter {
  from { opacity: 0; transform: translateY(14px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.msg-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
}

.msg-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.msg-row.bot .msg-avatar {
  background: color-mix(in oklab, var(--accent) 14%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 28%, transparent);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 10%, transparent);
}

.msg-row.user .msg-avatar {
  background: oklch(18% 0.012 250 / 0.08);
  border: 1px solid var(--border);
}

.msg-content {
  max-width: min(540px, 82%);
}

.msg-card,
.typing-indicator {
  position: relative;
  padding: 14px 18px;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(10px);
}

.msg-row.bot .msg-card,
.typing-indicator {
  background: var(--surface);
  border: 1px solid var(--border);
  border-bottom-left-radius: var(--radius-sm);
}

.msg-row.user .msg-card {
  background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent-2) 75%, white));
  color: white;
  border-bottom-right-radius: var(--radius-sm);
}

.msg-row.bot .msg-card::before,
.typing-indicator::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  border-radius: 3px 0 0 3px;
  background: linear-gradient(180deg, var(--accent), var(--accent-2));
}

.msg-notch {
  position: absolute;
  width: 14px;
  height: 14px;
  bottom: 14px;
  transform: rotate(45deg);
  border-radius: 3px;
}

.msg-row.bot .msg-notch {
  left: -7px;
  background: var(--surface);
  border-left: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
}

.msg-row.user .msg-notch {
  right: -7px;
  background: color-mix(in oklab, var(--accent) 80%, var(--accent-2));
}

.msg-card code {
  padding: 1px 6px;
  border-radius: 6px;
  font-family: var(--font-mono);
  font-size: 12px;
}

.msg-row.bot .msg-card code {
  background: color-mix(in oklab, var(--accent) 16%, transparent);
  color: var(--accent);
}

.msg-row.user .msg-card code {
  background: oklch(100% 0 0 / 0.14);
}

.msg-footer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding: 0 4px;
}

.msg-row.user .msg-footer { justify-content: flex-end; }

.msg-time,
.msg-status,
.shortcut-hint,
.char-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--muted);
  letter-spacing: 0.04em;
}

.msg-status.sent { color: color-mix(in oklab, var(--accent) 78%, white); }
.msg-status svg { width: 12px; height: 12px; }

.chat-ended-banner {
  text-align: center;
  font-size: 11px;
  font-family: var(--font-mono);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 10px 0 4px;
  border-top: 1px solid color-mix(in oklab, var(--muted) 25%, transparent);
  margin-top: 8px;
}

.typing-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--muted);
  animation: typing-bounce 1.4s ease-in-out infinite;
}

.typing-dot:nth-child(2) { animation-delay: 0.2s; }
.typing-dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.55; }
  30% { transform: translateY(-6px); opacity: 1; }
}

.welcome {
  min-height: calc(100% - 12px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 18px;
  padding: 30px 24px;
  position: relative;
}

.welcome::before {
  content: '';
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in oklab, var(--accent) 10%, transparent) 0%, transparent 70%);
  pointer-events: none;
  animation: welcome-pulse 4s ease-in-out infinite;
}

.welcome::after {
  content: '';
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  border: 1px dashed color-mix(in oklab, var(--accent) 18%, transparent);
  opacity: 0.6;
  pointer-events: none;
}

@keyframes welcome-pulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 0.3; }
}

.welcome-icon {
  width: 94px;
  height: 94px;
  border-radius: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in oklab, var(--accent) 10%, transparent);
  border: 1px solid color-mix(in oklab, var(--accent) 24%, transparent);
  box-shadow: var(--shadow-float);
  z-index: 1;
}

.welcome-icon img {
  width: 72px;
  height: 72px;
  object-fit: contain;
}

.welcome h2 {
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 36px);
  letter-spacing: -0.04em;
  z-index: 1;
}

.welcome p {
  max-width: 520px;
  color: var(--muted);
  font-size: 15px;
  z-index: 1;
}

.suggestion-chips {
  display: grid;
  grid-template-columns: repeat(3, max-content);
  justify-content: center;
  gap: 10px;
  z-index: 1;
}

.chip {
  min-height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-strong);
  color: var(--fg);
  cursor: pointer;
  box-shadow: var(--shadow-card);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.chip:hover {
  transform: translateY(-1px);
  border-color: color-mix(in oklab, var(--accent) 38%, transparent);
}

.input-area {
  flex-shrink: 0;
  padding: 12px 24px 18px;
  background: linear-gradient(to top, var(--input-fade) 70%, transparent 100%);
  backdrop-filter: blur(18px);
}

.input-wrapper {
  max-width: 760px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.input-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px 12px 18px;
  border-radius: var(--radius-xl);
  border: 1.5px solid var(--border);
  background: var(--surface-strong);
  box-shadow: var(--shadow-card);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-card:focus-within {
  border-color: color-mix(in oklab, var(--accent) 48%, transparent);
  box-shadow: var(--shadow-glow-strong);
}

.msg-input {
  flex: 1;
  min-height: 42px;
  max-height: 140px;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--fg);
  font: inherit;
  line-height: 1.35;
  padding: 10px 0;
  overflow-y: auto;
  display: block;
}

.msg-input::placeholder { color: var(--muted); }

.send-btn {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent-2) 74%, white));
  color: white;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  transition: transform 0.24s ease, box-shadow 0.24s ease, opacity 0.2s ease, background 0.24s ease;
}

.send-btn:hover {
  transform: scale(1.04);
  box-shadow: 0 12px 24px oklch(58% 0.18 255 / 0.24);
}

.send-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.send-btn.is-listening {
  animation: mic-pulse 1.6s ease-in-out infinite;
}

.send-btn-icon {
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.24s ease, transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.send-btn svg { width: 18px; height: 18px; }

.send-btn-icon.send {
  opacity: 0;
  transform: translateY(10px) scale(0.84);
}

.send-btn-icon.mic {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.send-btn.is-ready-to-send .send-btn-icon.send {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.send-btn.is-ready-to-send .send-btn-icon.mic {
  opacity: 0;
  transform: translateY(-10px) scale(0.84);
}

.voice-hint {
  color: var(--muted);
  transition: color 0.2s ease, opacity 0.2s ease;
}

.voice-hint.is-active {
  color: var(--accent);
}

.voice-hint.is-disabled {
  opacity: 0.75;
}

@keyframes mic-pulse {
  0%, 100% { box-shadow: 0 0 0 0 oklch(58% 0.18 255 / 0.22); }
  50% { box-shadow: 0 0 0 8px oklch(58% 0.18 255 / 0); }
}

.input-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 16px;
  padding: 0 6px;
}

.char-count { opacity: 0; transition: opacity 0.2s ease; }
.char-count.visible { opacity: 1; }
.char-count.warning { color: oklch(74% 0.17 34); }

.shortcut-hint kbd {
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1px 5px;
  background: var(--surface);
}

.code-block {
  margin-top: 12px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--border);
}

.code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.code-block pre {
  padding: 14px;
  overflow-x: auto;
  background: var(--surface);
  color: var(--fg);
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.7;
}

.copy-btn {
  border: none;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}

.copy-btn.copied { color: var(--success); }

.msg-card p { margin: 0; }
.msg-card p + p { margin-top: 8px; }
.msg-card ul { margin: 6px 0; padding-left: 20px; }
.msg-card blockquote {
  margin: 10px 0;
  padding-left: 12px;
  border-left: 3px solid oklch(58% 0.18 255 / 0.5);
  color: var(--muted);
}

.ambient-dots,
.corner-decor,
.shape-orbit,
.shape-ribbon,
.mesh-line,
.signal-cluster {
  position: fixed;
  pointer-events: none;
}

.ambient-dots { inset: 0; overflow: hidden; }

.ambient-dot {
  position: absolute;
  border-radius: 50%;
  background: color-mix(in oklab, var(--accent) 28%, transparent);
  animation: float-dots linear infinite;
}

@keyframes float-dots {
  0% { transform: translateY(100vh); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-120px); opacity: 0; }
}

.corner-decor,
.shape-orbit,
.shape-ribbon,
.mesh-line {
  opacity: 0.7;
}

.corner-decor { width: 120px; height: 120px; }
.corner-decor.top-left { top: 0; left: 0; background: radial-gradient(circle at 0 0, var(--accent-soft), transparent 60%); }
.corner-decor.top-right { top: 0; right: 0; background: radial-gradient(circle at 100% 0, var(--ambient-2), transparent 60%); }
.corner-decor.bottom-left { bottom: 0; left: 0; background: radial-gradient(circle at 0 100%, color-mix(in oklab, var(--accent) 12%, transparent), transparent 60%); }
.corner-decor.bottom-right { bottom: 0; right: 0; background: radial-gradient(circle at 100% 100%, color-mix(in oklab, var(--accent-2) 16%, transparent), transparent 60%); }

.shape-orbit {
  border-radius: 50%;
  border: 1px solid color-mix(in oklab, var(--accent) 26%, transparent);
}

.shape-orbit.left { width: 220px; height: 220px; left: -80px; top: 24%; }
.shape-orbit.right { width: 280px; height: 280px; right: -120px; bottom: 16%; }
.shape-ribbon.top { width: 240px; height: 240px; top: 110px; right: -130px; border: 1px solid color-mix(in oklab, var(--accent-2) 24%, transparent); border-radius: 28px; transform: rotate(45deg); }
.shape-ribbon.bottom { width: 240px; height: 240px; bottom: 90px; left: -150px; border: 1px solid color-mix(in oklab, var(--accent) 20%, transparent); border-radius: 42px; transform: rotate(45deg); }
.mesh-line.one { top: 148px; left: 12%; width: 220px; height: 1px; transform: rotate(-14deg); background: linear-gradient(90deg, transparent, var(--accent-soft), transparent); }
.mesh-line.two { top: 62%; right: 8%; width: 280px; height: 1px; transform: rotate(18deg); background: linear-gradient(90deg, transparent, var(--ambient-2), transparent); }
.mesh-line.three { bottom: 146px; left: 24%; width: 180px; height: 1px; transform: rotate(-22deg); background: linear-gradient(90deg, transparent, var(--accent-soft), transparent); }

.signal-cluster {
  width: 220px;
  height: 220px;
  top: 112px;
  right: 64px;
  opacity: 0.72;
}

.signal-cluster.left {
  top: 128px;
  left: 58px;
  right: auto;
}

.signal-ring,
.signal-sweep,
.signal-node,
.signal-core,
.signal-bar {
  position: absolute;
}

.signal-ring { inset: 0; border-radius: 50%; border: 1px solid var(--signal-line); }
.signal-ring.ring-1 { inset: 28px; animation: signalPulse 5.5s ease-in-out infinite; }
.signal-ring.ring-2 { inset: 54px; border-style: dashed; animation: signalRotate 16s linear infinite; }
.signal-ring.ring-3 { inset: 82px; animation: signalPulse 4.2s ease-in-out infinite reverse; }
.signal-sweep { inset: 22px; border-radius: 50%; background: conic-gradient(from 0deg, transparent 0deg 290deg, var(--signal-line) 326deg, transparent 360deg); mask: radial-gradient(circle, transparent 58%, black 59%); -webkit-mask: radial-gradient(circle, transparent 58%, black 59%); animation: signalRotate 8s linear infinite; }
.signal-node { top: 26px; right: 52px; width: 12px; height: 12px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent-2) 72%, white)); animation: signalOrbit 8s linear infinite, signalBlink 3.6s ease-in-out infinite; transform-origin: 58px 84px; }
.signal-core { top: 50%; left: 50%; width: 16px; height: 16px; transform: translate(-50%, -50%); border-radius: 50%; background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent-2) 72%, white)); animation: signalBlink 3.2s ease-in-out infinite; }
.signal-bar { top: 50%; right: -8px; width: 84px; height: 1px; background: linear-gradient(90deg, var(--signal-line), transparent); }
.signal-cluster.left .signal-bar { right: auto; left: -8px; background: linear-gradient(90deg, transparent, var(--signal-line-soft)); }

@keyframes signalRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes signalPulse {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.035); }
}

@keyframes signalBlink {
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; }
}

@keyframes signalOrbit {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.msg-count-badge,
.scroll-bottom-btn {
  position: fixed;
  z-index: 14;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-strong);
  box-shadow: var(--shadow-card);
  font-family: var(--font-mono);
}

.msg-count-badge {
  right: 24px;
  bottom: 112px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  color: var(--muted);
  font-size: 11px;
  opacity: 0;
  transform: translateY(8px);
  transition: all 0.25s ease;
}

.msg-count-badge.visible {
  opacity: 1;
  transform: translateY(0);
}

.msg-count-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
}

.scroll-bottom-btn {
  left: 50%;
  bottom: 112px;
  transform: translateX(-50%) translateY(14px);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  color: var(--muted);
  font-size: 11px;
  opacity: 0;
  pointer-events: none;
  transition: all 0.25s ease;
  cursor: pointer;
}

.scroll-bottom-btn.visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateX(-50%) translateY(0);
}

.scroll-bottom-btn svg { width: 12px; height: 12px; }

.chat-modal {
  position: fixed;
  inset: 0;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  visibility: hidden;
  pointer-events: none;
}

.chat-modal.is-open {
  visibility: visible;
  pointer-events: auto;
}

.chat-modal-backdrop {
  position: absolute;
  inset: 0;
  background: oklch(14% 0.03 295 / 0.42);
  backdrop-filter: blur(14px) saturate(118%);
  -webkit-backdrop-filter: blur(14px) saturate(118%);
  opacity: 0;
  transition: opacity 0.16s ease-out;
}

.chat-modal-card {
  position: relative;
  width: min(460px, calc(100% - 24px));
  padding: 24px 24px 22px;
  border-radius: 28px;
  border: 1px solid var(--border);
  background: var(--surface-strong);
  box-shadow: 0 24px 80px oklch(0% 0 0 / 0.28);
  transform: translateY(16px) scale(0.985);
  opacity: 0;
  transition: transform 0.2s ease-out, opacity 0.18s ease-out;
}

.chat-modal.is-open .chat-modal-backdrop,
.chat-modal.is-open .chat-modal-card {
  opacity: 1;
}

.chat-modal.is-open .chat-modal-card {
  transform: translateY(0) scale(1);
}

.chat-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.chat-modal-kicker,
.chat-modal-note {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.chat-modal-title {
  margin-top: 8px;
  font-family: var(--font-display);
  font-size: clamp(28px, 4vw, 34px);
  letter-spacing: -0.04em;
  line-height: 1.02;
}

.chat-modal-copy {
  margin: 0 0 18px;
  color: var(--muted);
}

.chat-modal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.chat-modal-note {
  flex: 1;
  min-width: 180px;
}

.chat-modal-btns {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.chat-modal-btn {
  min-height: 40px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--fg);
  cursor: pointer;
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.chat-modal-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-card);
}

.chat-modal-btn.primary {
  border-color: color-mix(in oklab, var(--accent) 26%, transparent);
  background: linear-gradient(135deg, var(--accent), color-mix(in oklab, var(--accent-2) 74%, white));
  color: white;
}

@keyframes pulse-dot {
  0%, 100% { box-shadow: 0 0 0 0 oklch(58% 0.18 255 / 0.36); }
  50% { box-shadow: 0 0 0 7px oklch(58% 0.18 255 / 0); }
}

@media (max-width: 860px) {
  .header {
    grid-template-columns: 1fr;
    justify-items: center;
    text-align: center;
  }

  .header-wordmark,
  .header-meta {
    justify-content: center;
  }

  .chat-area {
    padding: 24px 16px 16px;
  }

  .input-area {
    padding: 12px 16px 16px;
  }
}

@media (max-width: 640px) {
  .header-badge {
    display: none;
  }

  .header-actions {
    flex-wrap: wrap;
    justify-content: center;
  }

  .theme-btn-label {
    display: none;
  }

  .icon-btn.export-btn {
    display: none;
  }

  .welcome {
    min-height: auto;
    padding-top: 48px;
  }

  .suggestion-chips {
    grid-template-columns: repeat(2, minmax(0, max-content));
  }

  .msg-content {
    max-width: 88%;
  }

  .chat-modal {
    padding: 14px;
  }

  .chat-modal-card {
    width: min(100%, 100%);
    padding: 20px 18px 18px;
    border-radius: 22px;
  }

  .chat-modal-actions,
  .chat-modal-btns {
    width: 100%;
  }

  .suggestion-chips {
    grid-template-columns: 1fr;
    width: min(100%, 320px);
  }

  .chip {
    width: 100%;
  }

  .chat-modal-btn {
    flex: 1;
    justify-content: center;
  }
}`,
  bodyHtml: `<div class="corner-decor top-left"></div>
<div class="corner-decor top-right"></div>
<div class="corner-decor bottom-left"></div>
<div class="corner-decor bottom-right"></div>
<div class="shape-orbit left"></div>
<div class="shape-orbit right"></div>
<div class="shape-ribbon top"></div>
<div class="shape-ribbon bottom"></div>
<div class="mesh-line one"></div>
<div class="mesh-line two"></div>
<div class="mesh-line three"></div>
<div class="signal-cluster left">
  <div class="signal-ring ring-1"></div>
  <div class="signal-ring ring-2"></div>
  <div class="signal-ring ring-3"></div>
  <div class="signal-sweep"></div>
  <div class="signal-core"></div>
  <div class="signal-node"></div>
  <div class="signal-bar"></div>
</div>
<div class="signal-cluster">
  <div class="signal-ring ring-1"></div>
  <div class="signal-ring ring-2"></div>
  <div class="signal-ring ring-3"></div>
  <div class="signal-sweep"></div>
  <div class="signal-core"></div>
  <div class="signal-node"></div>
  <div class="signal-bar"></div>
</div>
<div class="ambient-dots" id="ambientDots"></div>

<header class="header">
  <div class="header-wordmark">
    <div class="dot"></div>
    <div class="text">
      <strong>FCYT UADER</strong>
      <span>Agenda inteligente personal</span>
    </div>
  </div>
  <div class="header-center">
    <button class="header-nav-btn" type="button" onclick="openCalendarPage()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"></rect>
        <path d="M16 2v4M8 2v4M3 10h18"></path>
      </svg>
      Calendario
    </button>
  </div>
  <div class="header-meta">
    <div class="header-badge">
      <div class="status-dot"></div>
      Inteligencia Artificial
    </div>
    <div class="header-actions">
      <button class="icon-btn" type="button" title="Cambiar tema" onclick="toggleChatTheme()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"></path>
        </svg>
        <span class="theme-btn-label" id="themeLabel">Modo claro</span>
      </button>
      <button class="icon-btn" type="button" title="Nuevo chat" onclick="clearChat()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14"></path>
          <path d="M5 12h14"></path>
        </svg>
      </button>
      <button class="icon-btn export-btn" type="button" title="Exportar chat" onclick="exportChat()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </button>
    </div>
  </div>
</header>

<section class="chat-shell">
  <main class="chat-area" id="chatArea">
    <div class="msg-center-wrap">
      <div class="welcome" id="welcome">
        <div class="welcome-icon">
          <img src="__BOT_MASCOT_URL__" alt="Mascota del asistente">
        </div>
        <h2>Tu agenda inteligente ya esta lista</h2>
        <p>Organiza reuniones, recordatorios y bloques de foco desde el chat. El calendario vive integrado, las agendas ahora tienen mejor contexto visual y puedes moverte entre vistas sin perder la atmosfera de la app.</p>
        <div class="suggestion-chips">
          <button class="chip" onclick="sendSuggestion('Organiza mi mañana con bloques de foco y una reunión de 30 minutos')">Planificar mañana</button>
          <button class="chip" onclick="sendSuggestion('Agrega un recordatorio para llamar a secretaria a las 17:00')">Crear recordatorio</button>
          <button class="chip" onclick="sendSuggestion('Qué tengo disponible para estudiar después del mediodía')">Buscar huecos</button>
          <button class="chip" onclick="sendSuggestion('Armame una agenda liviana para hoy')">Agenda de hoy</button>
          <button class="chip" onclick="sendSuggestion('Mostrame una versión equilibrada de mi semana con estudio, descanso y pendientes')">Equilibrar semana</button>
          <button class="chip" onclick="sendSuggestion('Revisá si tengo demasiadas cosas el viernes y sugerí mover algo')">Revisar carga</button>
        </div>
      </div>
    </div>
  </main>

  <button class="scroll-bottom-btn" id="scrollBottomBtn" onclick="scrollToBottom()">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
    Bajar al ultimo mensaje
  </button>

  <div class="msg-count-badge" id="msgCountBadge">
    <div class="dot"></div>
    <span id="msgCountText">0 mensajes</span>
  </div>

  <div class="input-area">
    <div class="input-wrapper">
      <div class="input-card">
        <textarea class="msg-input" id="msgInput" placeholder="Escribe un pedido para tu agenda personal..." rows="1" maxlength="4000"></textarea>
        <button class="send-btn" id="sendBtn" type="button" title="Dictar mensaje">
          <span class="send-btn-icon mic" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3a3 3 0 0 1 3 3v6a3 3 0 1 1-6 0V6a3 3 0 0 1 3-3Z"></path>
              <path d="M19 10a7 7 0 0 1-14 0"></path>
              <path d="M12 17v4"></path>
              <path d="M8 21h8"></path>
            </svg>
          </span>
          <span class="send-btn-icon send" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="19" x2="12" y2="5"></line>
              <polyline points="5 12 12 5 19 12"></polyline>
            </svg>
          </span>
        </button>
      </div>
      <div class="input-meta">
        <span class="shortcut-hint voice-hint" id="voiceHint"><kbd>Microfono</kbd> para dictar · <kbd>Enter</kbd> enviar</span>
        <span class="char-count" id="charCount">0 / 4000</span>
      </div>
    </div>
  </div>
</section>

<div class="chat-modal" id="clearChatModal" aria-hidden="true">
  <div class="chat-modal-backdrop" id="clearChatBackdrop"></div>
  <section class="chat-modal-card" role="dialog" aria-modal="true" aria-labelledby="clearChatTitle">
    <div class="chat-modal-header">
      <div>
        <span class="chat-modal-kicker">nuevo chat</span>
        <h2 class="chat-modal-title" id="clearChatTitle">¿Limpiar esta conversación?</h2>
      </div>
      <button class="icon-btn" id="closeClearChatBtn" type="button" aria-label="Cerrar modal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <p class="chat-modal-copy">Se van a borrar los mensajes visibles del chat actual para que arranques de cero. No afecta tu calendario ni tus agendas.</p>
    <div class="chat-modal-actions">
      <div class="chat-modal-note">Esta acción solo limpia la vista actual.</div>
      <div class="chat-modal-btns">
        <button class="chat-modal-btn" id="cancelClearChatBtn" type="button">Cancelar</button>
        <button class="chat-modal-btn primary" id="confirmClearChatBtn" type="button">Nuevo chat</button>
      </div>
    </div>
  </section>
</div>`,
} as const;
