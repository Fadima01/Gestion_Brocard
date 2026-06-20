from rest_framework import serializers
from .models import Delivery

class DeliverySerializer(serializers.ModelSerializer):
    order_reference = serializers.ReadOnlyField(source='order.reference')
    customer_name = serializers.ReadOnlyField(source='order.customer.nom')
    customer_phone = serializers.ReadOnlyField(source='order.customer.telephone')
    order_amount = serializers.ReadOnlyField(source='order.montant_total')
    order_payment_status = serializers.ReadOnlyField(source='order.statut_paiement')

    class Meta:
        model = Delivery
        fields = (
            'id', 'order', 'order_reference', 'customer_name', 'customer_phone', 'order_amount', 'order_payment_status',
            'statut_livraison', 'adresse_livraison', 
            'livreur_nom', 'livreur_prenom', 'livreur_telephone',
            'frais_livraison', 'date_livraison_reelle', 'observations',
            'montant_encaisse_livreur', 'mode_paiement_recu', 'argent_remis_a_brocard',
            'montant_remis', 'date_remise_argent', 'created_at'
        )
        read_only_fields = ('created_at',)
