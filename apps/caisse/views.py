from decimal import Decimal
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import CashSession
from .serializers import CashSessionSerializer
from .services import CashRegisterService
from apps.remunerations.models import CompanyMember

class CashSessionViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les sessions de caisse boutique.
    """
    queryset = CashSession.objects.all()
    serializer_class = CashSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'responsible']

    @action(detail=False, methods=['post'], url_path='open')
    def open_session(self, request):
        """
        Action pour ouvrir une session de caisse journalière.
        Arguments POST: responsible_id (int), initial_amount (Decimal), notes (str, optionnel)
        """
        resp_id = request.data.get('responsible_id')
        initial_amount = request.data.get('initial_amount')
        notes = request.data.get('notes', '')

        if not all([resp_id, initial_amount]):
            return Response(
                {"error": "responsible_id et initial_amount sont requis."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            responsible = CompanyMember.objects.get(id=resp_id)
            session = CashRegisterService.open_session(
                responsible=responsible,
                initial_amount=Decimal(str(initial_amount)),
                notes=notes
            )
            from apps.core.models import log_activity
            log_activity(
                user=self.request.user,
                action="ouverture de caisse",
                details=f"Caisse ouverte par {responsible.nom} avec un montant initial de {initial_amount} FCFA"
            )
            serializer = self.get_serializer(session)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], url_path='close')
    def close_session(self, request, pk=None):
        """
        Action pour clôturer une session de caisse en indiquant le montant physique compté.
        Arguments POST: real_amount (Decimal), notes (str, optionnel)
        """
        session = self.get_object()
        real_amount = request.data.get('real_amount')
        notes = request.data.get('notes', '')

        if real_amount is None:
            return Response(
                {"error": "real_amount est requis pour la clôture."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            closed_session = CashRegisterService.close_session(
                session=session,
                real_amount=Decimal(str(real_amount)),
                notes=notes
            )
            from apps.core.models import log_activity
            log_activity(
                user=self.request.user,
                action="fermeture de caisse",
                details=f"Caisse clôturée par {session.responsible.nom if session.responsible else 'Inconnu'}. Montant réel: {real_amount} FCFA, Théorique: {session.theoretical_amount} FCFA, Écart: {session.difference} FCFA"
            )
            serializer = self.get_serializer(closed_session)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


from django.db.models import Sum, Q
from django.db.models.functions import Coalesce
from decimal import Decimal
from rest_framework import filters
from .models import CaisseMouvement
from .serializers import CaisseMouvementSerializer

class CaisseMouvementViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les mouvements de la caisse globale.
    """
    queryset = CaisseMouvement.objects.all()
    serializer_class = CaisseMouvementSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type_mouvement', 'mode_paiement']
    search_fields = ['description', 'mode_paiement']
    ordering_fields = ['date_mouvement', 'montant']

    @action(detail=False, methods=['get'], url_path='global')
    def get_global_status(self, request):
        """
        Retourne le solde actuel et les statistiques cumulées de la Caisse Globale.
        """
        total_entrees = CaisseMouvement.objects.filter(type_mouvement='ENTREE').aggregate(
            total=Coalesce(Sum('montant'), Decimal('0.00'))
        )['total']

        total_sorties = CaisseMouvement.objects.filter(type_mouvement='SORTIE').aggregate(
            total=Coalesce(Sum('montant'), Decimal('0.00'))
        )['total']

        solde_actuel = total_entrees - total_sorties

        total_ventes = CaisseMouvement.objects.filter(
            type_mouvement='ENTREE'
        ).filter(
            Q(customer_payment__isnull=False) | Q(reservation__isnull=False)
        ).aggregate(
            total=Coalesce(Sum('montant'), Decimal('0.00'))
        )['total']

        total_depenses = CaisseMouvement.objects.filter(
            type_mouvement='SORTIE',
            expense__isnull=False
        ).aggregate(
            total=Coalesce(Sum('montant'), Decimal('0.00'))
        )['total']

        return Response({
            'solde_actuel': solde_actuel,
            'total_ventes': total_ventes,
            'total_depenses': total_depenses,
            'total_entrees': total_entrees,
            'total_sorties': total_sorties
        }, status=status.HTTP_200_OK)
