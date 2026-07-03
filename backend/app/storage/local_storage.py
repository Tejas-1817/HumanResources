from pathlib import Path
from uuid import uuid4

import aiofiles
from fastapi import UploadFile

from app.core.config import settings
from app.core.exceptions import FileValidationException, StorageException


class LocalStorageService:
    def __init__(self, base_path: Path | None = None):
        self.base_path = base_path or settings.storage_path
        self.temp_path = self.base_path / "temp"
        self.resumes_path = self.base_path / "resumes"
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        try:
            self.base_path.mkdir(parents=True, exist_ok=True)
            self.temp_path.mkdir(parents=True, exist_ok=True)
            self.resumes_path.mkdir(parents=True, exist_ok=True)
        except Exception as exc:
            raise StorageException(
                message="Unable to initialize storage directories",
                detail=str(exc),
            ) from exc

    def validate_file(self, file: UploadFile) -> None:
        filename = file.filename or ""
        if not filename:
            raise FileValidationException(message="Missing filename")

        suffix = Path(filename).suffix.lower().lstrip(".")
        if suffix not in settings.allowed_extensions_list:
            raise FileValidationException(
                message="Invalid file type",
                detail=f"Allowed extensions: {', '.join(settings.allowed_extensions_list)}",
            )

    async def save_temp_file(self, file: UploadFile) -> Path:
        self.validate_file(file)
        ext = Path(file.filename or "").suffix.lower() or ".pdf"
        temp_file_path = self.temp_path / f"{uuid4().hex}{ext}"

        written_bytes = 0
        try:
            await file.seek(0)
            async with aiofiles.open(temp_file_path, "wb") as out:
                while True:
                    chunk = await file.read(1024 * 1024)
                    if not chunk:
                        break
                    written_bytes += len(chunk)
                    if written_bytes > settings.max_file_size_bytes:
                        raise FileValidationException(
                            message="File exceeds size limit",
                            detail=f"Max allowed size is {settings.max_file_size_mb} MB",
                        )
                    await out.write(chunk)
            await file.seek(0)
            return temp_file_path
        except FileValidationException:
            await self.delete_file(temp_file_path)
            raise
        except Exception as exc:
            await self.delete_file(temp_file_path)
            raise StorageException(
                message="Failed to save temporary file",
                detail=str(exc),
            ) from exc

    async def finalize_file(self, temp_path: Path, candidate_id: int, extension: str = ".pdf") -> Path:
        final_path = self.resumes_path / f"{candidate_id}{extension}"
        try:
            if final_path.exists():
                final_path.unlink()
            temp_path.rename(final_path)
            return final_path
        except Exception as exc:
            raise StorageException(
                message="Failed to finalize file",
                detail=str(exc),
            ) from exc

    async def delete_file(self, file_path: Path | str) -> None:
        path = Path(file_path)
        try:
            if path.exists():
                path.unlink()
        except Exception as exc:
            raise StorageException(
                message="Failed to delete file",
                detail=str(exc),
            ) from exc

    def get_candidate_file_path(self, candidate_id: int) -> Path:
        """Return the resume file path for a candidate, checking all allowed extensions."""
        for ext in settings.allowed_extensions_list:
            candidate_path = self.resumes_path / f"{candidate_id}.{ext}"
            if candidate_path.exists():
                return candidate_path
        # Fallback to .pdf (preserves backward-compat for existing files)
        return self.resumes_path / f"{candidate_id}.pdf"


storage_service = LocalStorageService()
