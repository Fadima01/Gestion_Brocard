from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Supplier, FabricPurchase, RawMaterial, RawMaterialMovement
from .serializers import (
    SupplierSerializer, FabricPurchaseSerializer, 
    RawMaterialSerializer, RawMaterialMovementSerializer
)
from apps.core.permissions import IsAdminOrReadOnly

class SupplierViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les fournisseurs de tissus et accessoires.
    """
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['est_actif', 'ville']
    search_fields = ['name', 'responsable', 'telephone', 'ville']
    ordering_fields = ['name', 'created_at']


class FabricPurchaseViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les sessions d'achats de rouleaux de tissus.
    """
    queryset = FabricPurchase.objects.all()
    serializer_class = FabricPurchaseSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['supplier', 'statut_paiement', 'date_achat']
    ordering_fields = ['date_achat', 'montant_total']


class RawMaterialViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les stocks de matières premières de tissus.
    """
    queryset = RawMaterial.objects.all()
    serializer_class = RawMaterialSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type_matiere', 'couleur', 'fabric_purchase', 'is_archived']
    search_fields = ['type_matiere', 'couleur']
    ordering_fields = ['date_reception', 'quantite_restante_metres']

    def perform_create(self, serializer):
        instance = serializer.save()
        # Log de mouvement achat initial
        RawMaterialMovement.objects.create(
            raw_material=instance,
            user=self.request.user if self.request.user and self.request.user.is_authenticated else None,
            old_quantity=0,
            new_quantity=instance.quantite_restante_metres,
            difference=instance.quantite_restante_metres,
            operation_type=RawMaterialMovement.OperationType.PURCHASE,
            description=f"Achat initial enregistré via l'interface (Achat Réf: {instance.fabric_purchase.reference if instance.fabric_purchase else 'N/A'})",
            fabric_purchase=instance.fabric_purchase
        )

    def perform_update(self, serializer):
        old_qty = serializer.instance.quantite_restante_metres
        instance = serializer.save()
        new_qty = instance.quantite_restante_metres
        diff = new_qty - old_qty
        
        if diff != 0:
            RawMaterialMovement.objects.create(
                raw_material=instance,
                user=self.request.user if self.request.user and self.request.user.is_authenticated else None,
                old_quantity=old_qty,
                new_quantity=new_qty,
                difference=diff,
                operation_type=RawMaterialMovement.OperationType.ADJUSTMENT,
                description="Ajustement manuel du stock",
                fabric_purchase=instance.fabric_purchase
            )


class RawMaterialMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API pour consulter l'historique complet des mouvements de matières premières.
    """
    queryset = RawMaterialMovement.objects.all()
    serializer_class = RawMaterialMovementSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['raw_material', 'operation_type', 'user']
    search_fields = ['raw_material__type_matiere', 'description']
    ordering_fields = ['created_at']
