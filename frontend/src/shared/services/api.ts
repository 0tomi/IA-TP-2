const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type ApiEvent = {
  id: number;
  title: string;
  start_datetime: string;
  end_datetime: string;
  agenda_id: number;
  event_type_id: number;
  status?: string | null;
  event_type?: {
    id: number;
    name: string;
    color?: string | null;
  } | null;
};

export type AgendaRead = { id: number; name: string; description?: string };
type AgendaCreate = { name: string; description?: string };

async function parseError(response: Response) {
  try {
    const data = await response.json();
    if (data && typeof data.detail === "string") return data.detail;
  } catch {
    // Ignore invalid JSON bodies and fall back to the status text.
  }

  return response.statusText || "Ocurrio un error inesperado.";
}

async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<T>;
}

async function requestVoid(input: RequestInfo | URL, init?: RequestInit): Promise<void> {
  const response = await fetch(input, init);
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
}

export const api = {
  getEvents: (month: number, year: number): Promise<ApiEvent[]> =>
    requestJson<ApiEvent[]>(`${BASE}/events?month=${month}&year=${year}`),

  createEvent: (data: Omit<ApiEvent, "id">): Promise<ApiEvent> =>
    requestJson<ApiEvent>(`${BASE}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteEvent: (id: number): Promise<void> =>
    requestVoid(`${BASE}/events/${id}`, { method: "DELETE" }),

  getAgendas: (): Promise<AgendaRead[]> =>
    requestJson<AgendaRead[]>(`${BASE}/agendas`),

  createAgenda: (data: AgendaCreate): Promise<AgendaRead> =>
    requestJson<AgendaRead>(`${BASE}/agendas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  deleteAgenda: (id: number): Promise<void> =>
    requestVoid(`${BASE}/agendas/${id}`, { method: "DELETE" }),
};
