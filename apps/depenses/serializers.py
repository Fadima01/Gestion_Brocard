from rest_framework import serializers
from .models import Expense

class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = (
            'id', 'reference', 'categorie', 'montant', 'date_depense', 
            'description', 'ordre_production', 'session_caisse', 'fabric_purchase'
        )
        read_only_fields = ('reference',)
