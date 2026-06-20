from rest_framework import viewsets, filters, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import CustomerReturn, ReturnLine
from .serializers import CustomerReturnSerializer, ReturnLineSerializer

class CustomerReturnViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les retours clients et déclencher le restockage.
    """
    queryset = CustomerReturn.objects.all()
    serializer_class = CustomerReturnSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['statut_retour', 'order']
    ordering_fields = ['date_retour', 'montant_rembourse']


class ReturnLineViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les lignes de retours d'articles.
    """
    queryset = ReturnLine.objects.all()
    serializer_class = ReturnLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['customer_return', 'variant', 'motif', 'reintegre_stock']
    search_fields = ['notes']
