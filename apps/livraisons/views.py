from rest_framework import viewsets, filters, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import Delivery
from .serializers import DeliverySerializer

class DeliveryViewSet(viewsets.ModelViewSet):
    """
    API pour planifier et suivre les expéditions de commandes.
    """
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut_livraison', 'order']
    search_fields = ['livreur_nom', 'adresse_livraison', 'order__reference']
    ordering_fields = ['created_at', 'date_livraison_reelle']
