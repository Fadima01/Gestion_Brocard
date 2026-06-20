from rest_framework import serializers
from .models import Supplier, FabricPurchase, RawMaterial, RawMaterialMovement

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ('id', 'name', 'responsable', 'telephone', 'adresse', 'ville', 'est_actif', 'created_at')
        read_only_fields = ('created_at',)


class RawMaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = RawMaterial
        fields = (
            'id', 'fabric_purchase', 'type_matiere', 'couleur', 
            'quantite_achetee_metres', 'quantite_restante_metres', 
            'prix_achat_metre', 'date_reception', 'is_archived', 'seuil_alerte',
            'categorie', 'unite_mesure'
        )


class RawMaterialMovementSerializer(serializers.ModelSerializer):
    raw_material_name = serializers.CharField(source='raw_material.type_matiere', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = RawMaterialMovement
        fields = (
            'id', 'raw_material', 'raw_material_name', 'user', 'user_name', 
            'created_at', 'old_quantity', 'new_quantity', 'difference', 
            'operation_type', 'description'
        )


class FabricPurchaseSerializer(serializers.ModelSerializer):
    raw_materials = RawMaterialSerializer(many=True, read_only=True)

    class Meta:
        model = FabricPurchase
        fields = ('id', 'supplier', 'date_achat', 'montant_total', 'statut_paiement', 'raw_materials')
