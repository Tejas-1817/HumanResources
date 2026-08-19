import os
import shutil
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
            for directory in (self.base_path, self.temp_path, self.resumes_path):
                directory.mkdir(parents=True, exist_ok=True)
                try:
                    os.chmod(str(directory), 0o755)
                except Exception:
                    pass
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
        allowed = [ext.lower().lstrip(".") for ext in settings.allowed_extensions_list]
        # Always allow standard document formats
        if suffix not in allowed and suffix not in ("pdf", "docx", "doc"):
            raise FileValidationException(
                message="Invalid file type",
                detail=f"Allowed extensions: {', '.join(set(allowed + ['pdf', 'docx', 'doc']))}",
            )

    async def save_temp_file(self, file: UploadFile) -> Path:
        self._ensure_directories()
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
            try:
                os.chmod(str(temp_file_path), 0o644)
            except Exception:
                pass
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
        self._ensure_directories()
        if not extension.startswith("."):
            extension = f".{extension}"
        final_path = self.resumes_path / f"{candidate_id}{extension}"
        try:
            if final_path.exists():
                final_path.unlink()
            # Use shutil.move to support cross-device/partition moves cleanly on servers
            shutil.move(str(temp_path), str(final_path))
            try:
                os.chmod(str(final_path), 0o644)
            except Exception:
                pass
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

    def get_file_path(self, candidate_id: int, extension: str = ".pdf") -> Path:
        """Alias method for retrieving candidate file path."""
        return self.get_candidate_file_path(candidate_id)

    def get_candidate_file_path(self, candidate_id: int, original_filename: str | None = None) -> Path:
        """Return the resume file path for a candidate, checking known extensions and filename suffix."""
        self._ensure_directories()
        
        # 1. If original_filename provided, check its extension first
        if original_filename:
            orig_ext = Path(original_filename).suffix.lower()
            if orig_ext:
                candidate_path = self.resumes_path / f"{candidate_id}{orig_ext}"
                if candidate_path.exists() and candidate_path.stat().st_size > 0:
                    return candidate_path

        # 2. Check all common extensions
        extensions_to_check = ["pdf", "docx", "doc"] + [ext.lstrip(".") for ext in settings.allowed_extensions_list]
        for ext in extensions_to_check:
            candidate_path = self.resumes_path / f"{candidate_id}.{ext}"
            if candidate_path.exists() and candidate_path.stat().st_size > 0:
                return candidate_path

        # 3. Check any file in resumes directory matching candidate_id.*
        try:
            matches = list(self.resumes_path.glob(f"{candidate_id}.*"))
            for match in matches:
                if match.is_file() and match.stat().st_size > 0:
                    return match
        except Exception:
            pass

        # Fallback to .pdf
        return self.resumes_path / f"{candidate_id}.pdf"

    def ensure_candidate_resume(self, candidate) -> Path:
        """Ensure candidate resume file exists on disk, auto-generating a PDF if missing."""
        self._ensure_directories()
        file_path = self.get_candidate_file_path(candidate.id, getattr(candidate, "original_filename", None))
        if file_path.exists() and file_path.stat().st_size > 0:
            return file_path

        from app.services.resume_generator import generate_candidate_pdf
        target_path = self.resumes_path / f"{candidate.id}.pdf"
        generate_candidate_pdf(candidate, target_path)
        try:
            os.chmod(str(target_path), 0o644)
        except Exception:
            pass
        return target_path


storage_service = LocalStorageService()


