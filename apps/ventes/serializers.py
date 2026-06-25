from rest_framework import serializers
from .models import Customer, Order, OrderLine, CustomerPayment, Reservation
from apps.catalogue.models import ProductVariant

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = ('id', 'nom', 'telephone', 'ville', 'quartier', 'created_at')
        read_only_fields = ('created_at',)


class OrderLineSerializer(serializers.ModelSerializer):
    order_reference = serializers.ReadOnlyField(source='order.reference')
    order_date = serializers.ReadOnlyField(source='order.date_commande')
    customer_name = serializers.ReadOnlyField(source='order.customer.nom')
    order_status = serializers.ReadOnlyField(source='order.statut_commande')
    variant_name = serializers.ReadOnlyField(source='variant.model.name')
    variant_image = serializers.SerializerMethodField()
    payment_mode = serializers.SerializerMethodField()

    class Meta:
        model = OrderLine
        fields = (
            'id', 'order', 'variant', 'quantite', 'prix_unitaire_applique', 
            'order_reference', 'order_date', 'customer_name', 'order_status',
            'variant_name', 'variant_image', 'payment_mode'
        )

    def get_variant_image(self, obj):
        if obj.variant and obj.variant.model and obj.variant.model.photo_principale:
            url = obj.variant.model.photo_principale.url
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None

    def get_payment_mode(self, obj):
        if obj.order:
            modes = list(obj.order.payments.values_list('mode_paiement', flat=True).distinct())
            return ", ".join(modes) if modes else "-"
        return "-"


class CustomerPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerPayment
        fields = (
            'id', 'reference', 'order', 'reservation', 'session_caisse', 'date_paiement', 
            'montant', 'type_paiement', 'mode_paiement', 'notes'
        )
        read_only_fields = ('reference', 'date_paiement',)


class OrderLineWriteSerializer(serializers.Serializer):
    variant = serializers.PrimaryKeyRelatedField(queryset=ProductVariant.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    applied_unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)


