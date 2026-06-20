from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import ClothingModel, ModelPhoto, ProductVariant, PriceCategory
from .serializers import ClothingModelSerializer, ModelPhotoSerializer, ProductVariantSerializer, PriceCategorySerializer
from apps.core.permissions import IsAdminOrReadOnly

class PriceCategoryViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les catégories de prix (ex: 17 000 FCFA, 25 000 FCFA).
    """
    queryset = PriceCategory.objects.all()
    serializer_class = PriceCategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['prix']


class ClothingModelViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les modèles d'habits de Brocard.
    """
    queryset = ClothingModel.objects.all()
    serializer_class = ClothingModelSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_available', 'is_archived']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'prix_vente_conseille', 'created_at']

    def perform_update(self, serializer):
        old_model = self.get_object()
        old_price = old_model.prix_vente_conseille
        old_archived = old_model.is_archived
        
        model = serializer.save()
        
        from apps.core.models import log_activity
        if old_price != model.prix_vente_conseille:
            log_activity(
                user=self.request.user,
                action="modification de prix",
                details=f"Prix conseillé du modèle '{model.name}' modifié de {old_price} à {model.prix_vente_conseille} FCFA"
            )
        if not old_archived and model.is_archived:
            log_activity(
                user=self.request.user,
                action="archivage de produit",
                details=f"Modèle d'habit '{model.name}' archivé"
            )


class ModelPhotoViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les photos de la galerie de chaque modèle.
    """
    queryset = ModelPhoto.objects.all()
    serializer_class = ModelPhotoSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['model']


class ProductVariantViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les variantes physiques (Tailles, Couleurs) d'habits.
    """
    queryset = ProductVariant.objects.all()
    serializer_class = ProductVariantSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['model', 'taille', 'couleur']
    search_fields = ['sku']
    ordering_fields = ['sku', 'taille']

    def perform_update(self, serializer):
        old_variant = self.get_object()
        old_price = old_variant.prix_vente_specifique
        
        variant = serializer.save()
        
        from apps.core.models import log_activity
        if old_price != variant.prix_vente_specifique:
            log_activity(
                user=self.request.user,
                action="modification de prix",
                details=f"Prix spécifique de la variante '{variant}' modifié de {old_price} à {variant.prix_vente_specifique} FCFA"
            )
