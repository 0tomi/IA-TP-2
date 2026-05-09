import logging
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Text

import dateparser
import requests
from dotenv import load_dotenv

import json

from rasa_sdk import Action, Tracker, FormValidationAction
from rasa_sdk.events import SlotSet, FollowupAction, ActiveLoop
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.types import DomainDict

try:
    import google.generativeai as genai
except ImportError:
    genai = None

load_dotenv()

logger = logging.getLogger(__name__)

API_BASE_URL = os.getenv("AGENDA_API_URL", "http://localhost:8000")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY")

if GEMINI_API_KEY and genai:
    genai.configure(api_key=GEMINI_API_KEY)



def clear_flow_slots() -> List[SlotSet]:
    return [
        SlotSet("tipo_evento", None),
        SlotSet("nombre_evento", None),
        SlotSet("fecha_evento", None),
        SlotSet("nombre_agenda", None),
        SlotSet("duracion_texto", None),
        SlotSet("duracion_minutos", None),
        SlotSet("awaiting_confirmation", False),
        SlotSet("pending_action", None),
    ]


def fallback_parse_date_with_llm(date_str: str) -> Optional[datetime]:
    """Usa un LLM (Gemini o Minimax) para parsear fechas coloquiales."""
    today = datetime.now()
    prompt = (
        f"Hoy es {today.strftime('%Y-%m-%d %H:%M:%S')} (Día de la semana: {today.strftime('%A')}). "
        f"El usuario ingresó esta expresión de tiempo: '{date_str}'. "
        "Devolvé ÚNICAMENTE la fecha y hora correspondiente en formato ISO 8601 (YYYY-MM-DDTHH:MM:SS). "
        "No des explicaciones, ni texto adicional, solo el string ISO."
    )

    try:
        if GEMINI_API_KEY and genai:
            model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            result = response.text.strip()
            # A veces los LLMs ponen backticks
            result = result.replace("`", "").strip()
            return datetime.fromisoformat(result)
        elif MINIMAX_API_KEY:
            # Encubriendo Minimax a través de su API REST (OpenAI compatible)
            headers = {
                "Authorization": f"Bearer {MINIMAX_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "minimax-text-01", # Asumimos un modelo válido de Minimax
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1
            }
            # Cambiar por la URL real de Minimax según su doc actual
            resp = requests.post("https://api.minimax.chat/v1/text/chatcompletion_v2", json=payload, headers=headers, timeout=10)
            if resp.ok:
                result = resp.json()["choices"][0]["message"]["content"].strip()
                result = result.replace("`", "").strip()
                return datetime.fromisoformat(result)
    except Exception as e:
        logger.error(f"Fallo el parseo de LLM para la fecha '{date_str}': {e}")
    
    return None

def fallback_intent_with_llm(user_text: str) -> Optional[dict]:
    """Usa el LLM como clasificador de intenciones fallback avanzado."""
    prompt = (
        "Sos el asistente virtual de una agenda personal. El NLU tradicional no entendió esto: "
        f"'{user_text}'.\n\n"
        "Clasificá la intención y extraé datos. "
        "Respondé ÚNICAMENTE un JSON válido con esta estructura, sin markdown ni comillas triples:\n"
        "{\n"
        '  "intent": "crear_evento" | "consultar_evento" | "chitchat" | "desconocido",\n'
        '  "entities": {\n'
        '    "tipo_evento": "...",\n'
        '    "fecha_evento": "...",\n'
        '    "nombre_agenda": "..."\n'
        "  }\n"
        "}"
    )

    try:
        if GEMINI_API_KEY and genai:
            model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            result = response.text.strip()
            result = result.replace("```json", "").replace("```", "").strip()
            return json.loads(result)
        elif MINIMAX_API_KEY:
            headers = {"Authorization": f"Bearer {MINIMAX_API_KEY}", "Content-Type": "application/json"}
            payload = {"model": "minimax-text-01", "messages": [{"role": "user", "content": prompt}], "temperature": 0.1}
            resp = requests.post("https://api.minimax.chat/v1/text/chatcompletion_v2", json=payload, headers=headers, timeout=10)
            if resp.ok:
                result = resp.json()["choices"][0]["message"]["content"].strip()
                result = result.replace("```json", "").replace("```", "").strip()
                return json.loads(result)
    except Exception as e:
        logger.error(f"Fallo el intent classification LLM para '{user_text}': {e}")
    
    return None