class OrderSerializer(serializers.ModelSerializer):
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all(), required=False)
    customer_data = serializers.DictField(write_only=True, required=False)
    lines = OrderLineSerializer(many=True, read_only=True)
    payments = CustomerPaymentSerializer(many=True, read_only=True)
    items = OrderLineWriteSerializer(many=True, write_only=True, required=False)
    
    # Optional fields for auto-creating a delivery during order creation
    adresse_livraison = serializers.CharField(write_only=True, required=False, allow_blank=True)
    frais_livraison = serializers.DecimalField(write_only=True, required=False, max_digits=12, decimal_places=2)
    livraison_a_domicile = serializers.BooleanField(write_only=True, required=False, default=False)
    livreur_nom = serializers.CharField(write_only=True, required=False, allow_blank=True)
    livreur_telephone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    statut_livraison = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Order
        fields = (
            'id', 'customer', 'customer_data', 'reference', 'date_commande', 'canal_vente', 
            'statut_commande', 'montant_total', 'acompte_verse', 
            'reste_a_payer', 'statut_paiement', 'livraison_necessaire', 
            'adresse_livraison', 'frais_livraison', 'lines', 'payments', 'items',
            'livraison_a_domicile', 'livreur_nom', 'livreur_telephone', 'statut_livraison'
        )
        read_only_fields = ('reference', 'montant_total', 'acompte_verse', 'reste_a_payer', 'statut_paiement')

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        adresse_livraison = validated_data.pop('adresse_livraison', '')
        frais_livraison = validated_data.pop('frais_livraison', 0)
        livraison_necessaire = validated_data.get('livraison_necessaire', False)
        
        livraison_a_domicile = validated_data.pop('livraison_a_domicile', False)
        livreur_nom = validated_data.pop('livreur_nom', '')
        livreur_telephone = validated_data.pop('livreur_telephone', '')
        statut_livraison = validated_data.pop('statut_livraison', 'PENDING')
        
        if livraison_a_domicile:
            livraison_necessaire = True
            validated_data['livraison_necessaire'] = True
        
        customer_data = validated_data.pop('customer_data', None)
        if customer_data:
            phone = customer_data.get('telephone')
            nom = customer_data.get('nom')
            ville = customer_data.get('ville', '')
            quartier = customer_data.get('quartier', '')
            
            if not phone or not nom:
                raise serializers.ValidationError("Nom complet et téléphone sont requis pour créer un client.")
            
            customer, created = Customer.objects.get_or_create(
                telephone=phone,
                defaults={
                    'nom': nom,
                    'ville': ville,
                    'quartier': quartier
                }
            )
            if not created:
                updated = False
                if nom and customer.nom != nom:
                    customer.nom = nom
                    updated = True
                if ville and not customer.ville:
                    customer.ville = ville
                    updated = True
                if quartier and not customer.quartier:
                    customer.quartier = quartier
                    updated = True
                if updated:
                    customer.save()
            validated_data['customer'] = customer
            
        if 'customer' not in validated_data:
            raise serializers.ValidationError("Le client (ID) ou les données du client (customer_data) sont requis.")
            
        customer = validated_data['customer']
        canal_vente = validated_data['canal_vente']
        
        # Formatage des lignes pour le service
        lines_data = []
        for item in items_data:
            lines_data.append({
                'variant': item['variant'],
                'quantity': item['quantity'],
                'applied_unit_price': item['applied_unit_price']
            })
            
        from .services import OrderService
        try:
            order = OrderService.create_order(
                customer=customer,
                sales_channel=canal_vente,
                lines_data=lines_data,
                deposit_paid=0
            )
            order.livraison_necessaire = livraison_necessaire
            order.save()

            if livraison_necessaire:
                from apps.livraisons.models import Delivery
                addr = adresse_livraison or f"Livraison à {customer.quartier or customer.ville or 'Magasin'} pour {customer.nom}"
                
                status_map = {
                    'PENDING': 'PENDING',
                    'SHIPPING': 'SHIPPING',
                    'DELIVERED': 'DELIVERED',
                    'DELIVERED_COLLECTED': 'DELIVERED_COLLECTED',
                    'RETURNED': 'RETURNED',
                    'En attente': 'PENDING',
                    'En cours': 'SHIPPING',
                    'Livrée': 'DELIVERED',
                    'Livrée et argent remis': 'DELIVERED_COLLECTED',
                    'Retournée': 'RETURNED',
                }
                
                delivery_status = status_map.get(statut_livraison, 'PENDING')
                fee = 0 if livraison_a_domicile else frais_livraison
                
                Delivery.objects.create(
                    order=order,
                    adresse_livraison=addr,
                    frais_livraison=fee,
                    statut_livraison=delivery_status,
                    livreur_nom=livreur_nom,
                    livreur_telephone=livreur_telephone
                )
            return order
        except Exception as e:
            raise serializers.ValidationError(str(e))


class ReservationSerializer(serializers.ModelSerializer):
    customer_name = serializers.ReadOnlyField(source='customer.nom')
    customer_phone = serializers.ReadOnlyField(source='customer.telephone')
    model_name = serializers.ReadOnlyField(source='model.name')
    model_image = serializers.SerializerMethodField()
    payments = CustomerPaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Reservation
        fields = (
            'id', 'reference', 'customer', 'customer_name', 'customer_phone',
            'model', 'model_name', 'model_image', 'quantite',
            'date_limite', 'montant_verse', 'montant_restant', 'statut',
            'payments', 'created_at', 'updated_at'
        )
        read_only_fields = ('reference', 'montant_restant', 'created_at', 'updated_at')
    def get_model_image(self, obj):
        if obj.model and obj.model.photo_principale:
            url = obj.model.photo_principale.url
            request = self.context.get('request')
            if request is not None:
                return request.build_absolute_uri(url)
            return url
        return None
