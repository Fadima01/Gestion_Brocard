from rest_framework import permissions

class IsAdminUser(permissions.BasePermission):
    """
    Permission permettant l'accès uniquement aux utilisateurs de l'ERP ayant le rôle ADMIN.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_admin
        )


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission permettant la lecture à tous les utilisateurs authentifiés,
    mais limitant les écritures (POST, PUT, DELETE) aux seuls administrateurs.
    """
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_admin
        )
