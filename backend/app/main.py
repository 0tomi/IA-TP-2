import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.database import create_db_and_tables
from app.routers import agendas, event_types, events
from seed import run_seed

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    run_seed()
    yield


app = FastAPI(
    title="Agenda API",
    description="Backend para gestión de agendas y eventos — IA TP2",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    logger.info("%s %s → %s", request.method, request.url.path, response.status_code)
    return response


app.include_router(agendas.router)
app.include_router(event_types.router)
app.include_router(events.router)


@app.get("/", tags=["health"])
def health():
    return {"status": "ok"}
