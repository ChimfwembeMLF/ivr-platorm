from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "IVR Platform"
    
    # Postgres
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ivr_platform"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # AGI Server
    AGI_HOST: str = "0.0.0.0"
    AGI_PORT: int = 4573
    
    class Config:
        env_file = ".env"

settings = Settings()
