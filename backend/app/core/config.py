from pathlib import Path

from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ResumeIQ"
    app_version: str = "1.0.0"
    debug: bool = True

    database_url: str | None = None
    db_host: str = "localhost"
    db_port: int = 3306
    db_name: str = "resumeiq"
    db_user: str = "root"
    db_password: str = "NewPassword@123"

    secret_key: str = "change-me"
    jwt_secret: str | None = None
    algorithm: str = "HS256"
    jwt_algorithm: str | None = None
    access_token_expire_minutes: int = 60
    upload_dir: str | None = None

    local_storage_path: str = "./uploads"
    max_file_size_mb: int = 10
    allowed_extensions: str = "pdf"
    frontend_url: str = "http://localhost:5173"
    frontend_origins: str | None = None

    # SMTP email settings
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "Altzor HR"
    smtp_from_email: str = ""

    model_config = SettingsConfigDict(
        env_file=[
            ".env",
            str(Path(__file__).resolve().parent.parent.parent / ".env")
        ],
        env_file_encoding="utf-8",
        extra="ignore",
    )


    @computed_field
    @property
    def db_url(self) -> str:
        if self.database_url:
            url = self.database_url
            if "charset=" not in url:
                joiner = "&" if "?" in url else "?"
                url = f"{url}{joiner}charset=utf8mb4"
            return url
        return (
            f"mysql+pymysql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}?charset=utf8mb4"
        )

    @computed_field
    @property
    def storage_path(self) -> Path:
        return Path(self.upload_dir or self.local_storage_path).resolve()

    @computed_field
    @property
    def jwt_secret_value(self) -> str:
        return self.jwt_secret or self.secret_key

    @computed_field
    @property
    def jwt_algorithm_value(self) -> str:
        return self.jwt_algorithm or self.algorithm

    @computed_field
    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024

    @computed_field
    @property
    def allowed_extensions_list(self) -> list[str]:
        return [
            ext.strip().lower().lstrip(".")
            for ext in self.allowed_extensions.split(",")
            if ext.strip()
        ]

    @computed_field
    @property
    def cors_origins(self) -> list[str]:
        if self.frontend_origins:
            return [item.strip() for item in self.frontend_origins.split(",") if item.strip()]
        return [self.frontend_url, "http://localhost:8080"]


settings = Settings()
# Trigger reload for .env changes
