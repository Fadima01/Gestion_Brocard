from rest_framework import serializers
from .models import Workshop, ProductionOrder, MaterialConsumption, WorkshopPayment, ProductionReceipt

class WorkshopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workshop
        fields = ('id', 'name', 'responsable', 'telephone', 'adresse', 'ville', 'est_actif', 'created_at')
        read_only_fields = ('created_at',)


class MaterialConsumptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaterialConsumption
        fields = ('id', 'production_order', 'raw_material', 'quantite_utilisee_metres')


class WorkshopPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkshopPayment
        fields = ('id', 'production_order', 'date_paiement', 'montant', 'mode_paiement', 'reference_transaction', 'notes')
        read_only_fields = ('date_paiement',)


class ProductionReceiptSerializer(serializers.ModelSerializer):
    created_by_name = serializers.ReadOnlyField(source='created_by.username')

    class Meta:
        model = ProductionReceipt
        fields = ('id', 'production_order', 'quantite_recue', 'date_reception', 'created_by', 'created_by_name')
        read_only_fields = ('date_reception',)


class ProductionOrderSerializer(serializers.ModelSerializer):
    consumptions = MaterialConsumptionSerializer(many=True, read_only=True)
    payments = WorkshopPaymentSerializer(many=True, read_only=True)
    receipts = ProductionReceiptSerializer(many=True, read_only=True)
    materials_data = serializers.JSONField(write_only=True, required=False)
    model_name = serializers.ReadOnlyField(source='model.name')
    category_name = serializers.SerializerMethodField()
    default_variant_id = serializers.SerializerMethodField()
    workshop_name = serializers.ReadOnlyField(source='workshop.name')
    quantite_manquante = serializers.SerializerMethodField()
    reste_a_payer = serializers.SerializerMethodField()

    class Meta:
        model = ProductionOrder
        fields = (
            'id', 'reference', 'workshop', 'workshop_name', 'model', 'model_name', 'category', 'category_name', 'statut', 'date_debut', 
            'date_fin_prevue', 'date_fin_reelle', 'quantite_demandee', 
            'quantite_produite', 'quantite_manquante', 'pieces_defectueuses', 'cout_facon_unitaire', 
            'montant_facon_total', 'montant_facon_paye', 'reste_a_payer', 'statut_paiement_facon',
            'cout_revient_unitaire', 'consumptions', 'payments', 'materials_data', 'default_variant_id', 'receipts'
        )
        read_only_fields = ('reference', 'montant_facon_total', 'montant_facon_paye', 'statut_paiement_facon', 'cout_revient_unitaire')

    def get_category_name(self, obj):
        return str(obj.category) if obj.category else None

    def get_quantite_manquante(self, obj):
        return max(0, obj.quantite_demandee - obj.quantite_produite)

    def get_reste_a_payer(self, obj):
        return max(0, obj.montant_facon_total - obj.montant_facon_paye)

    def get_default_variant_id(self, obj):
        if obj.model:
            variant = obj.model.variants.first()
            return variant.id if variant else None
        return None

    def create(self, validated_data):
        materials_data_raw = validated_data.pop('materials_data', [])
        workshop = validated_data['workshop']
        model = validated_data.get('model')
        category = validated_data.get('category')
        date_debut = validated_data['date_debut']
        date_fin_prevue = validated_data['date_fin_prevue']
        quantite_demandee = validated_data['quantite_demandee']
        cout_facon_unitaire = validated_data['cout_facon_unitaire']
        
        # Charger les matières premières et vérifier le stock
        from apps.achats.models import RawMaterial
        materials_data = []
        for item in materials_data_raw:
            try:
                mat = RawMaterial.objects.get(id=int(item['raw_material']))
                materials_data.append({
                    'raw_material': mat,
                    'quantity_used': float(item['quantite_utilisee'])
                })
            except Exception as e:
                raise serializers.ValidationError(f"Matière première invalide: {e}")
                
        from .services import ProductionService
        try:
            order = ProductionService.create_production_order(
                workshop=workshop,
                start_date=date_debut,
                expected_end_date=date_fin_prevue,
                requested_quantity=quantite_demandee,
                cout_facon_unitaire=cout_facon_unitaire,
                materials_data=materials_data,
                model=model,
                category=category
            )
            return order
        except Exception as e:
            raise serializers.ValidationError(str(e))
