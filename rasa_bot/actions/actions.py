import logging
import os
import re
import unicodedata
from calendar import monthrange
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Text

import dateparser
import requests
from dateparser.search import search_dates
from rasa_sdk import Action, FormValidationAction, Tracker
from rasa_sdk.events import ActiveLoop, FollowupAction, SlotSet
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.types import DomainDict

logger = logging.getLogger(__name__)

API_BASE_URL = os.getenv("AGENDA_API_URL", "http://localhost:8000")

DEFAULT_EVENT_TIME = (9, 0)
PART_OF_DAY_RANGES = {
    "morning": (8, 0, 12, 0),
    "midday": (12, 0, 14, 0),
    "afternoon": (15, 0, 19, 0),
    "night": (20, 0, 23, 59),
    "early": (7, 0, 9, 0),
}
GENERIC_EVENT_WORDS = {
    "evento",
    "algo",
    "cosa",
    "turno",
    "agenda",
    "recordatorio",
    "bloque",
    "espacio",
}
CREATE_KEYWORDS = (
    "agenda",
    "agendame",
    "anotame",
    "anota",
    "guardame",
    "guarda",
    "crea",
    "crear",
    "programa",
    "programame",
    "organiz",
    "recordame",
    "reservame",
    "bloquea",
    "poneme",
)
QUERY_KEYWORDS = (
    "que tengo",
    "qué tengo",
    "tengo algo",
    "mostrame",
    "mostrar",
    "decime",
    "buscame",
    "busca",
    "listame",
    "revisame",
    "cuando es",
    "cuándo es",
    "a que hora",
    "a qué hora",
    "hay algo",
)
CHITCHAT_KEYWORDS = (
    "hola",
    "buenas",
    "chau",
    "adios",
    "adiós",
    "como andas",
    "cómo andás",
)
CREATE_PREFIX_RE = re.compile(
    r"^(che\s+)?(quiero\s+)?(necesito\s+)?(podes\s+)?(podés\s+)?"
    r"(agendame|agendá|agenda|anotame|anotá|anota|anota(?:r)?|guardame|guarda|crea|crear|programame|programa|organizame|organiza|reservame|bloqueame|bloquear|meteme|mete)\s+",
    re.IGNORECASE,
)
TRAILING_AGENDA_RE = re.compile(r"\ben\s+(?:la\s+agenda\s+)?([a-záéíóúñ0-9 _-]+)$", re.IGNORECASE)
TIME_RE = re.compile(
    r"(?:a\s+las?|a\s+la|desde\s+las?)\s*(\d{1,2})(?::(\d{2}))?(?:\s*(am|pm))?\b",
    re.IGNORECASE,
)
DATE_RE = re.compile(
    r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b"
)
WEEKDAY_RE = re.compile(
    r"\b(lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)\b",
    re.IGNORECASE,
)
DURATION_RE = re.compile(
    r"\b(\d+(?:[.,]\d+)?)\s*(hora|horas|h|hs|min|minuto|minutos)\b",
    re.IGNORECASE,
)
PART_OF_DAY_RE = {
    "morning": re.compile(r"\b(a la manana|a la mañana|por la manana|por la mañana)\b", re.IGNORECASE),
    "midday": re.compile(r"\b(al mediodia|al mediodía)\b", re.IGNORECASE),
    "afternoon": re.compile(r"\b(a la tarde|por la tarde)\b", re.IGNORECASE),
    "night": re.compile(r"\b(a la noche|por la noche)\b", re.IGNORECASE),
    "early": re.compile(r"\b(temprano)\b", re.IGNORECASE),
}
DATE_HINT_RE = re.compile(
    r"\b(hoy|manana|mañana|pasado manana|pasado mañana|esta semana|semana que viene|la semana que viene|este mes|mes que viene|el mes que viene|proximo mes|próximo mes)\b",
    re.IGNORECASE,
)

CANONICAL_EVENT_TYPE_RULES = [
    ("Reunión", ("reunion", "reunión", "meeting", "juntada", "llamada", "standup", "sync", "sync-up")),
    ("Recordatorio", ("recordatorio", "recordar", "aviso", "vencimiento", "pago", "alerta")),
    ("Personal", ("gimnasio", "gym", "dentista", "medico", "médico", "psicologo", "psicólogo", "cumple", "partido", "almuerzo", "cena", "familia", "turno", "checkup")),
    ("Tarea", ("parcial", "final", "examen", "recuperatorio", "trabajo practico", "trabajo práctico", "estudio", "tarea", "clase", "consulta", "entrenamiento", "sesion", "sesión", "bloque de foco", "foco", "bloque", "tramite", "trámite")),
]


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def normalize_text(value: str) -> str:
    return strip_accents(value).lower().strip()


def collapse_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip(" ,.-")


def now_local() -> datetime:
    return datetime.now()


def clear_flow_slots() -> List[SlotSet]:
    return [
        SlotSet("tipo_evento", None),
        SlotSet("fecha_evento", None),
        SlotSet("nombre_agenda", None),
        SlotSet("duracion_texto", None),
        SlotSet("duracion_minutos", None),
        SlotSet("pending_action", None),
        SlotSet("requested_slot", None),
        SlotSet("awaiting_confirmation", False),
    ]


def has_explicit_time(text: str) -> bool:
    return bool(TIME_RE.search(text) or re.search(r"\b\d{1,2}:\d{2}\b", text))


