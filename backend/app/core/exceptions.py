from fastapi import Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    def __init__(self, message: str, detail: str | None = None, status_code: int = 400):
        self.status_code = status_code
        self.message = message
        self.detail = detail
        super().__init__(message)


class NotFoundException(AppException):
    def __init__(self, message: str = "Resource not found", detail: str | None = None):
        super().__init__(message=message, detail=detail, status_code=404)


class UnauthorizedException(AppException):
    def __init__(self, message: str = "Unauthorized", detail: str | None = None):
        super().__init__(message=message, detail=detail, status_code=401)


class BadRequestException(AppException):
    def __init__(self, message: str = "Bad request", detail: str | None = None):
        super().__init__(message=message, detail=detail, status_code=400)


class ForbiddenException(AppException):
    def __init__(self, message: str = "Forbidden", detail: str | None = None):
        super().__init__(message=message, detail=detail, status_code=403)


class FileValidationException(AppException):
    def __init__(self, message: str = "File validation failed", detail: str | None = None):
        super().__init__(message=message, detail=detail, status_code=422)


class StorageException(AppException):
    def __init__(self, message: str = "Storage operation failed", detail: str | None = None):
        super().__init__(message=message, detail=detail, status_code=500)


class DuplicateException(AppException):
    def __init__(self, message: str = "Duplicate resource", detail: str | None = None):
        super().__init__(message=message, detail=detail, status_code=409)


async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.message,
            "detail": exc.detail,
        },
    )


async def unhandled_exception_handler(_: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "detail": str(exc),
        },
    )
