import logging
import os
import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Text

import dateparser
import requests

from rasa_sdk import Action, Tracker
from rasa_sdk.events import SlotSet
from rasa_sdk.executor import CollectingDispatcher

logger = logging.getLogger(__name__)

API_BASE_URL = os.getenv("AGENDA_API_URL", "http://localhost:8000")


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


def parse_date(date_str: Optional[str]) -> Optional[datetime]:
    if not date_str:
        return None

    text = date_str.lower().replace("pasado mañana", "en 2 dias").replace("pasado manana", "en 2 dias")

    return dateparser.parse(
        text,
        languages=["es"],
        settings={"PREFER_DATES_FROM": "future"},
    )


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


def build_confirmation_message(tipo_evento: str, agenda_name: str, start_dt: datetime, duration_minutes: int) -> str:
    return (
        "Quedaria asi: "
        f"'{tipo_evento}' el {format_datetime(start_dt)} en la agenda '{agenda_name}' "
        f"con una duracion estimada de {format_duration(duration_minutes)}. "
        "Decime 'si' para confirmarlo, 'no' para cancelarlo o corregime algun dato."
    )


def build_search_description(filters: List[str]) -> str:
    if not filters:
        return "esa busqueda"
    if len(filters) == 1:
        return filters[0]
    return ", ".join(filters[:-1]) + f" y {filters[-1]}"


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
        pending_action = tracker.get_slot("pending_action")
        requested_slot = tracker.get_slot("requested_slot")
        awaiting_confirmation = tracker.get_slot("awaiting_confirmation")

        if awaiting_confirmation:
            dispatcher.utter_message(
                text="No llegue a entenderte. Si queres seguir, respondeme 'si' para confirmar, 'no' para cancelar o corregime el dato que quieras cambiar."
            )
        elif pending_action == "create" and requested_slot == "tipo_evento":
            dispatcher.utter_message(
                text="No llegue a captar el tipo de evento. Decime algo como 'parcial', 'reunion' o 'turno medico'."
            )
        elif pending_action == "create" and requested_slot == "fecha_evento":
            dispatcher.utter_message(
                text="No pude entender la fecha. Decimela de otra forma, por ejemplo 'manana a las 18' o 'el viernes a las 9'."
            )
        elif pending_action == "create" and requested_slot == "nombre_agenda":
            dispatcher.utter_message(
                text="Decime el nombre exacto de la agenda donde queres guardarlo."
            )
        elif pending_action == "create" and requested_slot == "duracion_texto":
            dispatcher.utter_message(
                text="No entendi la duracion. Podes decirme algo como '30 minutos' o '2 horas'."
            )
        else:
            dispatcher.utter_message(
                text="No termine de entenderte. Podes pedirme que cree un evento, consulte tu agenda o corregir el borrador que venimos armando."
            )

        return [SlotSet("chitchat_count", 0.0)]


