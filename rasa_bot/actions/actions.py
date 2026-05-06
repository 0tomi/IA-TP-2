import logging
from typing import Any, Text, Dict, List
import requests
from datetime import datetime, timedelta
import dateparser

from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet

logger = logging.getLogger(__name__)

API_BASE_URL = "http://localhost:8000"

def get_or_create_event_type(name: str) -> int:
    try:
        response = requests.get(f"{API_BASE_URL}/event-types", timeout=5)
        response.raise_for_status()
        event_types = response.json()
        
        # Search case-insensitive
        for et in event_types:
            if et["name"].lower() == name.lower():
                return et["id"]
                
        # Create if not found
        create_resp = requests.post(f"{API_BASE_URL}/event-types", json={"name": name.capitalize()}, timeout=5)
        create_resp.raise_for_status()
        return create_resp.json()["id"]
    except Exception as e:
        logger.error(f"Error fetching/creating event type: {e}")
        return 1 # Fallback ID

def get_or_create_agenda(name: str = None) -> tuple[int | None, str | list]:
    try:
        response = requests.get(f"{API_BASE_URL}/agendas", timeout=5)
        response.raise_for_status()
        agendas = response.json()
        
        if not agendas:
            # Crear defecto
            default_name = name or "Agenda Principal"
            create_resp = requests.post(f"{API_BASE_URL}/agendas", json={"name": default_name}, timeout=5)
            create_resp.raise_for_status()
            return create_resp.json()["id"], default_name
            
        if name:
            # Buscar por nombre
            for agenda in agendas:
                if agenda["name"].lower() == name.lower():
                    return agenda["id"], agenda["name"]
            # No encontrada, la creamos
            create_resp = requests.post(f"{API_BASE_URL}/agendas", json={"name": name.capitalize()}, timeout=5)
            create_resp.raise_for_status()
            return create_resp.json()["id"], name.capitalize()
            
        if len(agendas) == 1:
            return agendas[0]["id"], agendas[0]["name"]
            
        # Mas de 1 agenda y no especificó
        return None, [a["name"] for a in agendas]
        
    except Exception as e:
        logger.error(f"Error fetching/creating agenda: {e}")
        return 1, "Agenda Fallback"

def parse_date(date_str: str):
    # Intentamos parsear la fecha, asumiendo idioma español y preferencia por el futuro
    dt = dateparser.parse(date_str, languages=['es'], settings={'PREFER_DATES_FROM': 'future'})
    if not dt:
        dt = datetime.now()
    return dt

class ActionHandleChitchat(Action):
    def name(self) -> Text:
        return "action_handle_chitchat"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        count = tracker.get_slot("chitchat_count")
        if count is None:
            count = 0.0
        
        count += 1.0

        if count >= 3.0:
            dispatcher.utter_message(text="Me parece que nos estamos desviando. Decime en qué te puedo ayudar con tu calendario o terminamos acá. 😊")
            return [SlotSet("chitchat_count", 0.0)]
        else:
            dispatcher.utter_message(text="¡Qué bueno! Pero contame, ¿necesitás que anote o busque algo en tu agenda?")
            return [SlotSet("chitchat_count", count)]

class ActionValidarYCrearEvento(Action):
    def name(self) -> Text:
        return "action_validar_y_crear_evento"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        tipo_evento = tracker.get_slot("tipo_evento")
        fecha_evento = tracker.get_slot("fecha_evento")
        nombre_agenda = tracker.get_slot("nombre_agenda")

        if not tipo_evento:
            dispatcher.utter_message(text="¿Qué tipo de evento es? (ej. parcial, reunión, juntada)")
            return []
        
        if not fecha_evento:
            dispatcher.utter_message(text="¿Para cuándo lo querés agendar?")
            return []

        # Lógica de Agenda
        agenda_id, result = get_or_create_agenda(nombre_agenda)
        if agenda_id is None:
            # result es la lista de nombres
            names_str = ", ".join(result)
            dispatcher.utter_message(text=f"Tenés varias agendas guardadas: {names_str}. ¿En cuál querés que anote el evento?")
            return []

        agenda_name = result

        # Parsear fecha
        start_dt = parse_date(fecha_evento)
        end_dt = start_dt + timedelta(hours=1) # Por defecto 1 hora

        # Identificar o crear ID de tipo de evento
        event_type_id = get_or_create_event_type(tipo_evento)

        payload = {
            "title": tipo_evento.capitalize(),
            "start_datetime": start_dt.isoformat(),
            "end_datetime": end_dt.isoformat(),
            "agenda_id": agenda_id,
            "event_type_id": event_type_id,
            "status": "pending"
        }

        try:
            resp = requests.post(f"{API_BASE_URL}/events", json=payload, timeout=5)
            resp.raise_for_status()
            dispatcher.utter_message(text=f"¡Listo! Agendado '{tipo_evento}' para el {start_dt.strftime('%d/%m a las %H:%M')} en la agenda '{agenda_name}'.")
        except requests.exceptions.ConnectionError:
            dispatcher.utter_message(text="¡Uy! Parece que el servidor de agenda está apagado y no pude guardar el evento.")
        except Exception as e:
            dispatcher.utter_message(text=f"Hubo un error al intentar crear el evento: {str(e)}")

        # Limpiar slots después de usar
        return [SlotSet("tipo_evento", None), SlotSet("fecha_evento", None), SlotSet("nombre_agenda", None)]

class ActionConsultarEvento(Action):
    def name(self) -> Text:
        return "action_consultar_evento"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        fecha_evento = tracker.get_slot("fecha_evento")
        tipo_evento = tracker.get_slot("tipo_evento")

        params = {}
        
        if fecha_evento:
            dt = parse_date(fecha_evento)
            # Buscar todo el día
            start_dt = dt.replace(hour=0, minute=0, second=0)
            end_dt = dt.replace(hour=23, minute=59, second=59)
            params["from_dt"] = start_dt.isoformat()
            params["to_dt"] = end_dt.isoformat()
            mensaje_busqueda = f"el {dt.strftime('%d/%m')}"
        elif tipo_evento:
            event_type_id = get_or_create_event_type(tipo_evento)
            params["event_type_id"] = event_type_id
            mensaje_busqueda = f"el evento tipo '{tipo_evento}'"
        else:
            dispatcher.utter_message(text="No te entendí bien, ¿qué día o qué evento querés buscar?")
            return []

        try:
            resp = requests.get(f"{API_BASE_URL}/events", params=params, timeout=5)
            resp.raise_for_status()
            eventos = resp.json()

            if not eventos:
                dispatcher.utter_message(text=f"No tenés nada agendado para {mensaje_busqueda}.")
            else:
                dispatcher.utter_message(text=f"Esto es lo que encontré para {mensaje_busqueda}:")
                for ev in eventos:
                    # Limpiar milisegundos y zonas horarias simples para facilitar el parseo
                    start_str = ev['start_datetime'].replace("Z", "")
                    st = datetime.fromisoformat(start_str)
                    dispatcher.utter_message(text=f"- {ev['title']} a las {st.strftime('%H:%M')}")
        except requests.exceptions.ConnectionError:
            dispatcher.utter_message(text="El servidor está caído, no puedo revisar tu agenda en este momento.")
        except Exception as e:
            dispatcher.utter_message(text="Hubo un error al consultar tu agenda.")

        return [SlotSet("tipo_evento", None), SlotSet("fecha_evento", None)]