def extract_time_components(text: str) -> tuple[Optional[int], Optional[int]]:
    match = TIME_RE.search(text)
    if match:
        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
        meridiem = (match.group(3) or "").lower()
        if meridiem == "pm" and hour < 12:
            hour += 12
        if meridiem == "am" and hour == 12:
            hour = 0
        return hour, minute

    match = re.search(r"\b(\d{1,2}):(\d{2})\b", text)
    if match:
        return int(match.group(1)), int(match.group(2))

    return None, None


def detect_part_of_day(text: str) -> Optional[str]:
    for part, pattern in PART_OF_DAY_RE.items():
        if pattern.search(text):
            return part
    return None


def apply_time_defaults(base_dt: datetime, raw_text: str) -> datetime:
    hour, minute = extract_time_components(raw_text)
    if hour is not None:
        return base_dt.replace(hour=hour, minute=minute or 0, second=0, microsecond=0)

    part_of_day = detect_part_of_day(raw_text)
    if part_of_day:
        hour, minute, _, _ = PART_OF_DAY_RANGES[part_of_day]
        return base_dt.replace(hour=hour, minute=minute, second=0, microsecond=0)

    return base_dt.replace(
        hour=DEFAULT_EVENT_TIME[0],
        minute=DEFAULT_EVENT_TIME[1],
        second=0,
        microsecond=0,
    )


def resolve_day_month(match: re.Match[str], base_date: datetime) -> datetime:
    day = int(match.group(1))
    month = int(match.group(2))
    year_text = match.group(3)

    if year_text:
        year = int(year_text)
        if year < 100:
            year += 2000
    else:
        year = base_date.year

    candidate = datetime(year, month, day)
    if not year_text and candidate.date() < base_date.date():
        candidate = datetime(year + 1, month, day)
    return candidate


def extract_date_candidate(text: str) -> Optional[str]:
    text = collapse_spaces(text)

    for pattern in (
        r"\bpasado\s+mañana(?:\s+a\s+las?\s+\d{1,2}(?::\d{2})?)?",
        r"\bpasado\s+manana(?:\s+a\s+las?\s+\d{1,2}(?::\d{2})?)?",
        r"\bmañana(?:\s+a\s+las?\s+\d{1,2}(?::\d{2})?)?",
        r"\bmanana(?:\s+a\s+las?\s+\d{1,2}(?::\d{2})?)?",
        r"\bhoy(?:\s+a\s+las?\s+\d{1,2}(?::\d{2})?)?",
        r"\b(?:el\s+)?(?:lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo)(?:\s+que\s+viene)?(?:\s+a\s+las?\s+\d{1,2}(?::\d{2})?)?",
        r"\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?(?:\s+a\s+las?\s+\d{1,2}(?::\d{2})?)?",
    ):
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(0)

    detected = search_dates(
        text,
        languages=["es"],
        settings={"PREFER_DATES_FROM": "future", "RELATIVE_BASE": now_local()},
    )
    if detected:
        detected = sorted(detected, key=lambda item: len(item[0]), reverse=True)
        return detected[0][0]

    return None


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None

    base_date = now_local()
    text = collapse_spaces(date_str)
    normalized = normalize_text(text)
    normalized = normalized.replace("pasado manana", "pasado mañana")

    date_match = DATE_RE.search(normalized)
    if date_match:
        candidate = resolve_day_month(date_match, base_date)
        return apply_time_defaults(candidate, normalized)

    direct_parse = dateparser.parse(
        normalized,
        languages=["es"],
        settings={
            "PREFER_DATES_FROM": "future",
            "RELATIVE_BASE": base_date,
        },
    )
    if direct_parse:
        if direct_parse.hour == 0 and direct_parse.minute == 0 and not has_explicit_time(normalized):
            return apply_time_defaults(direct_parse, normalized)
        return direct_parse.replace(second=0, microsecond=0)

    candidate_text = extract_date_candidate(normalized)
    if candidate_text:
        detected = dateparser.parse(
            candidate_text,
            languages=["es"],
            settings={
                "PREFER_DATES_FROM": "future",
                "RELATIVE_BASE": base_date,
            },
        )
        if detected:
            if detected.hour == 0 and detected.minute == 0 and not has_explicit_time(candidate_text):
                return apply_time_defaults(detected, normalized)
            return detected.replace(second=0, microsecond=0)

    if re.fullmatch(r"\d{1,2}", normalized):
        hour = int(normalized)
        candidate = base_date.replace(hour=hour, minute=0, second=0, microsecond=0)
        if candidate <= base_date:
            candidate += timedelta(days=1)
        return candidate

    return None


def extract_duration_text(text: Optional[str]) -> Optional[str]:
    if not text:
        return None

    compact = collapse_spaces(text)
    if re.search(r"\bmedia hora\b", compact, re.IGNORECASE):
        return "media hora"
    if re.search(r"\bhora y media\b", compact, re.IGNORECASE):
        return "hora y media"

    match = DURATION_RE.search(compact)
    if match:
        return match.group(0)

    return None


def parse_duration_minutes(duration_text: Optional[str]) -> Optional[int]:
    if not duration_text:
        return None

    text = normalize_text(duration_text)

    if text in {"media hora", "media", "mitad de hora"}:
        return 30
    if "hora y media" in text:
        return 90

    total = 0
    for value, unit in re.findall(r"(\d+(?:[.,]\d+)?)\s*(hora|horas|h|hs|min|minuto|minutos)", text):
        amount = float(value.replace(",", "."))
        if unit.startswith("h") or "hora" in unit:
            total += int(amount * 60)
        else:
            total += int(amount)

    if total > 0:
        return total

    if re.fullmatch(r"\d+", text):
        return int(text)

    return None