class ActionValidarYCrearEvento(Action):
    def name(self) -> Text:
        return "action_validar_y_crear_evento"

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

        if not tipo_evento:
            dispatcher.utter_message(text="Que tipo de evento queres agendar? Ejemplo: parcial, reunion o turno medico.")
            return [
                SlotSet("pending_action", "create"),
                SlotSet("requested_slot", "tipo_evento"),
                SlotSet("awaiting_confirmation", False),
            ]

        if not fecha_evento:
            dispatcher.utter_message(text="Para cuando lo queres agendar?")
            return [
                SlotSet("pending_action", "create"),
                SlotSet("requested_slot", "fecha_evento"),
                SlotSet("awaiting_confirmation", False),
            ]

        start_dt = parse_date(fecha_evento)
        if not start_dt:
            dispatcher.utter_message(
                text="No pude entender bien la fecha. Decimela de otra forma, por ejemplo 'manana a las 18' o 'el viernes a las 9'."
            )
            return [
                SlotSet("pending_action", "create"),
                SlotSet("requested_slot", "fecha_evento"),
                SlotSet("awaiting_confirmation", False),
            ]

        agenda_id, agenda_name, agenda_options, agenda_error = resolve_agenda_for_create(nombre_agenda)
        if agenda_error:
            dispatcher.utter_message(text=agenda_error)
            return [
                SlotSet("pending_action", "create"),
                SlotSet("requested_slot", "nombre_agenda" if not nombre_agenda else None),
                SlotSet("awaiting_confirmation", False),
            ]

        if agenda_options:
            dispatcher.utter_message(
                text=(
                    "Tenes varias agendas guardadas: "
                    f"{', '.join(agenda_options)}. Decime en cual queres que lo anote."
                )
            )
            return [
                SlotSet("pending_action", "create"),
                SlotSet("requested_slot", "nombre_agenda"),
                SlotSet("awaiting_confirmation", False),
            ]

        duration_minutes = None
        if duracion_texto:
            duration_minutes = parse_duration_minutes(duracion_texto)
            if duration_minutes is None:
                dispatcher.utter_message(
                    text="No pude interpretar la duracion. Decimela como '30 minutos' o '2 horas'."
                )
                return [
                    SlotSet("pending_action", "create"),
                    SlotSet("requested_slot", "duracion_texto"),
                    SlotSet("awaiting_confirmation", False),
                ]

        if duration_minutes is None:
            duration_minutes = infer_default_duration_minutes(tipo_evento)

        dispatcher.utter_message(
            text=build_confirmation_message(tipo_evento, agenda_name, start_dt, duration_minutes)
        )
        return [
            SlotSet("pending_action", "create"),
            SlotSet("requested_slot", None),
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
        if tracker.get_slot("pending_action") != "create" or not tracker.get_slot("awaiting_confirmation"):
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

        duration_minutes = int(duration_value) if duration_value else infer_default_duration_minutes(tipo_evento)
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        payload = {
            "title": resolved_event_type,
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
                    f"Listo, agende '{resolved_event_type}' para el {format_datetime(start_dt)} "
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
        if tracker.get_slot("pending_action") or tracker.get_slot("awaiting_confirmation"):
            dispatcher.utter_message(text="Perfecto, cancele el borrador actual. Cuando quieras arrancamos de nuevo.")
            return clear_flow_slots()

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
        fecha_evento = tracker.get_slot("fecha_evento")
        tipo_evento = tracker.get_slot("tipo_evento")
        nombre_agenda = tracker.get_slot("nombre_agenda")

        if not any([fecha_evento, tipo_evento, nombre_agenda]):
            dispatcher.utter_message(
                text="Decime al menos una pista para buscar: una fecha, un tipo de evento o una agenda."
            )
            return [SlotSet("pending_action", "query")]

        params: Dict[str, Any] = {}
        filters: List[str] = []

        if fecha_evento:
            dt = parse_date(fecha_evento)
            if not dt:
                dispatcher.utter_message(
                    text="No pude entender la fecha de la consulta. Decimela de otra forma, por ejemplo 'manana' o 'el viernes'."
                )
                return [SlotSet("pending_action", "query")]

            start_dt = dt.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = dt.replace(hour=23, minute=59, second=59, microsecond=0)
            params["from_dt"] = start_dt.isoformat()
            params["to_dt"] = end_dt.isoformat()
            filters.append(f"el {dt.strftime('%d/%m')}")

        if tipo_evento:
            event_type_id, resolved_event_type, event_type_error = resolve_event_type(tipo_evento, create_if_missing=False)
            if event_type_error:
                dispatcher.utter_message(text=event_type_error)
                return clear_flow_slots()

            params["event_type_id"] = event_type_id
            filters.append(f"del tipo '{resolved_event_type}'")

        if nombre_agenda:
            agenda_id, resolved_agenda, agenda_error = resolve_agenda_for_query(nombre_agenda)
            if agenda_error:
                dispatcher.utter_message(text=agenda_error)
                return clear_flow_slots()

            params["agenda_id"] = agenda_id
            filters.append(f"en la agenda '{resolved_agenda}'")

        try:
            response = requests.get(f"{API_BASE_URL}/events", params=params, timeout=5)
            response.raise_for_status()
            eventos = response.json()

            description = build_search_description(filters)
            if not eventos:
                dispatcher.utter_message(text=f"No encontre nada para {description}.")
                return clear_flow_slots()

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

        return clear_flow_slots()
