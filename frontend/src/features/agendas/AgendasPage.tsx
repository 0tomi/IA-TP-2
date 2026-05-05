import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AgendaRead } from "../../shared/services/api";

export function AgendasPage() {
  const navigate = useNavigate();
  const [agendas, setAgendas] = useState<AgendaRead[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.getAgendas().then((data) => {
      setAgendas(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.createAgenda({
      name: name.trim(),
      description: description.trim() || undefined,
    });
    setName("");
    setDescription("");
    load();
  };

  const handleDelete = async (agenda: AgendaRead) => {
    if (!window.confirm(`¿Eliminar "${agenda.name}" y todos sus eventos?`)) return;
    await api.deleteAgenda(agenda.id);
    load();
  };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
      <div style={styles.page}>
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate("/calendar")}>
          ← Volver al calendario
        </button>
        <h1 style={styles.title}>Agendas</h1>
      </header>

      <main style={styles.main}>
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Nueva agenda</h2>
          <form onSubmit={(e) => { void handleCreate(e); }} style={styles.form}>
            <input
              style={styles.input}
              type="text"
              placeholder="Nombre *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              style={styles.input}
              type="text"
              placeholder="Descripción (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <button style={styles.createBtn} type="submit">
              Crear
            </button>
          </form>
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Mis agendas</h2>
          {loading ? (
            <p style={styles.empty}>Cargando...</p>
          ) : agendas.length === 0 ? (
            <p style={styles.empty}>No hay agendas. Creá una arriba.</p>
          ) : (
            <ul style={styles.list}>
              {agendas.map((agenda) => (
                <li key={agenda.id} style={styles.listItem}>
                  <div style={styles.agendaInfo}>
                    <span style={styles.agendaName}>{agenda.name}</span>
                    {agenda.description && (
                      <span style={styles.agendaDesc}>{agenda.description}</span>
                    )}
                  </div>
                  <button
                    style={styles.deleteBtn}
                    onClick={() => { void handleDelete(agenda); }}
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0f0f13",
    color: "#e8e8f0",
    fontFamily: "'Inter', system-ui, sans-serif",
    padding: "0 1rem",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
    padding: "1.5rem 0",
    borderBottom: "1px solid #1e1e2e",
    marginBottom: "2rem",
  },
  backBtn: {
    background: "none",
    border: "1px solid #2a2a3e",
    color: "#8888aa",
    borderRadius: "8px",
    padding: "0.4rem 0.9rem",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: 600,
    color: "#e8e8f0",
  },
  main: {
    maxWidth: "640px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  card: {
    backgroundColor: "#16161f",
    border: "1px solid #1e1e2e",
    borderRadius: "12px",
    padding: "1.5rem",
  },
  sectionTitle: {
    margin: "0 0 1rem",
    fontSize: "1rem",
    fontWeight: 600,
    color: "#c8c8e0",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  input: {
    backgroundColor: "#0f0f13",
    border: "1px solid #2a2a3e",
    borderRadius: "8px",
    color: "#e8e8f0",
    fontSize: "0.95rem",
    padding: "0.6rem 0.9rem",
    outline: "none",
  },
  createBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#6c63ff",
    border: "none",
    borderRadius: "8px",
    color: "#fff",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 600,
    padding: "0.55rem 1.2rem",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0f0f13",
    border: "1px solid #1e1e2e",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
  },
  agendaInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "0.15rem",
  },
  agendaName: {
    fontWeight: 600,
    fontSize: "0.95rem",
    color: "#e8e8f0",
  },
  agendaDesc: {
    fontSize: "0.8rem",
    color: "#8888aa",
  },
  deleteBtn: {
    background: "none",
    border: "1px solid #3e1e1e",
    borderRadius: "6px",
    color: "#cc6666",
    cursor: "pointer",
    fontSize: "0.8rem",
    padding: "0.3rem 0.7rem",
  },
  empty: {
    color: "#8888aa",
    fontSize: "0.9rem",
    margin: 0,
  },
};
