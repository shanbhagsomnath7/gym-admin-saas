from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base
import app.models.models as models
from app.api.v1.endpoints import router as api_v1_router

# Ensure tables exist on Supabase
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Gym Admin SaaS API",
    version="0.1.0",
    description="Multi-tenant Gym Management API"
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 routes
app.include_router(api_v1_router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "Gym Admin SaaS API is running smoothly!"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}