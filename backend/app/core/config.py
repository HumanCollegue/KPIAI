from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    app_env: str = "development"
    app_host: str = "0.0.0.0"
    app_port: int = 8000
    anthropic_api_key: str = ""
    allowed_origins: List[str] = ["http://localhost:3000"]
    pdf_folder_path: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