def extract_type_and_name(user_text: str, available_types: List[str]) -> Optional[tuple]:
    """Separa la categoría del tipo de evento del nombre específico usando LLM.

    Solo se invoca si hay un LLM configurado. Si no, retorna None y el
    llamador usa el texto tal cual (comportamiento original).
    """
    if not ((GEMINI_API_KEY and genai) or MINIMAX_API_KEY):
        return None

    types_str = ", ".join(available_types) if available_types else "ninguno registrado aún"
    prompt = (
        f"El usuario quiere agendar algo y respondió: '{user_text}'.\n"
        f"Tipos de evento disponibles: {types_str}.\n\n"
        "Tarea:\n"
        "1. CATEGORÍA (tipo): si coincide con uno disponible úsalo tal cual; "
        "sino usá una categoría corta de 1-2 palabras.\n"
        "2. NOMBRE (título): la descripción completa y específica que usó el usuario.\n\n"
        "Respondé ÚNICAMENTE JSON válido sin markdown:\n"
        '{"tipo": "parcial", "nombre": "Parcial de Algoritmos"}'
    )

    try:
        if GEMINI_API_KEY and genai:
            model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            result = response.text.strip().replace("```json", "").replace("```", "").strip()
            data = json.loads(result)
            tipo = data.get("tipo", "").strip()
            nombre = data.get("nombre", "").strip()
            if tipo and nombre:
                return tipo, nombre
        elif MINIMAX_API_KEY:
            headers = {"Authorization": f"Bearer {MINIMAX_API_KEY}", "Content-Type": "application/json"}
            payload = {"model": "minimax-text-01", "messages": [{"role": "user", "content": prompt}], "temperature": 0.1}
            resp = requests.post("https://api.minimax.chat/v1/text/chatcompletion_v2", json=payload, headers=headers, timeout=10)
            if resp.ok:
                result = resp.json()["choices"][0]["message"]["content"].strip()
                result = result.replace("```json", "").replace("```", "").strip()
                data = json.loads(result)
                tipo = data.get("tipo", "").strip()
                nombre = data.get("nombre", "").strip()
                if tipo and nombre:
                    return tipo, nombre
    except Exception as e:
        logger.error(f"Fallo extract_type_and_name para '{user_text}': {e}")

    return None


def extract_correction_from_denial(user_text: str) -> Optional[dict]:
    """Detecta si un deny incluye datos de corrección del borrador.

    Retorna un dict con los campos a actualizar, o None si es un rechazo
    puro o si no hay LLM disponible.
    """
    if not ((GEMINI_API_KEY and genai) or MINIMAX_API_KEY):
        return None

    prompt = (
        f"El usuario está revisando un borrador de evento y respondió: '{user_text}'.\n"
        "Detectá si el mensaje incluye datos para CORREGIR el borrador "
        "(fecha/hora, tipo de evento, agenda, duración).\n"
        "Si es solo un rechazo sin datos ('no', 'mejor no', 'cancelalo') respondé null.\n"
        "Si hay corrección, devolvé solo los campos que cambian (omitir los que no se mencionan):\n"
        '{"fecha_evento": "...", "tipo_evento": "...", "nombre_evento": "...", '
        '"nombre_agenda": "...", "duracion_texto": "..."}\n'
        "Respondé ÚNICAMENTE JSON válido sin markdown, o la palabra null."
    )

    try:
        if GEMINI_API_KEY and genai:
            model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            result = response.text.strip().replace("```json", "").replace("```", "").strip()
            if result.lower() == "null":
                return None
            return json.loads(result)
        elif MINIMAX_API_KEY:
            headers = {"Authorization": f"Bearer {MINIMAX_API_KEY}", "Content-Type": "application/json"}
            payload = {"model": "minimax-text-01", "messages": [{"role": "user", "content": prompt}], "temperature": 0.1}
            resp = requests.post("https://api.minimax.chat/v1/text/chatcompletion_v2", json=payload, headers=headers, timeout=10)
            if resp.ok:
                result = resp.json()["choices"][0]["message"]["content"].strip()
                result = result.replace("```json", "").replace("```", "").strip()
                if result.lower() == "null":
                    return None
                return json.loads(result)
    except Exception as e:
        logger.error(f"Fallo extract_correction_from_denial para '{user_text}': {e}")

    return None


_DAYS_ES = r"lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo"


def _normalize_date_input(text: str) -> str:
    """Normaliza expresiones de fecha/hora en español rioplatense antes de dateparser.

    Cubre: sufijo 'hs'/'h', horas en 24h sin minutos, artículos antes de días.
    """
    text = text.lower()
    text = text.replace("pasado mañana", "en 2 dias").replace("pasado manana", "en 2 dias")
    # '20:30hs' → '20:30' | '20hs' → '20:00'
    text = re.sub(r"(\d{1,2}):(\d{2})\s*hs?\b", r"\1:\2", text)
    text = re.sub(r"(\d{1,2})\s*hs?\b", r"\1:00", text)
    # 'las 20' → 'las 20:00' (hora en 24h sin minutos)
    text = re.sub(r"\blas\s+(\d{1,2})\b(?!:\d)", r"las \1:00", text)
    # 'el (próximo) viernes' → 'viernes'  (dateparser resuelve mejor sin artículo)
    text = re.sub(r"\bel\s+(?:pr[oó]ximo\s+)?(" + _DAYS_ES + r")\b", r"\1", text)
    text = re.sub(r"\bpr[oó]ximo\s+(" + _DAYS_ES + r")\b", r"\1", text)
    # 'el 15/05' o 'el 15-05' → '15/05'  (artículo antes de DD/MM confunde dateparser)
    text = re.sub(r"\bel\s+(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?)\b", r"\1", text)
    return text


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None

    text = _normalize_date_input(date_str)

    parsed_date = dateparser.parse(
        text,
        languages=["es"],
        settings={"PREFER_DATES_FROM": "future"},
    )

    if not parsed_date:
        parsed_date = fallback_parse_date_with_llm(date_str)

    return parsed_date


