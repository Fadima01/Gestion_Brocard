from rest_framework import viewsets, filters, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import FinishedGoodStock, StockMovement
from .serializers import FinishedGoodStockSerializer, StockMovementSerializer
from apps.core.permissions import IsAdminOrReadOnly

class FinishedGoodStockViewSet(viewsets.ModelViewSet):
    """
    API pour consulter et ajuster les niveaux de stock physique d'habits finis.
    """
    queryset = FinishedGoodStock.objects.all()
    serializer_class = FinishedGoodStockSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['emplacement', 'variant', 'variant__model']
    search_fields = ['variant__sku', 'variant__model__name', 'emplacement']
    ordering_fields = ['quantite_reel', 'quantite_reservee']


class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API en lecture seule pour consulter le journal d'audit des mouvements de stock.
    L'écriture directe est bloquée (elle doit passer par InventoryService ou les signaux).
    """
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type_mouvement', 'stock', 'stock__variant', 'stock__variant__model']
    search_fields = ['stock__variant__sku', 'description']
    ordering_fields = ['created_at']

    def get_queryset(self):
        queryset = super().get_queryset()
        variant_model = self.request.query_params.get('stock__variant__model')
        
        category_id = None
        variant_id = None
        if variant_model:
            from apps.catalogue.models import ClothingModel
            try:
                model_obj = ClothingModel.objects.get(pk=variant_model)
                category_id = model_obj.category_id
                first_variant = model_obj.variants.first()
                if first_variant:
                    variant_id = first_variant.id
            except ClothingModel.DoesNotExist:
                pass

        print("=== BACKEND STOCKMOVEMENT LOG ===")
        print(f"  model_id reçu: {variant_model}")
        print(f"  category_id reçu: {category_id}")
        print(f"  variant_id reçu: {variant_id}")

        if variant_model:
            queryset = queryset.filter(stock__variant__model_id=variant_model)
        print(f"  Nombre de StockMovements retournés: {queryset.count()}")
        return queryset
