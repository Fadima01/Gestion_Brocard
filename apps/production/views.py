from decimal import Decimal
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import Workshop, ProductionOrder, MaterialConsumption, WorkshopPayment
from .serializers import (
    WorkshopSerializer, ProductionOrderSerializer, 
    MaterialConsumptionSerializer, WorkshopPaymentSerializer
)
from .services import ProductionService
from apps.core.permissions import IsAdminOrReadOnly
from apps.catalogue.models import ProductVariant

class WorkshopViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les ateliers de couture sous-traitants.
    """
    queryset = Workshop.objects.all()
    serializer_class = WorkshopSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['est_actif', 'ville']
    search_fields = ['name', 'responsable', 'telephone', 'ville']
    ordering_fields = ['name', 'created_at']


class ProductionOrderViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les ordres de production.
    """
    queryset = ProductionOrder.objects.all()
    serializer_class = ProductionOrderSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut', 'statut_paiement_facon', 'workshop']
    search_fields = ['reference']
    ordering_fields = ['date_debut', 'date_fin_prevue', 'quantite_demandee']

    def get_queryset(self):
        queryset = super().get_queryset()
        model_id = self.request.query_params.get('model')
        
        category_id = None
        variant_id = None
        if model_id:
            from apps.catalogue.models import ClothingModel
            try:
                model_obj = ClothingModel.objects.get(pk=model_id)
                category_id = model_obj.category_id
                first_variant = model_obj.variants.first()
                if first_variant:
                    variant_id = first_variant.id
            except ClothingModel.DoesNotExist:
                pass

        print("=== BACKEND PRODUCTION LOG ===")
        print(f"  model_id reçu: {model_id}")
        print(f"  category_id reçu: {category_id}")
        print(f"  variant_id reçu: {variant_id}")

        if model_id:
            from apps.catalogue.models import ClothingModel
            from django.db import models
            try:
                model_obj = ClothingModel.objects.get(pk=model_id)
                queryset = queryset.filter(
                    models.Q(model=model_obj) | 
                    models.Q(category=model_obj.category, model__isnull=True)
                )
            except ClothingModel.DoesNotExist:
                queryset = queryset.filter(model_id=model_id)
        print(f"  Nombre de ProductionOrders retournes: {queryset.count()}")
        return queryset

    def perform_create(self, serializer):
        order = serializer.save()
        from apps.core.models import log_activity
        log_activity(
            user=self.request.user,
            action="création de fabrication",
            details=f"Ordre de production {order.reference} créé pour le modèle '{order.model.name if order.model else 'Inconnu'}' à l'atelier {order.workshop.name} (Qté demandée: {order.quantite_demandee})"
        )

    def perform_update(self, serializer):
        old_order = self.get_object()
        old_status = old_order.statut
        order = serializer.save()
        new_status = order.statut
        if old_status != new_status and new_status == 'CANCELLED':
            from apps.core.models import log_activity
            log_activity(
                user=self.request.user,
                action="annulation de fabrication",
                details=f"Ordre de production {order.reference} annulé (Modèle: '{order.model.name if order.model else 'Inconnu'}')"
            )

    @action(detail=True, methods=['post'], url_path='complete')
    def complete_order(self, request, pk=None):
        """
        Action personnalisée pour clôturer un ordre de production et intégrer les vêtements en stock.
        Arguments POST: produced_quantity (int), defective_quantity (int), variant_id (int, optionnel), location (str, optionnel)
        """
        order = self.get_object()
        produced_qty = request.data.get('produced_quantity')
        defective_qty = request.data.get('defective_quantity', 0)
        variant_id = request.data.get('variant_id')
        location = request.data.get('location', 'Magasin')

        if produced_qty is None:
            return Response(
                {"error": "produced_quantity est requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            variant = None
            if variant_id:
                variant = ProductVariant.objects.get(id=variant_id)
            elif order.model:
                variant = order.model.variants.first()

            updated_order = ProductionService.complete_production_order(
                order=order,
                produced_quantity=int(produced_qty),
                defective_quantity=int(defective_qty),
                variant=variant,
                location=location,
                user=request.user
            )
            serializer = self.get_serializer(updated_order)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='pay')
    def pay_workshop(self, request, pk=None):
        """
        Action personnalisée pour payer la façon d'un ordre de production clôturé.
        Arguments POST: amount (Decimal), payment_mode (str), transaction_reference (str, optionnel), notes (str, optionnel)
        """
        order = self.get_object()
        amount = request.data.get('amount')
        mode = request.data.get('payment_mode')
        ref = request.data.get('transaction_reference', '')
        notes = request.data.get('notes', '')

        if amount is None or mode is None:
            return Response(
                {"error": "amount et payment_mode sont requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payment = ProductionService.pay_workshop(
                order=order,
                amount=Decimal(str(amount)),
                payment_mode=mode,
                transaction_reference=ref,
                notes=notes
            )
            serializer = WorkshopPaymentSerializer(payment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class MaterialConsumptionViewSet(viewsets.ModelViewSet):
    queryset = MaterialConsumption.objects.all()
    serializer_class = MaterialConsumptionSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['production_order', 'raw_material']


class WorkshopPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WorkshopPayment.objects.all()
    serializer_class = WorkshopPaymentSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['production_order', 'mode_paiement']
    search_fields = ['reference_transaction', 'notes']
    ordering_fields = ['date_paiement']