def parse_duration_minutes(duration_text: Optional[str]) -> Optional[int]:
    if not duration_text:
        return None

    text = duration_text.lower().strip()

    if text in {"media hora", "media"}:
        return 30

    hour_match = re.search(r"(\d+)\s*(hora|horas|h|hs)", text)
    minute_match = re.search(r"(\d+)\s*(min|mins|minuto|minutos)", text)

    total = 0
    if hour_match:
        total += int(hour_match.group(1)) * 60
    if minute_match:
        total += int(minute_match.group(1))
    if "hora y media" in text or "hora y media" in text.replace("  ", " "):
        if hour_match:
            total += 30
        else:
            total = 90

    if total > 0:
        return total

    raw_number = re.fullmatch(r"\d+", text)
    if raw_number:
        return int(raw_number.group(0))

    return None


def infer_default_duration_minutes(tipo_evento: str) -> int:
    normalized = tipo_evento.lower()

    if any(term in normalized for term in ["parcial", "final", "examen", "recuperatorio"]):
        return 120
    if any(term in normalized for term in ["cumple", "cumpleanos", "cumpleaños", "partido"]):
        return 180
    if any(term in normalized for term in ["recordatorio", "pago", "lavar el auto"]):
        return 15
    if any(term in normalized for term in ["turno", "dentista", "medico", "médico", "psicologo", "psicólogo"]):
        return 60
    if any(term in normalized for term in ["reunion", "reunión", "clase", "consulta", "entrenamiento", "sesion", "sesión"]):
        return 60

    return 60


def format_duration(minutes: int) -> str:
    hours, remainder = divmod(minutes, 60)
    if hours and remainder:
        return f"{hours}h {remainder}m"
    if hours:
        return f"{hours}h"
    return f"{remainder}m"


def format_datetime(dt: datetime) -> str:
    return dt.strftime("%d/%m a las %H:%M")


