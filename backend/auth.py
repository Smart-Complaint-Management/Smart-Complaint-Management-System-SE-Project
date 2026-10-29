from dataclasses import dataclass
from functools import wraps
from typing import Callable, TypeVar, cast

from flask import g, jsonify


F = TypeVar("F", bound=Callable[..., object])


@dataclass(frozen=True)
class AuthenticatedUser:
    id: int
    role: str


def current_user() -> AuthenticatedUser | None:
    user = getattr(g, "current_user", None)
    return user if isinstance(user, AuthenticatedUser) else None


def authorization_error_status(user: AuthenticatedUser | None) -> int | None:
    if user is None:
        return 401
    if user.role != "admin":
        return 403
    return None


def require_admin(view: F) -> F:
    @wraps(view)
    def wrapped(*args: object, **kwargs: object) -> object:
        user = current_user()
        error_status = authorization_error_status(user)
        if error_status is not None:
            message = (
                "Authentication is required."
                if error_status == 401
                else "Administrator permission is required."
            )
            return jsonify({"error": message}), error_status
        return view(*args, **kwargs)

    return cast(F, wrapped)
