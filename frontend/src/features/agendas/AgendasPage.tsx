import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AgendaRead } from "../../shared/services/api";

type Toast = {
  id: number;
  tone: "success" | "error";
  text: string;
};

const themeStorageKey = "agenda-theme";

export function AgendasPage() {
  const navigate = useNavigate();
  const [agendas, setAgendas] = useState<AgendaRead[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return window.localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light";
  });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((text: string, tone: Toast["tone"]) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, tone, text }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await api.getAgendas();
      setAgendas(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudieron cargar las agendas.";
      pushToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [load]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem(themeStorageKey, nextTheme);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      const created = await api.createAgenda({
        name: name.trim(),
        description: description.trim() || undefined,
      });

      setAgendas((current) => [created, ...current]);
      setName("");
      setDescription("");
      pushToast(`Agenda "${created.name}" creada.`, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo crear la agenda.";
      pushToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (agenda: AgendaRead) => {
    if (!window.confirm(`¿Eliminar "${agenda.name}" y todos sus eventos?`)) return;

    try {
      await api.deleteAgenda(agenda.id);
      setAgendas((current) => current.filter((item) => item.id !== agenda.id));
      pushToast(`Agenda "${agenda.name}" eliminada.`, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar la agenda.";
      pushToast(message, "error");
    }
  };

  return (
    <>
      <style>{pageStyles}</style>
      <div className="agendas-shell">
        <div className="agendas-decor decor-top-left" />
        <div className="agendas-decor decor-top-right" />
        <div className="agendas-decor decor-bottom-left" />
        <div className="agendas-decor decor-bottom-right" />
        <div className="agendas-orbit orbit-one" />
        <div className="agendas-orbit orbit-two" />

        <header className="agendas-header">
          <div className="agendas-wordmark">
            <div className="wordmark-dot" />
            <div>
              <strong>FCYT UADER</strong>
              <span>Agenda inteligente personal</span>
            </div>
          </div>

          <div className="agendas-header-actions">
            <button className="agendas-btn agendas-btn-secondary" onClick={() => navigate("/calendar")} type="button">
              Volver al calendario
            </button>
            <button className="agendas-icon-btn" onClick={toggleTheme} type="button" title="Cambiar tema">
              <span>{theme === "dark" ? "Modo oscuro" : "Modo claro"}</span>
            </button>
          </div>
        </header>

        <main className="agendas-page">
          <section className="agendas-hero">
            <div className="agendas-hero-copy">
              <p className="eyebrow">panel de agendas</p>
              <h1>Ordena tus espacios y dales personalidad.</h1>
              <p className="hero-text">
                Crea agendas separadas para cursada, trabajo o vida personal y mantené todo alineado con el bot y el calendario.
              </p>
            </div>
            <div className="hero-stats">
              <div className="hero-stat-card">
                <span>Total activas</span>
                <strong>{loading ? "..." : agendas.length}</strong>
              </div>
              <div className="hero-stat-card">
                <span>Con descripcion</span>
                <strong>{loading ? "..." : agendas.filter((agenda) => Boolean(agenda.description?.trim())).length}</strong>
              </div>
            </div>
          </section>

          <section className="agendas-grid">
            <article className="glass-card form-card">
              <div className="section-head">
                <div>
                  <span className="section-kicker">nueva agenda</span>
                  <h2>Arma una base clara para tus eventos.</h2>
                </div>
                <div className="section-pill">sincronizada con calendario</div>
              </div>

              <form className="agenda-form" onSubmit={(event) => { void handleCreate(event); }}>
                <label className="field-label" htmlFor="agenda-name">Nombre</label>
                <input
                  id="agenda-name"
                  className="field-input"
                  type="text"
                  placeholder="Ej: Cursada 2026"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />

                <label className="field-label" htmlFor="agenda-description">Descripcion</label>
                <textarea
                  id="agenda-description"
                  className="field-input field-textarea"
                  placeholder="Una pista breve para reconocerla rapido."
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                />

                <div className="form-footer">
                  <p className="field-hint">Tip: una agenda por contexto hace mucho más claro el chat.</p>
                  <button className="agendas-btn agendas-btn-primary" disabled={submitting} type="submit">
                    {submitting ? "Creando..." : "Crear agenda"}
                  </button>
                </div>
              </form>
            </article>

            <article className="glass-card list-card">
              <div className="section-head">
                <div>
                  <span className="section-kicker">mis agendas</span>
                  <h2>Todo listo para moverte entre contextos.</h2>
                </div>
                <button className="section-pill button-pill" onClick={() => { void load(false); }} type="button">
                  Actualizar
                </button>
              </div>

              {loading ? (
                <div className="agenda-loading-list" aria-label="Cargando agendas">
                  <div className="agenda-skeleton" />
                  <div className="agenda-skeleton" />
                  <div className="agenda-skeleton short" />
                </div>
              ) : agendas.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-orb" />
                  <h3>Todavia no hay agendas.</h3>
                  <p>Crea la primera para separar materias, reuniones o rutinas personales y que el asistente entienda mejor tu contexto.</p>
                </div>
              ) : (
                <div className="agenda-list">
                  {agendas.map((agenda, index) => (
                    <article className="agenda-item" key={agenda.id}>
                      <div className="agenda-item-accent" style={{ opacity: `${0.9 - (index % 5) * 0.12}` }} />
                      <div className="agenda-item-copy">
                        <div className="agenda-item-topline">
                          <span className="agenda-index">{String(index + 1).padStart(2, "0")}</span>
                          <span className="agenda-badge">{agenda.description ? "con detalle" : "lista rapida"}</span>
                        </div>
                        <h3>{agenda.name}</h3>
                        <p>{agenda.description?.trim() || "Sin descripcion. Ideal para una agenda simple y enfocada."}</p>
                      </div>
                      <button
                        className="agendas-btn agendas-btn-secondary danger-btn"
                        onClick={() => { void handleDelete(agenda); }}
                        type="button"
                      >
                        Eliminar
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </article>
          </section>
        </main>

        <div className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div className={`toast toast-${toast.tone}`} key={toast.id}>
              <span className="toast-dot" />
              <span>{toast.text}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const pageStyles = `
:root {
  --bg: oklch(99% 0.002 240);
  --surface: oklch(100% 0 0 / 0.88);
  --surface-strong: oklch(100% 0 0 / 0.95);
  --fg: oklch(18% 0.012 250);
  --muted: oklch(54% 0.012 250);
  --border: oklch(92% 0.005 250);
  --accent: oklch(58% 0.18 255);
  --accent-2: oklch(72% 0.08 220);
  --accent-soft: oklch(58% 0.18 255 / 0.12);
  --danger: oklch(63% 0.19 25);
  --success: oklch(68% 0.18 155);
  --shadow-card: 0 1px 3px oklch(0% 0 0 / 0.04), 0 8px 24px oklch(0% 0 0 / 0.06);
  --shadow-float: 0 14px 36px oklch(210 0.05 0 / 0.12);
  --font-display: 'Trebuchet MS', 'Segoe UI', sans-serif;
  --font-body: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  --font-mono: 'Consolas', 'Courier New', monospace;
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
  --danger: oklch(70% 0.18 20);
  --success: oklch(77% 0.17 156);
  --shadow-card: 0 1px 2px oklch(0% 0 0 / 0.34), 0 14px 34px oklch(0% 0 0 / 0.32);
  --shadow-float: 0 18px 46px oklch(0% 0 0 / 0.42);
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html, body, #root {
  min-height: 100%;
}

body {
  margin: 0;
  background:
    radial-gradient(circle at top left, var(--accent-soft), transparent 24%),
    radial-gradient(circle at bottom right, oklch(72% 0.08 220 / 0.14), transparent 26%),
    var(--bg);
  color: var(--fg);
  font-family: var(--font-body);
}

body::before {
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

.agendas-shell {
  position: relative;
  min-height: 100dvh;
  padding: 20px;
  overflow: hidden;
}

.agendas-decor,
.agendas-orbit {
  position: fixed;
  pointer-events: none;
}

.agendas-decor {
  width: 160px;
  height: 160px;
  filter: blur(4px);
}

.decor-top-left {
  top: 0;
  left: 0;
  background: radial-gradient(circle at 0 0, var(--accent-soft), transparent 65%);
}

.decor-top-right {
  top: 0;
  right: 0;
  background: radial-gradient(circle at 100% 0, oklch(72% 0.08 220 / 0.18), transparent 65%);
}

.decor-bottom-left {
  bottom: 0;
  left: 0;
  background: radial-gradient(circle at 0 100%, oklch(58% 0.18 255 / 0.08), transparent 65%);
}

.decor-bottom-right {
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 100% 100%, oklch(72% 0.08 220 / 0.12), transparent 65%);
}

.agendas-orbit {
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--accent) 30%, transparent);
}

.orbit-one {
  width: 280px;
  height: 280px;
  right: -100px;
  top: 140px;
}

.orbit-two {
  width: 220px;
  height: 220px;
  left: -90px;
  bottom: 120px;
}

.agendas-header,
.glass-card,
.toast {
  backdrop-filter: blur(22px) saturate(180%);
}

.agendas-header {
  position: relative;
  z-index: 2;
  width: min(1180px, calc(100% - 16px));
  margin: 0 auto 20px;
  padding: 16px 22px;
  border: 1px solid var(--border);
  border-radius: 28px;
  background: color-mix(in oklab, var(--bg) 78%, transparent);
  box-shadow: var(--shadow-card);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
}

.agendas-wordmark {
  display: flex;
  align-items: center;
  gap: 12px;
}

.wordmark-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  box-shadow: 0 0 0 0 color-mix(in oklab, var(--accent) 50%, transparent);
  animation: agendas-pulse 2.4s ease-in-out infinite;
}

.agendas-wordmark strong,
.agendas-wordmark span,
.section-kicker,
.section-pill,
.eyebrow,
.hero-stat-card span,
.agenda-index,
.agenda-badge,
.field-hint,
.toast {
  font-family: var(--font-mono);
}

.agendas-wordmark strong {
  display: block;
  font-size: 13px;
  letter-spacing: 0.02em;
}

.agendas-wordmark span {
  display: block;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.agendas-header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.agendas-page {
  position: relative;
  z-index: 2;
  width: min(1180px, calc(100% - 16px));
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.agendas-hero,
.glass-card {
  border: 1px solid var(--border);
  box-shadow: var(--shadow-card);
}

.agendas-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(280px, 0.7fr);
  gap: 18px;
  padding: 26px;
  border-radius: 34px;
  background: linear-gradient(135deg, color-mix(in oklab, var(--surface) 80%, transparent), var(--surface-strong));
}

.eyebrow,
.section-kicker {
  font-size: 11px;
  letter-spacing: 0.14em;
  color: var(--muted);
  text-transform: uppercase;
}

.agendas-hero h1,
.section-head h2 {
  margin: 10px 0 0;
  font-family: var(--font-display);
  line-height: 0.98;
  letter-spacing: -0.04em;
}

.agendas-hero h1 {
  font-size: clamp(38px, 6vw, 72px);
  max-width: 12ch;
}

.hero-text {
  max-width: 52ch;
  margin: 14px 0 0;
  color: var(--muted);
}

.hero-stats {
  display: grid;
  gap: 14px;
}

.hero-stat-card {
  padding: 18px;
  border-radius: 24px;
  background: linear-gradient(180deg, color-mix(in oklab, var(--surface) 88%, transparent), color-mix(in oklab, var(--surface-strong) 92%, transparent));
  border: 1px solid color-mix(in oklab, var(--accent) 10%, var(--border));
}

.hero-stat-card span {
  display: block;
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-stat-card strong {
  display: block;
  margin-top: 8px;
  font-size: clamp(28px, 3vw, 42px);
  letter-spacing: -0.04em;
}

.agendas-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(0, 1.1fr);
  gap: 18px;
}

.glass-card {
  border-radius: 34px;
  background: color-mix(in oklab, var(--surface) 88%, transparent);
  padding: 24px;
}

.section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
}

.section-head h2 {
  font-size: clamp(28px, 4vw, 48px);
  max-width: 11ch;
}

.section-pill {
  padding: 9px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--accent) 20%, transparent);
  background: color-mix(in oklab, var(--surface-strong) 88%, transparent);
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.button-pill {
  cursor: pointer;
}

.agenda-form {
  display: grid;
  gap: 12px;
}

.field-label {
  font-size: 13px;
  font-weight: 600;
}

.field-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: color-mix(in oklab, var(--surface-strong) 92%, transparent);
  color: var(--fg);
  font: inherit;
  padding: 14px 16px;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.field-input:focus {
  border-color: color-mix(in oklab, var(--accent) 42%, transparent);
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--accent) 14%, transparent);
  transform: translateY(-1px);
}

.field-textarea {
  resize: vertical;
  min-height: 108px;
}

.form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-top: 8px;
}

.field-hint {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.agendas-btn,
.agendas-icon-btn {
  border: 1px solid transparent;
  cursor: pointer;
  color: var(--fg);
  font: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease, background 0.2s ease;
}

.agendas-btn:hover,
.agendas-icon-btn:hover,
.button-pill:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-float);
}

.agendas-btn {
  min-height: 46px;
  padding: 0 18px;
  border-radius: 999px;
}

.agendas-btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  color: white;
}

.agendas-btn-primary:disabled {
  opacity: 0.72;
  cursor: wait;
}

.agendas-btn-secondary,
.agendas-icon-btn,
.danger-btn {
  border-color: color-mix(in oklab, var(--accent) 16%, var(--border));
  background: color-mix(in oklab, var(--surface-strong) 90%, transparent);
}

.agendas-icon-btn {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 16px;
  color: var(--muted);
}

.danger-btn {
  border-color: color-mix(in oklab, var(--danger) 28%, var(--border));
  color: var(--danger);
}

.agenda-loading-list,
.agenda-list {
  display: grid;
  gap: 12px;
}

.agenda-skeleton {
  height: 110px;
  border-radius: 24px;
  background:
    linear-gradient(90deg, transparent, color-mix(in oklab, var(--surface-strong) 60%, white), transparent),
    color-mix(in oklab, var(--surface) 88%, transparent);
  background-size: 220px 100%, auto;
  animation: agenda-shimmer 1.4s linear infinite;
}

.agenda-skeleton.short {
  height: 88px;
}

.empty-state {
  display: grid;
  place-items: center;
  gap: 10px;
  min-height: 360px;
  text-align: center;
  padding: 20px;
}

.empty-orb {
  width: 84px;
  height: 84px;
  border-radius: 999px;
  background:
    radial-gradient(circle at 30% 30%, color-mix(in oklab, white 60%, transparent), transparent 40%),
    linear-gradient(135deg, color-mix(in oklab, var(--accent) 70%, white), color-mix(in oklab, var(--accent-2) 78%, white));
  box-shadow: 0 18px 40px color-mix(in oklab, var(--accent) 22%, transparent);
}

.empty-state h3 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 30px;
  letter-spacing: -0.04em;
}

.empty-state p {
  max-width: 42ch;
  margin: 0;
  color: var(--muted);
}

.agenda-item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: center;
  padding: 18px 18px 18px 20px;
  border-radius: 26px;
  border: 1px solid color-mix(in oklab, var(--accent) 12%, var(--border));
  background: linear-gradient(135deg, color-mix(in oklab, var(--surface-strong) 92%, transparent), color-mix(in oklab, var(--surface) 94%, transparent));
  overflow: hidden;
}

.agenda-item-accent {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: linear-gradient(180deg, var(--accent), var(--accent-2));
}

.agenda-item-copy {
  position: relative;
  z-index: 1;
}

.agenda-item-topline {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.agenda-index,
.agenda-badge {
  font-size: 11px;
  color: var(--muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.agenda-badge {
  padding: 5px 8px;
  border-radius: 999px;
  border: 1px solid color-mix(in oklab, var(--accent) 16%, transparent);
  background: color-mix(in oklab, var(--surface) 88%, transparent);
}

.agenda-item h3 {
  margin: 0;
  font-size: 22px;
  letter-spacing: -0.04em;
}

.agenda-item p {
  margin: 8px 0 0;
  color: var(--muted);
}

.toast-stack {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 30;
  display: grid;
  gap: 10px;
}

.toast {
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
  font-size: 12px;
  letter-spacing: 0.03em;
}

.toast-success {
  border-color: color-mix(in oklab, var(--success) 26%, var(--border));
}

.toast-error {
  border-color: color-mix(in oklab, var(--danger) 26%, var(--border));
}

.toast-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  flex-shrink: 0;
}

.toast-error .toast-dot {
  background: var(--danger);
}

.toast-success .toast-dot {
  background: var(--success);
}

@keyframes agenda-shimmer {
  from { background-position: -220px 0, 0 0; }
  to { background-position: calc(100% + 220px) 0, 0 0; }
}

@keyframes agendas-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in oklab, var(--accent) 40%, transparent); }
  50% { box-shadow: 0 0 0 7px color-mix(in oklab, var(--accent) 0%, transparent); }
}

@media (max-width: 980px) {
  .agendas-hero,
  .agendas-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .agendas-shell {
    padding: 14px;
  }

  .agendas-header,
  .agendas-hero,
  .glass-card {
    border-radius: 24px;
  }

  .agendas-header,
  .section-head,
  .form-footer,
  .agenda-item {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: flex-start;
  }

  .agendas-header {
    display: grid;
  }

  .agendas-header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .agendas-btn,
  .agendas-icon-btn,
  .danger-btn {
    width: 100%;
    justify-content: center;
  }

  .toast-stack {
    left: 14px;
    right: 14px;
    bottom: 14px;
  }

  .toast {
    max-width: none;
    min-width: 0;
  }
}
`;
