from django.contrib.auth import authenticate
from django.core import signing
from rest_framework import viewsets, filters, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import User
from .serializers import UserSerializer
from apps.core.permissions import IsAdminUser

class TokenObtainView(APIView):
    """
    Vue pour obtenir un jeton de connexion (token).
    Prend username et password, authentifie l'utilisateur et renvoie le token de session
    ainsi que les détails de profil.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response(
                {"detail": "Veuillez fournir un nom d'utilisateur et un mot de passe."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = authenticate(username=username, password=password)

        if user is None:
            return Response(
                {"detail": "Identifiants de connexion invalides."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.is_active:
            return Response(
                {"detail": "Ce compte utilisateur a été désactivé."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Générer le token signé contenant l'ID utilisateur
        token = signing.dumps({"user_id": user.id})

        return Response({
            "access": token,
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "role": user.role,
                "is_superuser": user.is_superuser
            }
        }, status=status.HTTP_200_OK)


class UserViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les utilisateurs de l'ERP. 
    Accès restreint aux administrateurs.
    """
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'first_name', 'last_name', 'email']
    ordering_fields = ['date_joined', 'username']
