const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type ApiEvent = {
  id: number;
  title: string;
  start_datetime: string;
  end_datetime: string;
  agenda_id: number;
  event_type_id: number;
};

export type AgendaRead = { id: number; name: string; description?: string };
type AgendaCreate = { name: string; description?: string };

export const api = {
  getEvents: (month: number, year: number): Promise<ApiEvent[]> =>
    fetch(`${BASE}/events?month=${month}&year=${year}`).then((r) => r.json()),

  createEvent: (data: Omit<ApiEvent, "id">): Promise<ApiEvent> =>
    fetch(`${BASE}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  deleteEvent: (id: number): Promise<void> =>
    fetch(`${BASE}/events/${id}`, { method: "DELETE" }).then(() => undefined),

  getAgendas: (): Promise<AgendaRead[]> =>
    fetch(`${BASE}/agendas`).then((r) => r.json()),

  createAgenda: (data: AgendaCreate): Promise<AgendaRead> =>
    fetch(`${BASE}/agendas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }).then((r) => r.json()),

  deleteAgenda: (id: number): Promise<void> =>
    fetch(`${BASE}/agendas/${id}`, { method: "DELETE" }).then(() => undefined),
};
