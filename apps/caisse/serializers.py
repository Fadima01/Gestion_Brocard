from rest_framework import serializers
from .models import CashSession, CaisseMouvement

class CashSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashSession
        fields = (
            'id', 'responsible', 'opening_date', 'closing_date', 
            'initial_amount', 'cash_sales_collected', 'cash_expenses', 
            'theoretical_amount', 'real_amount', 'cash_discrepancy', 
            'status', 'notes'
        )
        read_only_fields = (
            'opening_date', 'closing_date', 'cash_sales_collected', 
            'cash_expenses', 'theoretical_amount', 'cash_discrepancy', 'status'
        )


class CaisseMouvementSerializer(serializers.ModelSerializer):
    class Meta:
        model = CaisseMouvement
        fields = (
            'id', 'date_mouvement', 'type_mouvement', 'montant', 
            'mode_paiement', 'description', 'created_at'
        )
        read_only_fields = ('created_at',)
