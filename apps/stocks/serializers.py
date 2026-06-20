from rest_framework import serializers
from .models import FinishedGoodStock, StockMovement

class FinishedGoodStockSerializer(serializers.ModelSerializer):
    disponible = serializers.IntegerField(read_only=True)
    sku = serializers.ReadOnlyField(source='variant.sku')
    model_name = serializers.ReadOnlyField(source='variant.model.name')
    taille = serializers.ReadOnlyField(source='variant.taille')
    couleur = serializers.ReadOnlyField(source='variant.couleur')
    category_name = serializers.SerializerMethodField()
    model_image = serializers.SerializerMethodField()
    prix_vente_conseille = serializers.ReadOnlyField(source='variant.model.prix_vente_conseille')

    class Meta:
        model = FinishedGoodStock
        fields = (
            'id', 'variant', 'quantite_reel', 'quantite_reservee', 'emplacement', 
            'disponible', 'sku', 'model_name', 'taille', 'couleur', 'category_name',
            'model_image', 'prix_vente_conseille'
        )

    def get_category_name(self, obj):
        if obj.variant and obj.variant.model and obj.variant.model.category:
            return str(obj.variant.model.category)
        return None

    def get_model_image(self, obj):
        if obj.variant and obj.variant.model and obj.variant.model.photo_principale:
            url = obj.variant.model.photo_principale.url
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None


class StockMovementSerializer(serializers.ModelSerializer):
    type_mouvement_display = serializers.CharField(source='get_type_mouvement_display', read_only=True)
    emplacement = serializers.ReadOnlyField(source='stock.emplacement')

    class Meta:
        model = StockMovement
        fields = ('id', 'stock', 'quantite', 'type_mouvement', 'type_mouvement_display', 'emplacement', 'description', 'created_at')
        read_only_fields = ('created_at',)