def fetch_agendas() -> List[Dict[str, Any]]:
    response = requests.get(f"{API_BASE_URL}/agendas", timeout=5)
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
            for agenda in agendas:
                if agenda["name"].lower() == name.lower():
                    return agenda["id"], agenda["name"], None, None

            create_resp = requests.post(
                f"{API_BASE_URL}/agendas",
                json={"name": name.capitalize()},
                timeout=5,
            )
            create_resp.raise_for_status()
            payload = create_resp.json()
            return payload["id"], payload["name"], None, None

        if not agendas:
            create_resp = requests.post(
                f"{API_BASE_URL}/agendas",
                json={"name": "Agenda Principal"},
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
        for agenda in agendas:
            if agenda["name"].lower() == name.lower():
                return agenda["id"], agenda["name"], None

        return None, None, f"No encontré una agenda llamada '{name}'."
    except requests.exceptions.ConnectionError:
        logger.exception("Agenda API is unreachable while resolving agenda for query")
        return None, None, "No pude conectarme con el backend para buscar esa agenda."
    except requests.RequestException as exc:
        logger.exception("Agenda API returned an error while resolving agenda for query")
        return None, None, f"Hubo un problema al buscar la agenda: {exc}"


def resolve_event_type(name: str, create_if_missing: bool) -> tuple[Optional[int], Optional[str], Optional[str]]:
    try:
        event_types = fetch_event_types()
        for event_type in event_types:
            if event_type["name"].lower() == name.lower():
                return event_type["id"], event_type["name"], None

        if not create_if_missing:
            return None, None, f"No encontré un tipo de evento llamado '{name}'."

        create_resp = requests.post(
            f"{API_BASE_URL}/event-types",
            json={"name": name.capitalize()},
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


def build_full_event_name(tipo_evento: Optional[str], nombre_evento: Optional[str]) -> str:
    """Construye el título completo del evento.

    Si DIET extrajo nombre_evento como el sufijo específico ('de algoritmos 2',
    'con el cliente'), lo combina con el tipo. Si nombre_evento ya contiene
    el tipo como prefijo, lo usa directamente.
    """
    tipo = (tipo_evento or "").strip()
    nombre = (nombre_evento or "").strip()

    if not nombre:
        return tipo.capitalize()
    if not tipo or nombre.lower().startswith(tipo.lower()):
        return nombre.capitalize()
    return f"{tipo.capitalize()} {nombre}"


def build_confirmation_message(
    nombre_evento: str,
    tipo_evento: str,
    agenda_name: str,
    start_dt: datetime,
    duration_minutes: int,
) -> str:
    tipo_suffix = f" (tipo: {tipo_evento})" if tipo_evento.lower() != nombre_evento.lower() else ""
    return (
        f"Quedaria asi: '{nombre_evento}'{tipo_suffix} "
        f"el {format_datetime(start_dt)} en la agenda '{agenda_name}' "
        f"con una duracion estimada de {format_duration(duration_minutes)}. "
        "Decime 'si' para confirmarlo, 'no' para cancelarlo o corregime algun dato."
    )


def build_search_description(filters: List[str]) -> str:
    if not filters:
        return "esa busqueda"
    if len(filters) == 1:
        return filters[0]
    return ", ".join(filters[:-1]) + f" y {filters[-1]}"


def latest_intent_name(tracker: Tracker) -> str:
    intent = tracker.latest_message.get("intent") or {}
    return intent.get("name", "")


def latest_entities(tracker: Tracker) -> Dict[str, Any]:
    entities: Dict[str, Any] = {}
    for entity in tracker.latest_message.get("entities", []):
        name = entity.get("entity")
        value = entity.get("value")
        if name and value:
            entities[name] = value
    return entities


def is_empty_or_noise(value: Any) -> bool:
    if value is None:
        return True
    text = str(value).strip().lower()
    return text in {"", "hola", "buenas", "chau", "adios", "no", "si", "sí", "ok", "dale", "cancelar", "cancela"}


def is_generic_event_type(value: Any) -> bool:
    if value is None:
        return False
    text = str(value).strip().lower()
    return text in {"evento", "eventos", "cosa", "cosas", "algo"}


def is_generic_event_request(value: Any, tracker: Tracker) -> bool:
    """Detecta cuando el form toma toda la frase como tipo de evento.

    Si el usuario dice "agendame un evento para mañana", queremos pedir un
    tipo concreto. En algunos modelos Rasa puede no extraer `tipo_evento` y el
    mapping `from_text` del slot pedido podría pasar la frase completa como
    candidato a `tipo_evento`.
    """
    if value is None:
        return False

    entities = latest_entities(tracker)
    if entities.get("tipo_evento"):
        return False

    text = str(value).strip().lower()
    return bool(re.search(r"\b(evento|eventos|cosa|cosas|algo)\b", text))


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

        active_loop_name = (tracker.active_loop or {}).get("name")

        if count >= 3.0:
            dispatcher.utter_message(
                text="Esto es todo lo que puedo hacer por ahora. Si querés retomar, empezá un chat nuevo."
            )
            dispatcher.utter_message(custom={"type": "end_chat"})
            events: List[Dict[Text, Any]] = [SlotSet("chitchat_count", count)]
            if active_loop_name:
                events.append(ActiveLoop(None))
            return events

        dispatcher.utter_message(
            text="Todo bien. Cuando quieras, te ayudo a agendar algo, buscar eventos o corregir una carga."
        )
        events = [SlotSet("chitchat_count", count)]
        if active_loop_name:
            events.append(FollowupAction(active_loop_name))
        return events


class ActionHandleFallback(Action):
    def name(self) -> Text:
        return "action_handle_fallback"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        pending_action = tracker.get_slot("pending_action")
        requested_slot = tracker.get_slot("requested_slot")
        awaiting_confirmation = tracker.get_slot("awaiting_confirmation")
        active_loop_name = (tracker.active_loop or {}).get("name")
        is_creating = pending_action == "create" or active_loop_name == "evento_form"

        if awaiting_confirmation:
            dispatcher.utter_message(
                text="No llegue a entenderte. Si queres seguir, respondeme 'si' para confirmar, 'no' para cancelar o corregime el dato que quieras cambiar."
            )
        elif is_creating and requested_slot == "tipo_evento":
            dispatcher.utter_message(
                text="No llegue a captar el tipo de evento. Decime algo como 'parcial', 'reunion' o 'turno medico'."
            )
        elif is_creating and requested_slot == "fecha_evento":
            dispatcher.utter_message(
                text="No pude entender la fecha. Decimela de otra forma, por ejemplo 'manana a las 18' o 'el viernes a las 9'."
            )
        elif is_creating and requested_slot == "nombre_agenda":
            dispatcher.utter_message(
                text="Decime el nombre exacto de la agenda donde queres guardarlo."
            )
        elif is_creating and requested_slot == "duracion_texto":
            dispatcher.utter_message(
                text="No entendi la duracion. Podes decirme algo como '30 minutos' o '2 horas'."
            )
        else:
            user_text = tracker.latest_message.get('text', '')
            llm_result = fallback_intent_with_llm(user_text)

            if llm_result:
                intent = llm_result.get("intent")
                
                if intent == "chitchat":
                    return [FollowupAction("action_handle_chitchat")]
                
                elif intent == "crear_evento":
                    slots = [SlotSet("pending_action", "create")]
                    for k, v in llm_result.get("entities", {}).items():
                        if v and v != "...":
                            slots.append(SlotSet(k, v))
                    slots.append(FollowupAction("evento_form"))
                    return slots
                
                elif intent == "consultar_evento":
                    slots = [SlotSet("pending_action", "query")]
                    for k, v in llm_result.get("entities", {}).items():
                        if v and v != "...":
                            slots.append(SlotSet(k, v))
                    slots.append(FollowupAction("action_consultar_evento"))
                    return slots
                
                    return slots
                
                elif intent == "desconocido":
                    dispatcher.utter_message(
                        text="No termine de entenderte. Podes pedirme que cree un evento o consulte tu agenda."
                    )
                    return [SlotSet("chitchat_count", 0.0)]

            # Fallback final si falla el LLM o no devuelve algo útil
            dispatcher.utter_message(
                text="No termine de entenderte. Podes pedirme que cree un evento, consulte tu agenda o corregir el borrador que venimos armando."
            )

        events: List[Dict[Text, Any]] = [SlotSet("chitchat_count", 0.0)]
        if active_loop_name:
            events.append(FollowupAction(active_loop_name))
        return events


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

        # Pedir nombre solo si el LLM no lo diferenció del tipo
        tipo_evento = tracker.get_slot("tipo_evento")
        nombre_evento = tracker.get_slot("nombre_evento")
        if tipo_evento and (not nombre_evento or nombre_evento.lower() == tipo_evento.lower()):
            slots.append("nombre_evento")

        # Pedir agenda solo si hay más de una disponible
        nombre_agenda = tracker.get_slot("nombre_agenda")
        if not nombre_agenda:
            try:
                agendas = fetch_agendas()
                if len(agendas) > 1:
                    slots.append("nombre_agenda")
            except Exception:
                pass

        return slots

    def validate_tipo_evento(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        intent = latest_intent_name(tracker)
        if intent in {"chitchat", "cancelar", "deny", "consultar_evento"} or is_empty_or_noise(slot_value):
            dispatcher.utter_message(
                text="No llegué a captar el tipo de evento. Decime algo como 'parcial', 'reunión' o 'turno médico'."
            )
            return {"tipo_evento": None}
        if is_generic_event_type(slot_value) or is_generic_event_request(slot_value, tracker):
            dispatcher.utter_message(
                text="Dale, ¿qué tipo de evento querés agendar? Por ejemplo: parcial, reunión, dentista o cumpleaños."
            )
            return {"tipo_evento": None}

        clean_value = str(slot_value).strip()

        # Si DIET ya extrajo nombre_evento vía entidad, no llamamos al LLM
        if tracker.get_slot("nombre_evento"):
            return {"tipo_evento": clean_value}

        try:
            available_types = [et["name"] for et in fetch_event_types()]
        except Exception:
            available_types = []

        llm_result = extract_type_and_name(clean_value, available_types)
        if llm_result:
            tipo, nombre = llm_result
            return {"tipo_evento": tipo, "nombre_evento": nombre}

        # Sin LLM: el texto completo como tipo (nombre se pedirá por form)
        return {"tipo_evento": clean_value}

    def validate_nombre_evento(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        tipo = tracker.get_slot("tipo_evento") or ""
        intent = latest_intent_name(tracker)
        # '.' o ruido → usar el tipo como nombre por defecto
        if intent in {"chitchat", "cancelar", "consultar_evento"} or is_empty_or_noise(slot_value):
            return {"nombre_evento": tipo.capitalize()}
        clean = str(slot_value).strip()
        if clean == ".":
            return {"nombre_evento": tipo.capitalize()}
        return {"nombre_evento": clean}

    def validate_nombre_agenda(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        if is_empty_or_noise(slot_value):
            dispatcher.utter_message(text="Decime el nombre de la agenda donde querés guardarlo.")
            return {"nombre_agenda": None}

        name = str(slot_value).strip()
        try:
            agendas = fetch_agendas()
        except Exception:
            # Si el backend no está disponible, no bloqueamos el form: la acción final mostrará el error real.
            return {"nombre_agenda": name}

        if not agendas:
            return {"nombre_agenda": name}

        for agenda in agendas:
            if agenda["name"].lower() == name.lower():
                return {"nombre_agenda": agenda["name"]}

        available = ", ".join(agenda["name"] for agenda in agendas)
        dispatcher.utter_message(
            text=f"No encontré una agenda llamada '{name}'. Las disponibles son: {available}."
        )
        return {"nombre_agenda": None}

    def validate_duracion_texto(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        if not slot_value:
            return {"duracion_texto": None}
        if parse_duration_minutes(str(slot_value)) is None:
            dispatcher.utter_message(
                text="No pude interpretar esa duración. Si querés, decime algo como '30 minutos' o '2 horas'."
            )
            return {"duracion_texto": None}
        return {"duracion_texto": str(slot_value).strip()}

    def validate_fecha_evento(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        intent = latest_intent_name(tracker)
        if intent in {"chitchat", "cancelar", "deny", "consultar_evento"} or is_empty_or_noise(slot_value):
            dispatcher.utter_message(text="No pude entender bien la fecha. Decímela de otra forma, por ejemplo 'mañana a las 18'.")
            return {"fecha_evento": None}

        dt = parse_date(str(slot_value))
        if not dt:
            dispatcher.utter_message(text="No pude entender bien la fecha. Decímela de otra forma, por ejemplo 'mañana a las 18'.")
            return {"fecha_evento": None}
        if dt < datetime.now() - timedelta(minutes=5):
            dispatcher.utter_message(text="Esa fecha parece estar en el pasado. Decime una fecha futura, por ejemplo 'mañana a las 18'.")
            return {"fecha_evento": None}
        return {"fecha_evento": str(slot_value).strip()}


class ValidateConsultaForm(FormValidationAction):
    def name(self) -> Text:
        return "validate_consulta_form"

    async def required_slots(
        self,
        domain_slots: List[Text],
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> List[Text]:
        entities = latest_entities(tracker)
        if entities.get("fecha") or tracker.get_slot("fecha_evento"):
            return []
        return ["fecha_evento"]

    def validate_fecha_evento(
        self,
        slot_value: Any,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: DomainDict,
    ) -> Dict[Text, Any]:
        if is_empty_or_noise(slot_value):
            dispatcher.utter_message(text="Decime para qué día querés consultar, por ejemplo 'hoy', 'mañana' o 'el viernes'.")
            return {"fecha_evento": None}
        dt = parse_date(str(slot_value))
        if not dt:
            dispatcher.utter_message(text="No pude entender la fecha de la consulta. Probá con algo como 'mañana' o 'el viernes'.")
            return {"fecha_evento": None}
        return {"fecha_evento": str(slot_value).strip()}


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
        duracion_texto = tracker.get_slot("duracion_texto")

        if not tipo_evento or not fecha_evento:
            dispatcher.utter_message(text="Me faltan datos para armar el borrador. Decime qué evento querés crear y para cuándo.")
            return [SlotSet("awaiting_confirmation", False), FollowupAction("evento_form")]

        start_dt = parse_date(fecha_evento)
        if not start_dt:
            dispatcher.utter_message(text="No pude interpretar la fecha del borrador. Decimela de otra forma, por ejemplo 'mañana a las 18'.")
            return [SlotSet("fecha_evento", None), SlotSet("awaiting_confirmation", False), FollowupAction("evento_form")]

        agenda_id, agenda_name, _, agenda_error = resolve_agenda_for_create(nombre_agenda)
        if agenda_error:
            dispatcher.utter_message(text=agenda_error)
            return [SlotSet("awaiting_confirmation", False)]

        duration_minutes = None
        if duracion_texto:
            duration_minutes = parse_duration_minutes(duracion_texto)
            if duration_minutes is None:
                dispatcher.utter_message(text="No pude interpretar la duración. Asumiré la duración por defecto.")

        if duration_minutes is None:
            duration_minutes = infer_default_duration_minutes(tipo_evento)

        nombre_evento = tracker.get_slot("nombre_evento")
        full_name = build_full_event_name(tipo_evento, nombre_evento)
        dispatcher.utter_message(
            text=build_confirmation_message(full_name, tipo_evento, agenda_name, start_dt, duration_minutes)
        )
        return [
            SlotSet("awaiting_confirmation", True),
            SlotSet("nombre_agenda", agenda_name),
            SlotSet("duracion_minutos", float(duration_minutes)),
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
            dispatcher.utter_message(text="No tengo una creacion pendiente para confirmar.")
            return []

        tipo_evento = tracker.get_slot("tipo_evento")
        fecha_evento = tracker.get_slot("fecha_evento")
        nombre_agenda = tracker.get_slot("nombre_agenda")
        duration_value = tracker.get_slot("duracion_minutos")

        if not tipo_evento or not fecha_evento:
            dispatcher.utter_message(text="Me faltan datos del borrador. Volvamos a intentarlo desde el principio.")
            return clear_flow_slots()

        start_dt = parse_date(fecha_evento)
        if not start_dt:
            dispatcher.utter_message(text="La fecha del borrador ya no me cierra. Decimela de nuevo y lo rearmamos.")
            return [
                SlotSet("pending_action", "create"),
                SlotSet("requested_slot", "fecha_evento"),
                SlotSet("awaiting_confirmation", False),
            ]

        agenda_id, agenda_name, _, agenda_error = resolve_agenda_for_create(nombre_agenda)
        if agenda_error or not agenda_id or not agenda_name:
            dispatcher.utter_message(text=agenda_error or "No pude resolver la agenda del borrador.")
            return [SlotSet("awaiting_confirmation", False)]

        event_type_id, resolved_event_type, event_type_error = resolve_event_type(tipo_evento, create_if_missing=True)
        if event_type_error or not event_type_id:
            dispatcher.utter_message(text=event_type_error or "No pude resolver el tipo de evento del borrador.")
            return [SlotSet("awaiting_confirmation", False)]

        nombre_evento_slot = tracker.get_slot("nombre_evento")
        nombre_evento = build_full_event_name(tipo_evento, nombre_evento_slot) if nombre_evento_slot else resolved_event_type
        duration_minutes = int(duration_value) if duration_value else infer_default_duration_minutes(tipo_evento)
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        payload = {
            "title": nombre_evento,
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
                    f"Listo, agende '{nombre_evento}' para el {format_datetime(start_dt)} "
                    f"en la agenda '{agenda_name}' con una duracion de {format_duration(duration_minutes)}."
                )
            )
            return clear_flow_slots()
        except requests.exceptions.ConnectionError:
            logger.exception("Agenda API is unreachable while creating event")
            dispatcher.utter_message(
                text="No pude conectarme con el backend para guardar el evento. Mantengo el borrador por si queres volver a confirmarlo."
            )
            return [SlotSet("awaiting_confirmation", True)]
        except requests.RequestException as exc:
            logger.exception("Agenda API returned an error while creating event")
            dispatcher.utter_message(
                text=f"El backend rechazo la creacion del evento: {exc}. Corregime el dato que quieras o decime 'no' para cancelarlo."
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
            dispatcher.utter_message(text="Perfecto, cancele el borrador actual. Cuando quieras arrancamos de nuevo.")
            return clear_flow_slots() + [ActiveLoop(None)]

        dispatcher.utter_message(text="No habia ninguna operacion en curso para cancelar.")
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
        # Si hay un form activo (se rompió/canceló implícitamente al pedir otra cosa),
        # priorizamos el mensaje actual.
        current_entities = latest_entities(tracker)
        active_loop_name = (tracker.active_loop or {}).get("name")
        interrupted_creation = active_loop_name == "evento_form"

        def finish_query_events() -> List[Dict[Text, Any]]:
            events = clear_flow_slots()
            if interrupted_creation:
                events.append(ActiveLoop(None))
            return events

        # Para consultas priorizamos SIEMPRE las entidades del mensaje actual.
        # Usar slots globales de creación acá contamina consultas nuevas con datos viejos
        # (por ejemplo, tipo_evento="evento" de un intento anterior de creación).
        fecha_evento = current_entities.get("fecha")
        tipo_evento = current_entities.get("tipo_evento")
        nombre_agenda = current_entities.get("nombre_agenda")

        if not fecha_evento and (tracker.active_loop or {}).get("name") == "consulta_form":
            fecha_evento = tracker.get_slot("fecha_evento")

        if is_generic_event_type(tipo_evento):
            tipo_evento = None

        if not any([fecha_evento, tipo_evento, nombre_agenda]):
            dispatcher.utter_message(
                text="Dale, dejo de lado la carga actual y pasamos a consultar tu agenda." if interrupted_creation else "Dale, consultemos tu agenda."
            )
            return finish_query_events() + [SlotSet("pending_action", "query"), FollowupAction("consulta_form")]

        params: Dict[str, Any] = {}
        filters: List[str] = []

        if fecha_evento:
            dt = parse_date(fecha_evento)
            if not dt:
                dispatcher.utter_message(
                    text="No pude entender la fecha de la consulta. Decimela de otra forma, por ejemplo 'manana' o 'el viernes'."
                )
                return [SlotSet("fecha_evento", None), SlotSet("pending_action", "query"), FollowupAction("consulta_form")]

            start_dt = dt.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = dt.replace(hour=23, minute=59, second=59, microsecond=999999)
            params["from_dt"] = start_dt.isoformat()
            params["to_dt"] = end_dt.isoformat()
            filters.append(f"el {dt.strftime('%d/%m')}")

        if tipo_evento:
            event_type_id, resolved_event_type, event_type_error = resolve_event_type(tipo_evento, create_if_missing=False)
            if event_type_error:
                dispatcher.utter_message(text=event_type_error)
                return finish_query_events()

            params["event_type_id"] = event_type_id
            filters.append(f"del tipo '{resolved_event_type}'")

        if nombre_agenda:
            agenda_id, resolved_agenda, agenda_error = resolve_agenda_for_query(nombre_agenda)
            if agenda_error:
                dispatcher.utter_message(text=agenda_error)
                return finish_query_events()

            params["agenda_id"] = agenda_id
            filters.append(f"en la agenda '{resolved_agenda}'")

        try:
            response = requests.get(f"{API_BASE_URL}/events", params=params, timeout=5)
            response.raise_for_status()
            eventos = response.json()

            description = build_search_description(filters)
            if not eventos:
                dispatcher.utter_message(text=f"No encontre nada para {description}.")
                return finish_query_events()

            message_lines = [f"Esto encontre para {description}:"]
            for evento in eventos:
                start_str = evento["start_datetime"].replace("Z", "")
                start_dt = datetime.fromisoformat(start_str)
                agenda = evento.get("agenda") or {}
                agenda_suffix = f" en {agenda.get('name')}" if agenda.get("name") else ""
                message_lines.append(f"- {evento['title']} a las {start_dt.strftime('%H:%M')}{agenda_suffix}")
                
            dispatcher.utter_message(text="\n".join(message_lines))
        except requests.exceptions.ConnectionError:
            logger.exception("Agenda API is unreachable while querying events")
            dispatcher.utter_message(text="El backend esta caido y no puedo revisar tu agenda en este momento.")
        except requests.RequestException as exc:
            logger.exception("Agenda API returned an error while querying events")
            dispatcher.utter_message(text=f"Hubo un error al consultar tu agenda: {exc}")

        return finish_query_events()


class ActionAskEventoFormTipoEvento(Action):
    """Reemplaza el utter estático al preguntar tipo_evento: lista los tipos disponibles."""

    def name(self) -> Text:
        return "action_ask_evento_form_tipo_evento"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        try:
            event_types = fetch_event_types()
            if event_types:
                types_list = "\n".join(f"  • {et['name']}" for et in event_types)
                msg = (
                    f"¿Qué tipo de evento querés agendar?\n"
                    f"Tipos disponibles:\n{types_list}\n\n"
                    "Podés elegir uno de estos o escribir otro tipo."
                )
            else:
                msg = "¿Qué tipo de evento querés agendar? (Ejemplo: parcial, reunión o turno médico)"
        except Exception:
            msg = "¿Qué tipo de evento querés agendar? (Ejemplo: parcial, reunión o turno médico)"

        dispatcher.utter_message(text=msg)
        return []


class ActionAskEventoFormNombreEvento(Action):
    """Pregunta el nombre específico del evento de forma clara."""

    def name(self) -> Text:
        return "action_ask_evento_form_nombre_evento"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        tipo = tracker.get_slot("tipo_evento") or "evento"
        dispatcher.utter_message(
            text=(
                f"¿Cómo se llama este {tipo}?\n"
                f"Formato: <nombre del evento> (Ej: 'Parcial de Algoritmos 2', 'Reunión con el cliente')\n"
                f"Si no tiene un nombre especial, mandame solo un punto '.' y uso '{tipo.capitalize()}' como nombre."
            )
        )
        return []


class ActionConsultarTiposEvento(Action):
    def name(self) -> Text:
        return "action_consultar_tipos_evento"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        try:
            event_types = fetch_event_types()
            if not event_types:
                dispatcher.utter_message(
                    text="Todavía no tenés tipos de evento registrados. Se crean automáticamente cuando agendás algo nuevo."
                )
                return []
            types_list = "\n".join(f"  • {et['name']}" for et in event_types)
            dispatcher.utter_message(text=f"Estos son tus tipos de evento:\n{types_list}")
        except requests.exceptions.ConnectionError:
            dispatcher.utter_message(text="No pude conectarme con el backend para consultar los tipos de evento.")
        except requests.RequestException as exc:
            dispatcher.utter_message(text=f"Hubo un error al consultar los tipos de evento: {exc}")
        return []


class ActionHandleDenialWithCorrection(Action):
    """Intercepta un 'no' durante la confirmación para detectar correcciones implícitas.

    Si el LLM no está disponible o el mensaje es un rechazo puro, delega
    a action_cancelar_operacion. Si detecta datos de corrección, actualiza
    los slots y re-arma el borrador.
    """

    def name(self) -> Text:
        return "action_handle_denial_with_correction"

    def run(
        self,
        dispatcher: CollectingDispatcher,
        tracker: Tracker,
        domain: Dict[Text, Any],
    ) -> List[Dict[Text, Any]]:
        if not tracker.get_slot("awaiting_confirmation"):
            return [FollowupAction("action_cancelar_operacion")]

        user_text = tracker.latest_message.get("text", "")
        correction = extract_correction_from_denial(user_text)

        if correction:
            events: List[Dict[Text, Any]] = [SlotSet("awaiting_confirmation", False)]
            if correction.get("fecha_evento"):
                events.append(SlotSet("fecha_evento", correction["fecha_evento"]))
            if correction.get("tipo_evento"):
                events.append(SlotSet("tipo_evento", correction["tipo_evento"]))
            if correction.get("nombre_evento"):
                events.append(SlotSet("nombre_evento", correction["nombre_evento"]))
            if correction.get("nombre_agenda"):
                events.append(SlotSet("nombre_agenda", correction["nombre_agenda"]))
            if correction.get("duracion_texto"):
                events.append(SlotSet("duracion_texto", correction["duracion_texto"]))
                events.append(SlotSet("duracion_minutos", None))
            if len(events) > 1:
                events.append(FollowupAction("action_preparar_confirmacion"))
                return events

        # Rechazo puro o LLM no disponible → cancelar
        return [FollowupAction("action_cancelar_operacion")]
