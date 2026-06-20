from decimal import Decimal
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import CompanyMember, MonthlyCompensation, SalaryAdvance, CompensationPayment
from .serializers import (
    CompanyMemberSerializer, MonthlyCompensationSerializer, 
    SalaryAdvanceSerializer, CompensationPaymentSerializer
)
from .services import PayrollService
from apps.core.permissions import IsAdminUser

class CompanyMemberViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les fiches collaborateurs de l'entreprise familiale.
    Accès réservé aux administrateurs.
    """
    queryset = CompanyMember.objects.all()
    serializer_class = CompanyMemberSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['est_actif', 'role']
    search_fields = ['first_name', 'last_name', 'role', 'telephone']
    ordering_fields = ['last_name', 'hire_date']


class MonthlyCompensationViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les bulletins de paie mensuels et acomptes.
    Accès réservé aux administrateurs.
    """
    queryset = MonthlyCompensation.objects.all()
    serializer_class = MonthlyCompensationSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['annee', 'mois', 'payment_status', 'member']
    ordering_fields = ['annee', 'mois', 'net_amount_payable']

    @action(detail=False, methods=['post'], url_path='generate')
    def generate_payroll(self, request):
        """
        Action pour générer la paie mensuelle pour un collaborateur et déduire ses avances approuvées.
        Arguments POST: member_id (int), month (int), year (int)
        """
        member_id = request.data.get('member_id')
        month = request.data.get('month')
        year = request.data.get('year')

        if not all([member_id, month, year]):
            return Response(
                {"error": "member_id, month et year sont requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            member = CompanyMember.objects.get(id=member_id)
            payroll = PayrollService.generate_monthly_payroll(
                member=member,
                month=int(month),
                year=int(year)
            )
            serializer = self.get_serializer(payroll)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='pay')
    def pay_payroll(self, request, pk=None):
        """
        Action pour enregistrer un versement financier sur une fiche de paie mensuelle.
        Arguments POST: amount (Decimal), payment_mode (str), transaction_reference (str, optionnel), notes (str, optionnel)
        """
        payroll = self.get_object()
        amount = request.data.get('amount')
        mode = request.data.get('payment_mode')
        ref = request.data.get('transaction_reference', '')
        notes = request.data.get('notes', '')

        if amount is None or mode is None:
            return Response(
                {"error": "amount et payment_mode sont requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payment = PayrollService.pay_monthly_compensation(
                payroll=payroll,
                amount=Decimal(str(amount)),
                payment_mode=mode,
                transaction_reference=ref,
                notes=notes
            )
            serializer = CompensationPaymentSerializer(payment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class SalaryAdvanceViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les acomptes/avances de salaires.
    Accès réservé aux administrateurs.
    """
    queryset = SalaryAdvance.objects.all()
    serializer_class = SalaryAdvanceSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['status', 'member']
    ordering_fields = ['grant_date', 'amount']

    @action(detail=True, methods=['post'], url_path='approve')
    def approve_advance(self, request, pk=None):
        """
        Action pour approuver une demande d'avance sur salaire.
        """
        advance = self.get_object()
        try:
            approved = PayrollService.approve_salary_advance(advance)
            serializer = self.get_serializer(approved)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject_advance(self, request, pk=None):
        """
        Action pour rejeter une demande d'avance sur salaire.
        """
        advance = self.get_object()
        try:
            rejected = PayrollService.reject_salary_advance(advance)
            serializer = self.get_serializer(rejected)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CompensationPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CompensationPayment.objects.all()
    serializer_class = CompensationPaymentSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['monthly_compensation', 'payment_mode']
    search_fields = ['transaction_reference', 'notes']
    ordering_fields = ['payment_date']
