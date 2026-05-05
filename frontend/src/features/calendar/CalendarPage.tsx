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
    toggleCalendarTheme?: () => void;
  }
}

export function CalendarPage() {
  const navigate = useNavigate();
  const styleText = useMemo(() => calendarTemplate.styleText, []);
  const bodyHtml = useMemo(() => calendarTemplate.bodyHtml, []);

  useEffect(() => {
    const eventTemplates: CalendarEvent[] = [
      { time: "09:00", label: "Standup" },
      { time: "11:30", label: "Review" },
      { time: "14:00", label: "Focus block" },
      { time: "16:30", label: "Sync" },
      { time: "18:00", label: "Cierre" }
    ];

    const dayNodes = Array.from(document.querySelectorAll<HTMLElement>(".day[data-day]"));
    const eventPills = document.getElementById("eventPills");
    const activeDayLabel = document.getElementById("activeDayLabel");
    const addEventBtn = document.getElementById("addEventBtn") as HTMLButtonElement | null;
    const removeEventBtn = document.getElementById("removeEventBtn") as HTMLButtonElement | null;
    const dayModal = document.getElementById("dayModal");
    const dayModalBackdrop = document.getElementById("dayModalBackdrop");
    const closeModalBtn = document.getElementById("closeModalBtn") as HTMLButtonElement | null;
    const modalDayTitle = document.getElementById("modalDayTitle");
    const modalDaySubtitle = document.getElementById("modalDaySubtitle");
    const modalEventList = document.getElementById("modalEventList");
    const modalAddEventBtn = document.getElementById("modalAddEventBtn") as HTMLButtonElement | null;
    const modalRemoveEventBtn = document.getElementById("modalRemoveEventBtn") as HTMLButtonElement | null;
    const themeLabel = document.getElementById("calendarThemeLabel");

    if (
      !eventPills ||
      !activeDayLabel ||
      !addEventBtn ||
      !removeEventBtn ||
      !dayModal ||
      !dayModalBackdrop ||
      !closeModalBtn ||
      !modalDayTitle ||
      !modalDaySubtitle ||
      !modalEventList ||
      !modalAddEventBtn ||
      !modalRemoveEventBtn ||
      !themeLabel
    ) {
      return;
    }

    let cancelled = false;
    let selectedDay = 4;
    let selectedEventIndex = 0;
    let nextTemplateIndex = 0;
    const themeStorageKey = "agenda-theme";
    const eventsByDay: Record<number, CalendarEvent[]> = {};

    const applyTheme = (theme: "light" | "dark") => {
      document.documentElement.dataset.theme = theme;
      themeLabel.textContent = theme === "dark" ? "Modo oscuro" : "Modo claro";
    };

    const getSavedTheme = (): "light" | "dark" => {
      const saved = window.localStorage.getItem(themeStorageKey);
      return saved === "dark" ? "dark" : "light";
    };

    const toggleTheme = () => {
      const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      window.localStorage.setItem(themeStorageKey, nextTheme);
      applyTheme(nextTheme as "light" | "dark");
    };

    const openChatPage = () => {
      navigate("/chat");
    };

    applyTheme(getSavedTheme());

    const ensureEvents = (day: number) => {
      if (!eventsByDay[day]) eventsByDay[day] = [];
      return eventsByDay[day];
    };

    const formatDay = (day: number) => `${String(day).padStart(2, "0")} mayo`;

    const openModal = () => {
      dayModal.classList.add("is-open");
      dayModal.setAttribute("aria-hidden", "false");
    };

    const closeModal = () => {
      dayModal.classList.remove("is-open");
      dayModal.setAttribute("aria-hidden", "true");
    };

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
        if (label) label.textContent = events.map((event) => event.label).slice(0, 2).join(" · ");
        if (markers) {
          markers.innerHTML = events
            .slice(0, 3)
            .map((_, index) => `<span class="marker ${index === 0 ? "strong" : ""}"></span>`)
            .join("");
        }
      } else {
        count?.remove();
        card.classList.remove("featured");
        if (label) label.textContent = "Sin eventos";
        if (markers) markers.innerHTML = '<span class="marker"></span>';
      }
    };

    const renderModal = () => {
      modalDayTitle.textContent = String(selectedDay).padStart(2, "0");
      const eventCount = ensureEvents(selectedDay).length;
      modalDaySubtitle.textContent = `Mayo 2026 · ${eventCount} evento${eventCount === 1 ? "" : "s"}`;

      const events = ensureEvents(selectedDay);
      modalRemoveEventBtn.disabled = !events.length;

      if (!events.length) {
        modalEventList.innerHTML =
          '<div class="modal-empty">No hay eventos en este dia. Puedes agregar uno nuevo y aparecera con su hora en esta vista.</div>';
        return;
      }

      if (selectedEventIndex >= events.length) selectedEventIndex = events.length - 1;

      modalEventList.innerHTML = events
        .map(
          (event, index) => `
          <button class="modal-event ${index === selectedEventIndex ? "is-active" : ""}" type="button" data-modal-event-index="${index}">
            <div class="modal-event-time">${event.time}</div>
            <div class="modal-event-label">${event.label}</div>
          </button>
        `
        )
        .join("");

      modalEventList.querySelectorAll<HTMLElement>(".modal-event").forEach((button) => {
        button.addEventListener("click", () => {
          selectedEventIndex = Number(button.dataset.modalEventIndex);
          renderTray();
          renderModal();
        });
      });
    };

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
          (event, index) => `
          <button class="event-pill ${index === selectedEventIndex ? "is-active" : ""}" type="button" data-event-index="${index}">
            <span class="event-pill-time">${event.time}</span>
            <span class="event-pill-label">${event.label}</span>
          </button>
        `
        )
        .join("");

      eventPills.querySelectorAll<HTMLElement>(".event-pill").forEach((button) => {
        button.addEventListener("click", () => {
          selectedEventIndex = Number(button.dataset.eventIndex);
          renderTray();
          renderModal();
          openModal();
        });
      });
    };

    const selectDay = (day: number) => {
      selectedDay = day;
      selectedEventIndex = 0;
      dayNodes.forEach((node) => node.classList.toggle("selected", Number(node.dataset.day) === day));
      renderTray();
      renderModal();
      openModal();
    };

    const addEvent = async () => {
      const template = eventTemplates[nextTemplateIndex % eventTemplates.length];
      nextTemplateIndex += 1;

      const [hh, mm] = template.time.split(":").map(Number);
      const start = new Date(2026, 4, selectedDay, hh, mm);
      const end = new Date(start.getTime() + 60 * 60 * 1000);

      try {
        const created = await api.createEvent({
          title: template.label,
          start_datetime: start.toISOString().slice(0, 19),
          end_datetime: end.toISOString().slice(0, 19),
          agenda_id: 1,
          event_type_id: 1,
        });
        const events = ensureEvents(selectedDay);
        events.push({ time: template.time, label: created.title, id: created.id });
        selectedEventIndex = events.length - 1;
      } catch {
        const events = ensureEvents(selectedDay);
        events.push({ ...template });
        selectedEventIndex = events.length - 1;
      }

      syncDayCard(selectedDay);
      renderTray();
      renderModal();
    };

    const removeEvent = async () => {
      const events = ensureEvents(selectedDay);
      if (!events.length) return;
      const event = events[selectedEventIndex];

      if (event.id !== undefined) {
        try {
          await api.deleteEvent(event.id);
        } catch {
          // si falla el delete remoto, igual removemos localmente
        }
      }

      events.splice(selectedEventIndex, 1);
      selectedEventIndex = Math.max(0, selectedEventIndex - 1);
      syncDayCard(selectedDay);
      renderTray();
      renderModal();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };

    addEventBtn.addEventListener("click", () => { void addEvent(); });
    removeEventBtn.addEventListener("click", () => { void removeEvent(); });
    modalAddEventBtn.addEventListener("click", () => { void addEvent(); });
    modalRemoveEventBtn.addEventListener("click", () => { void removeEvent(); });
    dayModalBackdrop.addEventListener("click", closeModal);
    closeModalBtn.addEventListener("click", closeModal);
    document.addEventListener("keydown", onKeyDown);

    dayNodes.forEach((node) => {
      node.addEventListener("click", () => selectDay(Number(node.dataset.day)));
    });

    window.openChatPage = openChatPage;
    window.toggleCalendarTheme = toggleTheme;

    const init = async () => {
      try {
        const rawEvents = await api.getEvents(5, 2026);
        for (const ev of rawEvents) {
          const day = new Date(ev.start_datetime).getDate();
          const time = new Date(ev.start_datetime).toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          (eventsByDay[day] ??= []).push({ time, label: ev.title, id: ev.id });
        }
      } catch {
        // backend no disponible: calendario arranca vacío
      }

      if (cancelled) return;

      dayNodes.forEach((node) => syncDayCard(Number(node.dataset.day)));
      renderTray();
      renderModal();
    };

    void init();

    return () => {
      cancelled = true;
      addEventBtn.removeEventListener("click", () => { void addEvent(); });
      removeEventBtn.removeEventListener("click", () => { void removeEvent(); });
      modalAddEventBtn.removeEventListener("click", () => { void addEvent(); });
      modalRemoveEventBtn.removeEventListener("click", () => { void removeEvent(); });
      dayModalBackdrop.removeEventListener("click", closeModal);
      closeModalBtn.removeEventListener("click", closeModal);
      document.removeEventListener("keydown", onKeyDown);
      delete window.openChatPage;
      delete window.toggleCalendarTheme;
    };
  }, [bodyHtml, navigate]);

  return <InjectedPage styleText={styleText} bodyHtml={bodyHtml} bodyClassName="calendar-page-react" />;
}
