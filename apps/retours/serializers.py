from rest_framework import serializers
from .models import CustomerReturn, ReturnLine

class ReturnLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnLine
        fields = ('id', 'customer_return', 'variant', 'quantite', 'motif', 'reintegre_stock', 'notes')


class CustomerReturnSerializer(serializers.ModelSerializer):
    lines = ReturnLineSerializer(many=True, read_only=True)

    class Meta:
        model = CustomerReturn
        fields = ('id', 'order', 'date_retour', 'statut_retour', 'montant_rembourse', 'accredite_avoir', 'lines')
        read_only_fields = ('date_retour',)
