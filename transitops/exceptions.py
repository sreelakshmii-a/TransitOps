from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """
    [contract lock] Conflict errors (dispatch/complete/cancel business-rule
    failures) use a frozen body shape: {"reason": str, "code": str} — not
    DRF's default {"detail": ...}.
    """
    conflict_reason = getattr(exc, "reason", None)
    if conflict_reason is not None:
        return Response(
            {"reason": conflict_reason, "code": getattr(exc, "code", conflict_reason)},
            status=status.HTTP_409_CONFLICT,
        )
    return exception_handler(exc, context)
