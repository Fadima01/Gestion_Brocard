from rest_framework import serializers
from .models import Supplier, FabricPurchase, RawMaterial, RawMaterialMovement

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ('id', 'name', 'responsable', 'telephone', 'adresse', 'ville', 'est_actif', 'created_at')
        read_only_fields = ('created_at',)


class RawMaterialSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier_display.name', read_only=True)
    date_achat_display = serializers.DateField(read_only=True)
    montant_total_achat = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    purchase_reference = serializers.CharField(source='fabric_purchase.reference', read_only=True)

    class Meta:
        model = RawMaterial
        fields = (
            'id', 'fabric_purchase', 'purchase_reference', 'type_matiere', 'couleur', 
            'quantite_achetee_metres', 'quantite_restante_metres', 
            'prix_achat_metre', 'date_reception', 'is_archived', 'seuil_alerte',
            'categorie', 'unite_mesure', 'supplier', 'supplier_name',
            'date_achat', 'date_achat_display', 'observations', 'montant_total_achat'
        )


class RawMaterialMovementSerializer(serializers.ModelSerializer):
    raw_material_name = serializers.CharField(source='raw_material.type_matiere', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    production_order_ref = serializers.ReadOnlyField(source='production_order.reference')
    fabric_purchase_ref = serializers.ReadOnlyField(source='fabric_purchase.reference')

    class Meta:
        model = RawMaterialMovement
        fields = (
            'id', 'raw_material', 'raw_material_name', 'user', 'user_name', 
            'created_at', 'old_quantity', 'new_quantity', 'difference', 
            'operation_type', 'description',
            'production_order', 'production_order_ref',
            'fabric_purchase', 'fabric_purchase_ref'
        )


class FabricPurchaseSerializer(serializers.ModelSerializer):
    raw_materials = RawMaterialSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)

    class Meta:
        model = FabricPurchase
        fields = ('id', 'reference', 'supplier', 'supplier_name', 'date_achat', 'montant_total', 'statut_paiement', 'raw_materials')
        read_only_fields = ('reference',)
