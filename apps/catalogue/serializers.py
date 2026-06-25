from rest_framework import serializers
from .models import ClothingModel, ModelPhoto, ProductVariant, PriceCategory

class PriceCategorySerializer(serializers.ModelSerializer):
    total_fabrique = serializers.SerializerMethodField()
    total_vendu = serializers.SerializerMethodField()
    total_reserve = serializers.SerializerMethodField()
    stock_disponible = serializers.SerializerMethodField()

    class Meta:
        model = PriceCategory
        fields = ('id', 'prix', 'stock_global', 'total_fabrique', 'total_vendu', 'total_reserve', 'stock_disponible')
        read_only_fields = ('stock_global',)

    def get_total_vendu(self, obj):
        from apps.ventes.models import OrderLine
        from django.db.models import Sum
        res = OrderLine.objects.filter(
            variant__model__category=obj,
            order__statut_commande__in=['VALIDATED', 'SHIPPING', 'DELIVERED']
        ).aggregate(total_vendu=Sum('quantite'))
        return res['total_vendu'] or 0

    def get_total_reserve(self, obj):
        from apps.ventes.models import Reservation
        from django.db.models import Sum
        res = Reservation.objects.filter(
            model__category=obj,
            statut__in=['EN_ATTENTE', 'PAIEMENT_PARTIEL', 'PAYEE', 'PENDING', 'CONFIRMED']
        ).aggregate(total_reserved=Sum('quantite'))
        return res['total_reserved'] or 0

    def get_total_fabrique(self, obj):
        from apps.production.models import ProductionOrder
        from django.db.models import Sum
        return ProductionOrder.objects.filter(category=obj).aggregate(total=Sum('quantite_produite'))['total'] or 0

    def get_stock_disponible(self, obj):
        total_fabrique = self.get_total_fabrique(obj)
        total_vendu = self.get_total_vendu(obj)
        total_reserve = self.get_total_reserve(obj)
        return max(0, total_fabrique - total_vendu - total_reserve)


class ModelPhotoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ModelPhoto
        fields = ('id', 'model', 'image', 'ordre_affichage', 'legende')




class ProductVariantSerializer(serializers.ModelSerializer):
    price = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True, source='get_price')

    class Meta:
        model = ProductVariant
        fields = ('id', 'model', 'sku', 'taille', 'couleur', 'prix_vente_specifique', 'price')


class ClothingModelSerializer(serializers.ModelSerializer):
    gallery_photos = ModelPhotoSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    stock_disponible = serializers.SerializerMethodField()
    stock_reserve = serializers.SerializerMethodField()
    stock_vendu = serializers.SerializerMethodField()
    marge_brute = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    benefice_net = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ClothingModel
        fields = (
            'id', 'name', 'description', 'photo_principale', 'prix_vente_conseille', 
            'is_available', 'is_archived', 'gallery_photos', 'variants', 
            'stock_disponible', 'stock_reserve', 'stock_vendu', 'category', 'quantite_affectee',
            'cout_matieres_premieres', 'cout_confection', 'depenses_associees',
            'marge_brute', 'benefice_net', 'created_at'
        )
        read_only_fields = ('created_at',)



    def get_stock_disponible(self, obj):
        from apps.stocks.models import FinishedGoodStock
        from django.db.models import Sum, F
        res = FinishedGoodStock.objects.filter(variant__model=obj).aggregate(
            total_dispo=Sum(F('quantite_reel') - F('quantite_reservee'))
        )
        return res['total_dispo'] or 0

    def get_stock_reserve(self, obj):
        from apps.stocks.models import FinishedGoodStock
        from django.db.models import Sum
        res = FinishedGoodStock.objects.filter(variant__model=obj).aggregate(
            total_reserved=Sum('quantite_reservee')
        )
        return res['total_reserved'] or 0

    def get_stock_vendu(self, obj):
        from apps.ventes.models import OrderLine
        from django.db.models import Sum
        res = OrderLine.objects.filter(
            variant__model=obj, 
            order__statut_commande__in=['VALIDATED', 'SHIPPING', 'DELIVERED']
        ).aggregate(total_vendu=Sum('quantite'))
        return res['total_vendu'] or 0

