from django.core import signing
from django.conf import settings
from rest_framework import authentication
from rest_framework import exceptions
from apps.users.models import User

class JWTAuthentication(authentication.BaseAuthentication):
    """
    Système d'authentification par token signé cryptographiquement.
    Attend le header HTTP 'Authorization: Bearer <token>'.
    """
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization') or request.META.get('HTTP_AUTHORIZATION')
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            # Format d'en-tête incorrect
            return None

        token = parts[1]

        try:
            # Durée de validité du token : 7 jours (604800 secondes)
            payload = signing.loads(token, max_age=604800)
        except signing.SignatureExpired:
            raise exceptions.AuthenticationFailed('Le jeton de connexion a expiré.')
        except signing.BadSignature:
            raise exceptions.AuthenticationFailed('Le jeton de connexion est invalide.')

        user_id = payload.get('user_id')
        if not user_id:
            raise exceptions.AuthenticationFailed('Structure de jeton invalide.')

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise exceptions.AuthenticationFailed('Utilisateur associé introuvable.')

        if not user.is_active:
            raise exceptions.AuthenticationFailed('Ce compte utilisateur a été désactivé.')

        return (user, token)

    def authenticate_header(self, request):
        return 'Bearer'