def infer_default_duration_minutes(tipo_evento: str) -> int:
    normalized = normalize_text(tipo_evento)

    if any(term in normalized for term in ("parcial", "final", "examen", "recuperatorio")):
        return 120
    if any(term in normalized for term in ("bloque de foco", "foco", "estudio", "gimnasio", "entrenamiento")):
        return 60
    if any(term in normalized for term in ("cumple", "partido", "almuerzo", "cena", "juntada")):
        return 120
    if any(term in normalized for term in ("turno", "dentista", "medico", "médico", "psicologo", "psicólogo")):
        return 60
    if any(term in normalized for term in ("reunion", "reunión", "meeting", "llamada", "consulta")):
        return 30
    if any(term in normalized for term in ("recordatorio", "pago", "vencimiento")):
        return 15

    return 60


def canonical_event_type_name(title: str) -> str:
    normalized = normalize_text(title)
    for canonical, terms in CANONICAL_EVENT_TYPE_RULES:
        if any(term in normalized for term in terms):
            return canonical
    return "Otro"


def format_duration(minutes: int) -> str:
    hours, remainder = divmod(minutes, 60)
    if hours and remainder:
        return f"{hours}h {remainder}m"
    if hours:
        return f"{hours}h"
    return f"{remainder}m"


def format_datetime(dt: datetime) -> str:
    return dt.strftime("%d/%m a las %H:%M")


def beautify_title(title: str) -> str:
    pretty = collapse_spaces(title)
    if not pretty:
        return "Evento"
    return pretty[0].upper() + pretty[1:]


def fetch_agendas() -> List[Dict[str, Any]]:
    response = requests.get(f"{API_BASE_URL}/agendas", timeout=5)
    response.raise_for_status()
    return response.json()


def fetch_events(params: Dict[str, Any]) -> List[Dict[str, Any]]:
    response = requests.get(f"{API_BASE_URL}/events", params=params, timeout=5)
    response.raise_for_status()
    return response.json()


def fetch_event_types() -> List[Dict[str, Any]]:
    response = requests.get(f"{API_BASE_URL}/event-types", timeout=5)
    response.raise_for_status()
    return response.json()


def resolve_agenda_for_create(name: Optional[str]) -> tuple[Optional[int], Optional[str], Optional[List[str]], Optional[str]]:
    try:
        agendas = fetch_agendas()

        if name:
            normalized_name = normalize_text(name)
            for agenda in agendas:
                if normalize_text(agenda["name"]) == normalized_name:
                    return agenda["id"], agenda["name"], None, None

            create_resp = requests.post(
                f"{API_BASE_URL}/agendas",
                json={"name": beautify_title(name)},
                timeout=5,
            )
            create_resp.raise_for_status()
            payload = create_resp.json()
            return payload["id"], payload["name"], None, None

        if not agendas:
            create_resp = requests.post(
                f"{API_BASE_URL}/agendas",
                json={"name": "Mi Agenda"},
                timeout=5,
            )
            create_resp.raise_for_status()
            payload = create_resp.json()
            return payload["id"], payload["name"], None, None

        if len(agendas) == 1:
            return agendas[0]["id"], agendas[0]["name"], None, None

        return None, None, [agenda["name"] for agenda in agendas], None
    except requests.exceptions.ConnectionError:
        logger.exception("Agenda API is unreachable while resolving agenda for create")
        return None, None, None, "No pude conectarme con el backend para resolver la agenda."
    except requests.RequestException as exc:
        logger.exception("Agenda API returned an error while resolving agenda for create")
        return None, None, None, f"Hubo un problema al resolver la agenda: {exc}"


def resolve_agenda_for_query(name: Optional[str]) -> tuple[Optional[int], Optional[str], Optional[str]]:
    if not name:
        return None, None, None

    try:
        agendas = fetch_agendas()
        normalized_name = normalize_text(name)
        for agenda in agendas:
            if normalize_text(agenda["name"]) == normalized_name:
                return agenda["id"], agenda["name"], None

        return None, None, f"No encontré una agenda llamada '{name}'."
    except requests.exceptions.ConnectionError:
        logger.exception("Agenda API is unreachable while resolving agenda for query")
        return None, None, "No pude conectarme con el backend para buscar esa agenda."
    except requests.RequestException as exc:
        logger.exception("Agenda API returned an error while resolving agenda for query")
        return None, None, f"Hubo un problema al buscar la agenda: {exc}"


def resolve_event_type(name: str) -> tuple[Optional[int], Optional[str], Optional[str]]:
    canonical_name = canonical_event_type_name(name)

    try:
        event_types = fetch_event_types()
        for event_type in event_types:
            if normalize_text(event_type["name"]) == normalize_text(canonical_name):
                return event_type["id"], event_type["name"], None

        create_resp = requests.post(
            f"{API_BASE_URL}/event-types",
            json={"name": canonical_name},
            timeout=5,
        )
        create_resp.raise_for_status()
        payload = create_resp.json()
        return payload["id"], payload["name"], None
    except requests.exceptions.ConnectionError:
        logger.exception("Agenda API is unreachable while resolving event type")
        return None, None, "No pude conectarme con el backend para resolver el tipo de evento."
    except requests.RequestException as exc:
        logger.exception("Agenda API returned an error while resolving event type")
        return None, None, f"Hubo un problema al resolver el tipo de evento: {exc}"


