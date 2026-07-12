from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    def __init__(self, *roles):
        self.roles = roles

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self.roles
        )
