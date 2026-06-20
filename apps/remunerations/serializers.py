from rest_framework import serializers
from .models import CompanyMember, MonthlyCompensation, SalaryAdvance, CompensationPayment

class CompanyMemberSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyMember
        fields = (
            'id', 'first_name', 'last_name', 'role', 'telephone', 
            'remuneration_mensuelle_standard', 'date_embauche', 'est_actif'
        )


class SalaryAdvanceSerializer(serializers.ModelSerializer):
    grant_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = SalaryAdvance
        fields = ('id', 'member', 'grant_date', 'amount', 'status', 'notes')
        read_only_fields = ('status',)

    def validate(self, attrs):
        if 'grant_date' not in attrs or attrs['grant_date'] is None:
            from django.utils import timezone
            attrs['grant_date'] = timezone.now().date()
        return attrs


class CompensationPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompensationPayment
        fields = ('id', 'monthly_compensation', 'payment_date', 'amount', 'payment_mode', 'transaction_reference', 'notes')
        read_only_fields = ('payment_date',)


class MonthlyCompensationSerializer(serializers.ModelSerializer):
    payments = CompensationPaymentSerializer(many=True, read_only=True)

    class Meta:
        model = MonthlyCompensation
        fields = (
            'id', 'member', 'mois', 'annee', 'montant_du', 'avances_deduites', 
            'net_amount_payable', 'paid_amount', 'amount_remaining', 'payment_status', 'payments'
        )
        read_only_fields = ('avances_deduites', 'net_amount_payable', 'paid_amount', 'amount_remaining', 'payment_status')