def build_confirmation_message(tipo_evento: str, agenda_name: str, start_dt: datetime, duration_minutes: int) -> str:
    return (
        "Quedaría así: "
        f"'{beautify_title(tipo_evento)}' el {format_datetime(start_dt)} en la agenda '{agenda_name}' "
        f"con una duración estimada de {format_duration(duration_minutes)}. "
        "Decime 'si' para confirmarlo, 'no' para cancelarlo o corregime algún dato."
    )


def build_search_description(filters: List[str]) -> str:
    if not filters:
        return "esa búsqueda"
    if len(filters) == 1:
        return filters[0]
    return ", ".join(filters[:-1]) + f" y {filters[-1]}"


def is_chitchat(text: str) -> bool:
    normalized = normalize_text(text)
    return any(keyword in normalized for keyword in CHITCHAT_KEYWORDS)


def infer_basic_intent(text: str) -> Optional[str]:
    normalized = normalize_text(text)
    if any(keyword in normalized for keyword in QUERY_KEYWORDS):
        return "consultar_evento"
    if any(keyword in normalized for keyword in CREATE_KEYWORDS):
        return "crear_evento"
    if is_chitchat(text):
        return "chitchat"
    return None


def extract_agenda_name_from_text(text: str) -> Optional[str]:
    try:
        agendas = fetch_agendas()
    except requests.RequestException:
        return None

    normalized_text = normalize_text(text)
    for agenda in agendas:
        agenda_name = agenda["name"]
        if normalize_text(agenda_name) in normalized_text:
            return agenda_name

    match = TRAILING_AGENDA_RE.search(text)
    if match:
        return collapse_spaces(match.group(1))

    return None


def remove_detected_chunks(text: str, chunks: List[str]) -> str:
    cleaned = text
    for chunk in chunks:
        if not chunk:
            continue
        cleaned = re.sub(re.escape(chunk), " ", cleaned, flags=re.IGNORECASE)
    return collapse_spaces(cleaned)


def infer_event_title_from_text(text: str, detected_date: Optional[str], detected_duration: Optional[str], detected_agenda: Optional[str]) -> Optional[str]:
    cleaned = CREATE_PREFIX_RE.sub("", text)
    cleaned = re.sub(r"\b(?:para|el|la|los|las|un|una|de|del|por|con|que dure|durante)\b", " ", cleaned, flags=re.IGNORECASE)
    chunks = [detected_date or "", detected_duration or "", detected_agenda or ""]
    cleaned = remove_detected_chunks(cleaned, chunks)
    cleaned = re.sub(r"\ben\s+la\s+agenda\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\ben\b", " ", cleaned, flags=re.IGNORECASE)
    cleaned = collapse_spaces(cleaned)

    if not cleaned:
        return None

    normalized = normalize_text(cleaned)
    if normalized in GENERIC_EVENT_WORDS:
        return None

    return cleaned


def bootstrap_create_slots_from_text(text: str) -> Dict[str, Optional[str]]:
    detected_date = extract_date_candidate(text)
    detected_duration = extract_duration_text(text)
    detected_agenda = extract_agenda_name_from_text(text)
    inferred_title = infer_event_title_from_text(text, detected_date, detected_duration, detected_agenda)

    return {
        "tipo_evento": inferred_title,
        "fecha_evento": detected_date,
        "nombre_agenda": detected_agenda,
        "duracion_texto": detected_duration,
    }


