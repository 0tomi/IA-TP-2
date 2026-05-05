import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { InjectedPage } from "../../shared/components/InjectedPage";
import { api } from "../../shared/services/api";
import { calendarTemplate } from "./calendarTemplate";

type CalendarEvent = {
  time: string;
  label: string;
  id?: number;
};

declare global {
  interface Window {
    openChatPage?: () => void;
    openAgendasPage?: () => void;
    toggleCalendarTheme?: () => void;
  }
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function CalendarPage() {
  const navigate = useNavigate();
  const styleText = useMemo(() => calendarTemplate.styleText, []);
  const bodyHtml = useMemo(() => calendarTemplate.bodyHtml, []);

  useEffect(() => {
    // ── DOM refs ──────────────────────────────────────────────────────────────
    const eventPills        = document.getElementById("eventPills");
    const activeDayLabel    = document.getElementById("activeDayLabel");
    const addEventBtn       = document.getElementById("addEventBtn") as HTMLButtonElement | null;
    const removeEventBtn    = document.getElementById("removeEventBtn") as HTMLButtonElement | null;
    const dayModal          = document.getElementById("dayModal");
    const dayModalBackdrop  = document.getElementById("dayModalBackdrop");
    const closeModalBtn     = document.getElementById("closeModalBtn") as HTMLButtonElement | null;
    const modalDayTitle     = document.getElementById("modalDayTitle");
    const modalDaySubtitle  = document.getElementById("modalDaySubtitle");
    const modalEventList    = document.getElementById("modalEventList");
    const modalAddEventBtn  = document.getElementById("modalAddEventBtn") as HTMLButtonElement | null;
    const modalRemoveEventBtn = document.getElementById("modalRemoveEventBtn") as HTMLButtonElement | null;
    const themeLabel        = document.getElementById("calendarThemeLabel");
    const monthTitle        = document.getElementById("calendarMonthTitle");
    const prevMonthBtn      = document.getElementById("prevMonthBtn") as HTMLButtonElement | null;
    const nextMonthBtn      = document.getElementById("nextMonthBtn") as HTMLButtonElement | null;
    const todayBtn          = document.getElementById("todayBtn") as HTMLButtonElement | null;
    const calendarGrid      = document.getElementById("calendarGrid");
    const statEventCount    = document.getElementById("statEventCount");
    const statDaysWithEvents = document.getElementById("statDaysWithEvents");
    const statMonthLabel    = document.getElementById("statMonthLabel");

    // Create event modal
    const createEventModal    = document.getElementById("createEventModal");
    const createEventBackdrop = document.getElementById("createEventBackdrop");
    const closeCreateEventBtn = document.getElementById("closeCreateEventBtn") as HTMLButtonElement | null;
    const cancelCreateEventBtn = document.getElementById("cancelCreateEventBtn") as HTMLButtonElement | null;
    const submitCreateEventBtn = document.getElementById("submitCreateEventBtn") as HTMLButtonElement | null;
    const newEventTitle       = document.getElementById("newEventTitle") as HTMLInputElement | null;
    const newEventStart       = document.getElementById("newEventStart") as HTMLInputElement | null;
    const newEventEnd         = document.getElementById("newEventEnd") as HTMLInputElement | null;
    const createEventSubtitle = document.getElementById("createEventSubtitle");
    const createEventError    = document.getElementById("createEventError");

    if (
      !eventPills || !activeDayLabel || !addEventBtn || !removeEventBtn ||
      !dayModal || !dayModalBackdrop || !closeModalBtn || !modalDayTitle ||
      !modalDaySubtitle || !modalEventList || !modalAddEventBtn || !modalRemoveEventBtn ||
      !themeLabel || !monthTitle || !prevMonthBtn || !nextMonthBtn || !todayBtn ||
      !calendarGrid || !createEventModal || !createEventBackdrop || !closeCreateEventBtn ||
      !cancelCreateEventBtn || !submitCreateEventBtn || !newEventTitle || !newEventStart ||
      !newEventEnd || !createEventSubtitle || !createEventError
    ) return;

    // ── State ─────────────────────────────────────────────────────────────────
    let cancelled = false;
    const now = new Date();
    let currentMonth = now.getMonth() + 1;
    let currentYear  = now.getFullYear();
    let selectedDay  = now.getDate();
    let selectedEventIndex = 0;
    const eventsByDay: Record<number, CalendarEvent[]> = {};
    const themeStorageKey = "agenda-theme";

    // ── Theme ─────────────────────────────────────────────────────────────────
    const applyTheme = (theme: "light" | "dark") => {
      document.documentElement.dataset.theme = theme;
      themeLabel.textContent = theme === "dark" ? "Modo oscuro" : "Modo claro";
    };

    const getSavedTheme = (): "light" | "dark" =>
      window.localStorage.getItem(themeStorageKey) === "dark" ? "dark" : "light";

    const toggleTheme = () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      window.localStorage.setItem(themeStorageKey, next);
      applyTheme(next as "light" | "dark");
    };

    applyTheme(getSavedTheme());

    // ── Helpers ───────────────────────────────────────────────────────────────
    const ensureEvents = (day: number) => {
      if (!eventsByDay[day]) eventsByDay[day] = [];
      return eventsByDay[day];
    };

    const formatDay = (day: number) =>
      `${String(day).padStart(2, "0")} ${MONTH_NAMES[currentMonth - 1].toLowerCase()}`;

    // ── Grid generation ───────────────────────────────────────────────────────
    const generateGrid = (month: number, year: number) => {
      // Remove all day articles (keep the 7 weekday headers)
      const children = Array.from(calendarGrid.children);
      children.slice(7).forEach((c) => c.remove());

      const firstDayJs = new Date(year, month - 1, 1).getDay(); // 0=Sun
      const daysInMonth = new Date(year, month, 0).getDate();
      const offset = (firstDayJs + 6) % 7; // 0=Mon

      for (let i = 0; i < offset; i++) {
        const muted = document.createElement("article");
        muted.className = "day muted";
        calendarGrid.appendChild(muted);
      }

      const today = new Date();
      for (let d = 1; d <= daysInMonth; d++) {
        const article = document.createElement("article");
        article.className = "day";
        article.dataset.day = String(d);
        const isToday =
          today.getDate() === d &&
          today.getMonth() + 1 === month &&
          today.getFullYear() === year;
        if (isToday) article.classList.add("today");
        article.innerHTML = `
          <div class="day-head"><div class="day-num">${String(d).padStart(2, "0")}</div></div>
          <div class="day-label">Sin eventos</div>
          <div class="markers"><span class="marker"></span></div>
        `;
        calendarGrid.appendChild(article);
      }
    };

    // ── Day card sync ─────────────────────────────────────────────────────────
    const syncDayCard = (day: number) => {
      const card = document.querySelector<HTMLElement>(`.day[data-day="${day}"]`);
      if (!card) return;
      const events = ensureEvents(day);
      const count = card.querySelector(".event-count");
      const markers = card.querySelector(".markers");
      const label = card.querySelector(".day-label");

      if (events.length) {
        if (count) {
          count.textContent = String(events.length);
        } else {
          const badge = document.createElement("div");
          badge.className = "event-count";
          badge.textContent = String(events.length);
          card.querySelector(".day-head")?.appendChild(badge);
        }
        card.classList.add("featured");
        if (label) label.textContent = events.map((e) => e.label).slice(0, 2).join(" · ");
        if (markers) {
          markers.innerHTML = events
            .slice(0, 3)
            .map((_, i) => `<span class="marker ${i === 0 ? "strong" : ""}"></span>`)
            .join("");
        }
      } else {
        count?.remove();
        card.classList.remove("featured");
        if (label) label.textContent = "Sin eventos";
        if (markers) markers.innerHTML = '<span class="marker"></span>';
      }
    };

    // ── Stats update ──────────────────────────────────────────────────────────
    const updateStats = () => {
      const totalEvents = Object.values(eventsByDay).reduce((acc, evs) => acc + evs.length, 0);
      const daysWithEvents = Object.values(eventsByDay).filter((evs) => evs.length > 0).length;
      if (statEventCount) statEventCount.textContent = `${totalEvents} evento${totalEvents !== 1 ? "s" : ""}`;
      if (statDaysWithEvents) statDaysWithEvents.textContent = `${daysWithEvents} dia${daysWithEvents !== 1 ? "s" : ""}`;
      if (statMonthLabel) statMonthLabel.textContent = `${MONTH_NAMES[currentMonth - 1]} ${currentYear}`;
    };

    // ── Modal (day detail) ────────────────────────────────────────────────────
    const openModal = () => {
      dayModal.classList.add("is-open");
      dayModal.setAttribute("aria-hidden", "false");
    };

    const closeModal = () => {
      dayModal.classList.remove("is-open");
      dayModal.setAttribute("aria-hidden", "true");
    };

    const renderModal = () => {
      modalDayTitle.textContent = String(selectedDay).padStart(2, "0");
      const events = ensureEvents(selectedDay);
      modalDaySubtitle.textContent = `${MONTH_NAMES[currentMonth - 1]} ${currentYear} · ${events.length} evento${events.length !== 1 ? "s" : ""}`;
      modalRemoveEventBtn.disabled = !events.length;

      if (!events.length) {
        modalEventList.innerHTML =
          '<div class="modal-empty">No hay eventos este dia. Usá "agregar evento" para crear uno.</div>';
        return;
      }

      if (selectedEventIndex >= events.length) selectedEventIndex = events.length - 1;

      modalEventList.innerHTML = events
        .map(
          (ev, i) => `
          <button class="modal-event ${i === selectedEventIndex ? "is-active" : ""}" type="button" data-modal-event-index="${i}">
            <div class="modal-event-time">${ev.time}</div>
            <div class="modal-event-label">${ev.label}</div>
          </button>
        `
        )
        .join("");

      modalEventList.querySelectorAll<HTMLElement>(".modal-event").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedEventIndex = Number(btn.dataset.modalEventIndex);
          renderTray();
          renderModal();
        });
      });
    };

    // ── Tray ──────────────────────────────────────────────────────────────────
    const renderTray = () => {
      activeDayLabel.textContent = formatDay(selectedDay);
      const events = ensureEvents(selectedDay);

      if (!events.length) {
        eventPills.innerHTML = '<div class="event-empty">Sin eventos para este dia</div>';
        removeEventBtn.disabled = true;
        return;
      }

      if (selectedEventIndex >= events.length) selectedEventIndex = events.length - 1;
      removeEventBtn.disabled = false;

      eventPills.innerHTML = events
        .map(
          (ev, i) => `
          <button class="event-pill ${i === selectedEventIndex ? "is-active" : ""}" type="button" data-event-index="${i}">
            <span class="event-pill-time">${ev.time}</span>
            <span class="event-pill-label">${ev.label}</span>
          </button>
        `
        )
        .join("");

      eventPills.querySelectorAll<HTMLElement>(".event-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedEventIndex = Number(btn.dataset.eventIndex);
          renderTray();
          renderModal();
          openModal();
        });
      });
    };

    // ── Day selection ─────────────────────────────────────────────────────────
    const getDayNodes = () =>
      Array.from(document.querySelectorAll<HTMLElement>(".day[data-day]"));

    const selectDay = (day: number) => {
      selectedDay = day;
      selectedEventIndex = 0;
      getDayNodes().forEach((n) =>
        n.classList.toggle("selected", Number(n.dataset.day) === day)
      );
      renderTray();
      renderModal();
      openModal();
    };

    const attachDayListeners = () => {
      getDayNodes().forEach((n) =>
        n.addEventListener("click", () => selectDay(Number(n.dataset.day)))
      );
    };

    // ── Create event modal ────────────────────────────────────────────────────
    const openCreateModal = () => {
      createEventSubtitle.textContent = formatDay(selectedDay);
      if (newEventTitle) newEventTitle.value = "";
      if (newEventStart) newEventStart.value = "09:00";
      if (newEventEnd) newEventEnd.value = "10:00";
      createEventError.style.display = "none";
      createEventModal.classList.add("is-open");
      createEventModal.setAttribute("aria-hidden", "false");
      newEventTitle?.focus();
    };

    const closeCreateModal = () => {
      createEventModal.classList.remove("is-open");
      createEventModal.setAttribute("aria-hidden", "true");
    };

    const handleCreateEvent = async () => {
      const title = newEventTitle.value.trim();
      const startTime = newEventStart.value;
      const endTime = newEventEnd.value;

      if (!title) {
        createEventError.textContent = "El título no puede estar vacío.";
        createEventError.style.display = "block";
        newEventTitle.focus();
        return;
      }
      if (!startTime || !endTime) {
        createEventError.textContent = "Completá la hora de inicio y fin.";
        createEventError.style.display = "block";
        return;
      }
      if (endTime <= startTime) {
        createEventError.textContent = "La hora de fin debe ser posterior al inicio.";
        createEventError.style.display = "block";
        return;
      }

      const [sh, sm] = startTime.split(":").map(Number);
      const [eh, em] = endTime.split(":").map(Number);
      const start = new Date(currentYear, currentMonth - 1, selectedDay, sh, sm);
      const end = new Date(currentYear, currentMonth - 1, selectedDay, eh, em);

      submitCreateEventBtn.disabled = true;
      createEventError.style.display = "none";

      try {
        const created = await api.createEvent({
          title,
          start_datetime: start.toISOString().slice(0, 19),
          end_datetime: end.toISOString().slice(0, 19),
          agenda_id: 1,
          event_type_id: 1,
        });
        ensureEvents(selectedDay).push({
          time: startTime,
          label: created.title,
          id: created.id,
        });
      } catch {
        ensureEvents(selectedDay).push({ time: startTime, label: title });
      }

      selectedEventIndex = ensureEvents(selectedDay).length - 1;
      syncDayCard(selectedDay);
      updateStats();
      renderTray();
      renderModal();
      closeCreateModal();
      submitCreateEventBtn.disabled = false;
    };

    // ── Remove event ──────────────────────────────────────────────────────────
    const removeEvent = async () => {
      const events = ensureEvents(selectedDay);
      if (!events.length) return;
      const ev = events[selectedEventIndex];
      if (ev.id !== undefined) {
        try { await api.deleteEvent(ev.id); } catch { /* no-op */ }
      }
      events.splice(selectedEventIndex, 1);
      selectedEventIndex = Math.max(0, selectedEventIndex - 1);
      syncDayCard(selectedDay);
      updateStats();
      renderTray();
      renderModal();
    };

    // ── Month loading ─────────────────────────────────────────────────────────
    const loadMonth = async (month: number, year: number) => {
      // Clear events
      for (const k of Object.keys(eventsByDay)) delete eventsByDay[Number(k)];

      monthTitle.textContent = `${MONTH_NAMES[month - 1]} ${year}`;
      generateGrid(month, year);
      attachDayListeners();

      // Mark selected day
      const selNode = document.querySelector<HTMLElement>(`.day[data-day="${selectedDay}"]`);
      if (selNode) selNode.classList.add("selected");

      try {
        const rawEvents = await api.getEvents(month, year);
        if (cancelled) return;
        for (const ev of rawEvents) {
          const day = new Date(ev.start_datetime).getDate();
          const time = new Date(ev.start_datetime).toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          (eventsByDay[day] ??= []).push({ time, label: ev.title, id: ev.id });
        }
      } catch { /* backend no disponible */ }

      if (cancelled) return;
      getDayNodes().forEach((n) => syncDayCard(Number(n.dataset.day)));
      updateStats();
      renderTray();
      renderModal();
    };

    // ── Navigation ────────────────────────────────────────────────────────────
    const goToPrevMonth = () => {
      currentMonth--;
      if (currentMonth < 1) { currentMonth = 12; currentYear--; }
      selectedDay = 1;
      void loadMonth(currentMonth, currentYear);
    };

    const goToNextMonth = () => {
      currentMonth++;
      if (currentMonth > 12) { currentMonth = 1; currentYear++; }
      selectedDay = 1;
      void loadMonth(currentMonth, currentYear);
    };

    const goToToday = () => {
      const t = new Date();
      currentMonth = t.getMonth() + 1;
      currentYear = t.getFullYear();
      selectedDay = t.getDate();
      void loadMonth(currentMonth, currentYear);
    };

    // ── Keyboard ──────────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
        closeCreateModal();
      }
    };

    // ── Wire up listeners ─────────────────────────────────────────────────────
    prevMonthBtn.addEventListener("click", goToPrevMonth);
    nextMonthBtn.addEventListener("click", goToNextMonth);
    todayBtn.addEventListener("click", goToToday);

    addEventBtn.addEventListener("click", openCreateModal);
    removeEventBtn.addEventListener("click", () => { void removeEvent(); });
    modalAddEventBtn.addEventListener("click", openCreateModal);
    modalRemoveEventBtn.addEventListener("click", () => { void removeEvent(); });

    dayModalBackdrop.addEventListener("click", closeModal);
    closeModalBtn.addEventListener("click", closeModal);

    createEventBackdrop.addEventListener("click", closeCreateModal);
    closeCreateEventBtn.addEventListener("click", closeCreateModal);
    cancelCreateEventBtn.addEventListener("click", closeCreateModal);
    submitCreateEventBtn.addEventListener("click", () => { void handleCreateEvent(); });
    newEventTitle.addEventListener("keydown", (e) => {
      if (e.key === "Enter") void handleCreateEvent();
    });

    document.addEventListener("keydown", onKeyDown);

    window.openChatPage = () => navigate("/chat");
    window.openAgendasPage = () => navigate("/agendas");
    window.toggleCalendarTheme = toggleTheme;

    // ── Initial load ──────────────────────────────────────────────────────────
    void loadMonth(currentMonth, currentYear);

    return () => {
      cancelled = true;
      prevMonthBtn.removeEventListener("click", goToPrevMonth);
      nextMonthBtn.removeEventListener("click", goToNextMonth);
      todayBtn.removeEventListener("click", goToToday);
      dayModalBackdrop.removeEventListener("click", closeModal);
      closeModalBtn.removeEventListener("click", closeModal);
      document.removeEventListener("keydown", onKeyDown);
      delete window.openChatPage;
      delete window.openAgendasPage;
      delete window.toggleCalendarTheme;
    };
  }, [bodyHtml, navigate]);

  return <InjectedPage styleText={styleText} bodyHtml={bodyHtml} bodyClassName="calendar-page-react" />;
}