def resolve_query_range(fecha_text: str) -> tuple[Optional[datetime], Optional[datetime], Optional[str]]:
    base = now_local()
    normalized = normalize_text(fecha_text)

    if "esta semana" in normalized:
        start = (base - timedelta(days=base.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        end = (start + timedelta(days=6)).replace(hour=23, minute=59, second=59, microsecond=0)
        return start, end, "esta semana"

    if "semana que viene" in normalized or "la semana que viene" in normalized:
        start = (base - timedelta(days=base.weekday()) + timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
        end = (start + timedelta(days=6)).replace(hour=23, minute=59, second=59, microsecond=0)
        return start, end, "la semana que viene"

    if "este mes" in normalized:
        start = base.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_day = monthrange(start.year, start.month)[1]
        end = start.replace(day=last_day, hour=23, minute=59, second=59, microsecond=0)
        return start, end, "este mes"

    if any(term in normalized for term in ("mes que viene", "el mes que viene", "proximo mes", "próximo mes")):
        year = base.year + (1 if base.month == 12 else 0)
        month = 1 if base.month == 12 else base.month + 1
        start = datetime(year, month, 1)
        last_day = monthrange(year, month)[1]
        end = datetime(year, month, last_day, 23, 59, 59)
        return start, end, "el mes que viene"

    dt = parse_date(fecha_text)
    if not dt:
        return None, None, None

    start = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    end = dt.replace(hour=23, minute=59, second=59, microsecond=0)

    part_of_day = detect_part_of_day(fecha_text)
    if part_of_day:
        start_hour, start_minute, end_hour, end_minute = PART_OF_DAY_RANGES[part_of_day]
        start = dt.replace(hour=start_hour, minute=start_minute, second=0, microsecond=0)
        end = dt.replace(hour=end_hour, minute=end_minute, second=59, microsecond=0)

    return start, end, f"el {dt.strftime('%d/%m')}"


def extract_query_type(text: str) -> Optional[str]:
    normalized = normalize_text(text)
    for canonical, terms in CANONICAL_EVENT_TYPE_RULES:
        if any(term in normalized for term in terms):
            for term in sorted(terms, key=len, reverse=True):
                if term in normalized:
                    return term
    return None


def normalize_word_variants(value: str) -> set[str]:
    normalized = normalize_text(value)
    variants = {normalized}
    if normalized.endswith("es") and len(normalized) > 4:
        variants.add(normalized[:-2])
    if normalized.endswith("s") and len(normalized) > 3:
        variants.add(normalized[:-1])
    return variants


def event_matches_query(event: Dict[str, Any], query_text: str) -> bool:
    title = normalize_text(event.get("title", ""))
    event_type = normalize_text((event.get("event_type") or {}).get("name", ""))
    query_variants = normalize_word_variants(query_text)
    event_canonical = normalize_text(canonical_event_type_name(event.get("title", "")))
    haystack = {title, event_type, event_canonical}
    query_canonical = normalize_text(canonical_event_type_name(query_text))

    for value in haystack:
        for variant in query_variants:
            if variant and variant in value:
                return True
        if query_canonical and query_canonical == value:
            return True

    return False


class ActionBootstrapEvento(Action):
    def name(self) -> Text:
        return "action_bootstrap_evento"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        text = tracker.latest_message.get("text", "")
        entities = tracker.latest_message.get("entities", [])
        entity_map: Dict[str, str] = {}
        for entity in entities:
            entity_name = entity.get("entity")
            value = entity.get("value")
            if entity_name and value and entity_name not in entity_map:
                entity_map[entity_name] = str(value)

        inferred = bootstrap_create_slots_from_text(text)

        return [
            SlotSet("pending_action", "create"),
            SlotSet("tipo_evento", entity_map.get("tipo_evento") or inferred["tipo_evento"]),
            SlotSet("fecha_evento", entity_map.get("fecha") or inferred["fecha_evento"]),
            SlotSet("nombre_agenda", entity_map.get("nombre_agenda") or inferred["nombre_agenda"]),
            SlotSet("duracion_texto", entity_map.get("duracion") or inferred["duracion_texto"]),
        ]


class ActionValidarYCrearEvento(Action):
    def name(self) -> Text:
        return "action_validar_y_crear_evento"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        latest_text = tracker.latest_message.get("text", "")
        latest_intent = tracker.latest_message.get("intent", {}).get("name")
        latest_entities = tracker.latest_message.get("entities", [])
        entity_map: Dict[str, str] = {}
        for entity in latest_entities:
            entity_name = entity.get("entity")
            value = entity.get("value")
            if entity_name and value and entity_name not in entity_map:
                entity_map[entity_name] = str(value)

        inferred = bootstrap_create_slots_from_text(latest_text)
        prefer_latest_values = latest_intent in {
            "crear_evento",
            "informar_agenda",
            "informar_detalle_evento",
            "informar_duracion",
            "corregir_evento",
        }

        def merge_slot(slot_name: str, entity_name: Optional[str] = None) -> Optional[str]:
            entity_key = entity_name or slot_name
            latest_value = entity_map.get(entity_key) or inferred.get(slot_name)
            current_value = tracker.get_slot(slot_name)
            if prefer_latest_values and latest_value:
                return latest_value
            return current_value or latest_value

        tipo_evento = merge_slot("tipo_evento")
        fecha_evento = merge_slot("fecha_evento", "fecha")
        nombre_agenda = merge_slot("nombre_agenda")
        duracion_texto = merge_slot("duracion_texto", "duracion")

        if not tipo_evento:
            dispatcher.utter_message(
                text="¿Qué querés agendar? Por ejemplo: parcial, reunión, gimnasio o bloque de foco."
            )
            return [
                SlotSet("pending_action", "create"),
                SlotSet("requested_slot", "tipo_evento"),
                SlotSet("tipo_evento", None),
                SlotSet("fecha_evento", fecha_evento),
                SlotSet("nombre_agenda", nombre_agenda),
                SlotSet("duracion_texto", duracion_texto),
                SlotSet("awaiting_confirmation", False),
            ]

        if not fecha_evento:
            dispatcher.utter_message(
                text="¿Para cuándo lo querés agendar? Podés decirme 'mañana a las 18', '10/5 a las 10' o 'el viernes a la tarde'."
            )
            return [
                SlotSet("pending_action", "create"),
                SlotSet("requested_slot", "fecha_evento"),
                SlotSet("tipo_evento", tipo_evento),
                SlotSet("fecha_evento", None),
                SlotSet("nombre_agenda", nombre_agenda),
                SlotSet("duracion_texto", duracion_texto),
                SlotSet("awaiting_confirmation", False),
            ]

        start_dt = parse_date(fecha_evento)
        if not start_dt:
            dispatcher.utter_message(
                text="No pude entender bien la fecha. Probá con algo como 'mañana a las 18', '10/5 a las 10' o 'el viernes a la tarde'."
            )
            return [
                SlotSet("pending_action", "create"),
                SlotSet("requested_slot", "fecha_evento"),
                SlotSet("tipo_evento", tipo_evento),
                SlotSet("fecha_evento", None),
                SlotSet("nombre_agenda", nombre_agenda),
                SlotSet("duracion_texto", duracion_texto),
                SlotSet("awaiting_confirmation", False),
            ]

        agenda_id, agenda_name, agenda_options, agenda_error = resolve_agenda_for_create(nombre_agenda)
        if agenda_error:
            dispatcher.utter_message(text=agenda_error)
            return [
                SlotSet("pending_action", "create"),
                SlotSet("requested_slot", "nombre_agenda"),
                SlotSet("tipo_evento", tipo_evento),
                SlotSet("fecha_evento", fecha_evento),
                SlotSet("nombre_agenda", nombre_agenda),
                SlotSet("duracion_texto", duracion_texto),
                SlotSet("awaiting_confirmation", False),
            ]

        if agenda_options:
            dispatcher.utter_message(
                text="Tenés varias agendas guardadas: " + ", ".join(agenda_options) + ". ¿En cuál querés que lo anote?"
            )
            return [
                SlotSet("pending_action", "create"),
                SlotSet("requested_slot", "nombre_agenda"),
                SlotSet("tipo_evento", tipo_evento),
                SlotSet("fecha_evento", fecha_evento),
                SlotSet("nombre_agenda", None),
                SlotSet("duracion_texto", duracion_texto),
                SlotSet("awaiting_confirmation", False),
            ]

        duration_minutes = parse_duration_minutes(duracion_texto)
        if duration_minutes is None:
            duration_minutes = infer_default_duration_minutes(tipo_evento)

        dispatcher.utter_message(
            text=build_confirmation_message(tipo_evento, agenda_name, start_dt, duration_minutes)
        )
        return [
            SlotSet("pending_action", "create"),
            SlotSet("requested_slot", None),
            SlotSet("tipo_evento", collapse_spaces(tipo_evento)),
            SlotSet("fecha_evento", collapse_spaces(fecha_evento)),
            SlotSet("nombre_agenda", agenda_name),
            SlotSet("duracion_texto", duracion_texto),
            SlotSet("duracion_minutos", float(duration_minutes)),
            SlotSet("awaiting_confirmation", True),
        ]


class ActionHandleChitchat(Action):
    def name(self) -> Text:
        return "action_handle_chitchat"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        count = tracker.get_slot("chitchat_count") or 0.0
        count += 1.0

        if count >= 3.0:
            dispatcher.utter_message(
                text="Esto es todo lo que puedo hacer por ahora. Si querés retomar, empezá un chat nuevo."
            )
            dispatcher.utter_message(custom={"type": "end_chat"})
            return [SlotSet("chitchat_count", count)]

        dispatcher.utter_message(
            text="Todo bien. Cuando quieras, te ayudo a agendar algo, buscar eventos o corregir una carga."
        )
        return [SlotSet("chitchat_count", count)]


class ActionHandleFallback(Action):
    def name(self) -> Text:
        return "action_handle_fallback"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        user_text = tracker.latest_message.get("text", "")
        pending_action = tracker.get_slot("pending_action")
        requested_slot = tracker.get_slot("requested_slot")
        awaiting_confirmation = tracker.get_slot("awaiting_confirmation")

        if awaiting_confirmation:
            dispatcher.utter_message(
                text="No llegué a entenderte. Si querés seguir, respondeme 'si' para confirmar, 'no' para cancelar o corregime el dato que quieras cambiar."
            )
            return [SlotSet("chitchat_count", 0.0)]

        inferred_intent = infer_basic_intent(user_text)
        if inferred_intent == "chitchat":
            return [FollowupAction("action_handle_chitchat")]

        if inferred_intent == "crear_evento":
            inferred = bootstrap_create_slots_from_text(user_text)
            return [
                SlotSet("pending_action", "create"),
                SlotSet("tipo_evento", inferred["tipo_evento"]),
                SlotSet("fecha_evento", inferred["fecha_evento"]),
                SlotSet("nombre_agenda", inferred["nombre_agenda"]),
                SlotSet("duracion_texto", inferred["duracion_texto"]),
                FollowupAction("action_validar_y_crear_evento"),
            ]

        if inferred_intent == "consultar_evento":
            return [
                SlotSet("pending_action", "query"),
                FollowupAction("action_consultar_evento"),
            ]

        if pending_action == "create" and requested_slot == "tipo_evento":
            dispatcher.utter_message(
                text="No llegué a captar el evento. Decime algo como 'parcial', 'reunión', 'gimnasio' o 'bloque de foco'."
            )
        elif pending_action == "create" and requested_slot == "fecha_evento":
            dispatcher.utter_message(
                text="No pude entender la fecha. Probá con algo como 'mañana a las 18', '10/5 a las 10' o 'el viernes a la tarde'."
            )
        elif pending_action == "create" and requested_slot == "nombre_agenda":
            dispatcher.utter_message(
                text="Decime la agenda exacta donde querés guardarlo."
            )
        else:
            dispatcher.utter_message(
                text="No terminé de entenderte. Podés pedirme que cree un evento o que consulte tu agenda."
            )

        return [SlotSet("chitchat_count", 0.0)]


class ValidateEventoForm(FormValidationAction):
    def name(self) -> Text:
        return "validate_evento_form"

    async def required_slots(
        self,
        domain_slots: List[Text],
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> List[Text]:
        slots = ["tipo_evento", "fecha_evento"]

        if not tracker.get_slot("nombre_agenda"):
            try:
                agendas = fetch_agendas()
                if len(agendas) > 1:
                    slots.append("nombre_agenda")
            except requests.RequestException:
                logger.warning("No pude consultar agendas mientras armaba el form")

        return slots

    def validate_tipo_evento(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        latest_text = tracker.latest_message.get("text", "")
        date_candidate = extract_date_candidate(latest_text)
        duration_candidate = extract_duration_text(latest_text)
        agenda_candidate = extract_agenda_name_from_text(latest_text)
        candidate = slot_value or infer_event_title_from_text(latest_text, date_candidate, duration_candidate, agenda_candidate)

        if not candidate:
            dispatcher.utter_message(
                text="No llegué a entender qué querés agendar. Decime el evento, por ejemplo 'parcial', 'reunión' o 'gimnasio'."
            )
            return {"tipo_evento": None}

        normalized = normalize_text(str(candidate))
        if normalized in GENERIC_EVENT_WORDS:
            dispatcher.utter_message(
                text="Necesito un poco más de detalle sobre el evento. Por ejemplo: 'reunión con el equipo', 'parcial de álgebra' o 'gimnasio'."
            )
            return {"tipo_evento": None}

        return {"tipo_evento": collapse_spaces(str(candidate))}

    def validate_fecha_evento(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        latest_text = tracker.latest_message.get("text", "")
        candidate = slot_value or extract_date_candidate(latest_text) or latest_text
        dt = parse_date(str(candidate))
        if not dt:
            dispatcher.utter_message(
                text="No pude entender bien la fecha. Decímela de otra forma, por ejemplo 'mañana a las 18', '10/5 a las 10' o 'el viernes a la tarde'."
            )
            return {"fecha_evento": None}
        return {"fecha_evento": collapse_spaces(str(candidate))}

    def validate_nombre_agenda(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        latest_text = tracker.latest_message.get("text", "")
        candidate = slot_value or extract_agenda_name_from_text(latest_text)
        if not candidate:
            dispatcher.utter_message(text="No pude entender el nombre de la agenda.")
            return {"nombre_agenda": None}
        return {"nombre_agenda": collapse_spaces(str(candidate))}


class ActionPrepararConfirmacion(Action):
    def name(self) -> Text:
        return "action_preparar_confirmacion"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        tipo_evento = tracker.get_slot("tipo_evento")
        fecha_evento = tracker.get_slot("fecha_evento")
        nombre_agenda = tracker.get_slot("nombre_agenda")
        duracion_texto = tracker.get_slot("duracion_texto") or extract_duration_text(tracker.latest_message.get("text", ""))

        if not tipo_evento or not fecha_evento:
            dispatcher.utter_message(text="Me faltan datos del borrador. Vamos de nuevo.")
            return clear_flow_slots()

        start_dt = parse_date(fecha_evento)
        if not start_dt:
            dispatcher.utter_message(text="La fecha me quedó ambigua. Decímela de nuevo y lo rearmamos.")
            return [
                SlotSet("pending_action", "create"),
                SlotSet("requested_slot", "fecha_evento"),
                SlotSet("awaiting_confirmation", False),
                FollowupAction("action_validar_y_crear_evento"),
            ]

        agenda_id, agenda_name, agenda_options, agenda_error = resolve_agenda_for_create(nombre_agenda)
        if agenda_error:
            dispatcher.utter_message(text=agenda_error)
            return [SlotSet("awaiting_confirmation", False)]

        if agenda_options:
            dispatcher.utter_message(
                text="Tenés varias agendas: " + ", ".join(agenda_options) + ". Decime en cuál querés guardarlo."
            )
            return [
                SlotSet("requested_slot", "nombre_agenda"),
                FollowupAction("action_validar_y_crear_evento"),
            ]

        duration_minutes = parse_duration_minutes(duracion_texto)
        if duration_minutes is None:
            duration_minutes = infer_default_duration_minutes(tipo_evento)

        dispatcher.utter_message(
            text=build_confirmation_message(tipo_evento, agenda_name, start_dt, duration_minutes)
        )
        return [
            SlotSet("pending_action", "create"),
            SlotSet("nombre_agenda", agenda_name),
            SlotSet("duracion_texto", duracion_texto),
            SlotSet("duracion_minutos", float(duration_minutes)),
            SlotSet("awaiting_confirmation", True),
        ]


class ActionConfirmarCreacionEvento(Action):
    def name(self) -> Text:
        return "action_confirmar_creacion_evento"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        if not tracker.get_slot("awaiting_confirmation"):
            dispatcher.utter_message(text="No tengo una creación pendiente para confirmar.")
            return []

        tipo_evento = tracker.get_slot("tipo_evento")
        fecha_evento = tracker.get_slot("fecha_evento")
        nombre_agenda = tracker.get_slot("nombre_agenda")
        duration_value = tracker.get_slot("duracion_minutos")

        if not tipo_evento or not fecha_evento:
            dispatcher.utter_message(text="Me faltan datos del borrador. Volvamos a intentarlo.")
            return clear_flow_slots()

        start_dt = parse_date(fecha_evento)
        if not start_dt:
            dispatcher.utter_message(text="La fecha del borrador ya no me cierra. Decímela de nuevo y lo rearmamos.")
            return clear_flow_slots() + [FollowupAction("action_validar_y_crear_evento")]

        agenda_id, agenda_name, _, agenda_error = resolve_agenda_for_create(nombre_agenda)
        if agenda_error or not agenda_id or not agenda_name:
            dispatcher.utter_message(text=agenda_error or "No pude resolver la agenda del borrador.")
            return [SlotSet("awaiting_confirmation", False)]

        event_type_id, resolved_event_type, event_type_error = resolve_event_type(tipo_evento)
        if event_type_error or not event_type_id:
            dispatcher.utter_message(text=event_type_error or "No pude resolver el tipo de evento del borrador.")
            return [SlotSet("awaiting_confirmation", False)]

        duration_minutes = int(duration_value) if duration_value else infer_default_duration_minutes(tipo_evento)
        end_dt = start_dt + timedelta(minutes=duration_minutes)
        pretty_title = beautify_title(tipo_evento)

        payload = {
            "title": pretty_title,
            "start_datetime": start_dt.isoformat(),
            "end_datetime": end_dt.isoformat(),
            "agenda_id": agenda_id,
            "event_type_id": event_type_id,
            "status": "pending",
        }

        try:
            response = requests.post(f"{API_BASE_URL}/events", json=payload, timeout=5)
            response.raise_for_status()
            dispatcher.utter_message(
                text=(
                    f"Listo, agendé '{pretty_title}' para el {format_datetime(start_dt)} "
                    f"en la agenda '{agenda_name}' con una duración de {format_duration(duration_minutes)}."
                )
            )
            return clear_flow_slots()
        except requests.exceptions.ConnectionError:
            logger.exception("Agenda API is unreachable while creating event")
            dispatcher.utter_message(
                text="No pude conectarme con el backend para guardar el evento. Mantengo el borrador por si querés volver a confirmarlo."
            )
            return [SlotSet("awaiting_confirmation", True)]
        except requests.RequestException as exc:
            logger.exception("Agenda API returned an error while creating event")
            dispatcher.utter_message(
                text=f"El backend rechazó la creación del evento: {exc}. Corregime el dato que quieras o decime 'no' para cancelarlo."
            )
            return [SlotSet("awaiting_confirmation", True)]


class ActionCancelarOperacion(Action):
    def name(self) -> Text:
        return "action_cancelar_operacion"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        if tracker.active_loop or tracker.get_slot("awaiting_confirmation"):
            dispatcher.utter_message(text="Perfecto, cancelé el borrador actual. Cuando quieras arrancamos de nuevo.")
            return clear_flow_slots() + [ActiveLoop(None)]

        dispatcher.utter_message(text="No había ninguna operación en curso para cancelar.")
        return []


class ActionConsultarEvento(Action):
    def name(self) -> Text:
        return "action_consultar_evento"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        latest_text = tracker.latest_message.get("text", "")
        current_entities = tracker.latest_message.get("entities", [])
        entity_map: Dict[str, str] = {}
        for entity in current_entities:
            entity_name = entity.get("entity")
            value = entity.get("value")
            if entity_name and value and entity_name not in entity_map:
                entity_map[entity_name] = str(value)

        active_loop_name = tracker.active_loop.get("name") if tracker.active_loop else None
        if active_loop_name == "evento_form":
            fecha_evento = entity_map.get("fecha") or extract_date_candidate(latest_text)
            tipo_evento = entity_map.get("tipo_evento") or extract_query_type(latest_text)
            nombre_agenda = entity_map.get("nombre_agenda") or extract_agenda_name_from_text(latest_text)
        else:
            fecha_evento = tracker.get_slot("fecha_evento") or entity_map.get("fecha") or extract_date_candidate(latest_text)
            tipo_evento = tracker.get_slot("tipo_evento") or entity_map.get("tipo_evento") or extract_query_type(latest_text)
            nombre_agenda = tracker.get_slot("nombre_agenda") or entity_map.get("nombre_agenda") or extract_agenda_name_from_text(latest_text)

        if not any([fecha_evento, tipo_evento, nombre_agenda]):
            dispatcher.utter_message(
                text="Decime al menos una pista para buscar: una fecha, un tipo de evento o una agenda."
            )
            return clear_flow_slots() + [ActiveLoop(None)]

        params: Dict[str, Any] = {}
        filters: List[str] = []

        if fecha_evento:
            start_dt, end_dt, description = resolve_query_range(fecha_evento)
            if not start_dt or not end_dt:
                dispatcher.utter_message(
                    text="No pude entender la fecha de la consulta. Probá con algo como 'mañana', 'el viernes' o 'esta semana'."
                )
                return clear_flow_slots() + [ActiveLoop(None)]
            params["from_dt"] = start_dt.isoformat()
            params["to_dt"] = end_dt.isoformat()
            if description:
                filters.append(description)

        if nombre_agenda:
            agenda_id, resolved_agenda, agenda_error = resolve_agenda_for_query(nombre_agenda)
            if agenda_error:
                dispatcher.utter_message(text=agenda_error)
                return clear_flow_slots() + [ActiveLoop(None)]

            params["agenda_id"] = agenda_id
            filters.append(f"en la agenda '{resolved_agenda}'")

        if tipo_evento:
            filters.append(f"relacionado con '{tipo_evento}'")

        try:
            eventos = fetch_events(params)

            if tipo_evento:
                eventos = [evento for evento in eventos if event_matches_query(evento, tipo_evento)]

            description = build_search_description(filters)
            if not eventos:
                dispatcher.utter_message(text=f"No encontré nada para {description}.")
                return clear_flow_slots() + [ActiveLoop(None)]

            message_lines = [f"Esto encontré para {description}:"]
            for evento in sorted(eventos, key=lambda item: item["start_datetime"]):
                start_str = evento["start_datetime"].replace("Z", "")
                start_dt = datetime.fromisoformat(start_str)
                agenda = evento.get("agenda") or {}
                agenda_suffix = f" en {agenda.get('name')}" if agenda.get("name") else ""
                message_lines.append(f"- {evento['title']} a las {start_dt.strftime('%H:%M')}{agenda_suffix}")

            dispatcher.utter_message(text="\n".join(message_lines))
        except requests.exceptions.ConnectionError:
            logger.exception("Agenda API is unreachable while querying events")
            dispatcher.utter_message(text="El backend está caído y no puedo revisar tu agenda en este momento.")
        except requests.RequestException as exc:
            logger.exception("Agenda API returned an error while querying events")
            dispatcher.utter_message(text=f"Hubo un error al consultar tu agenda: {exc}")

        return clear_flow_slots() + [ActiveLoop(None)]
