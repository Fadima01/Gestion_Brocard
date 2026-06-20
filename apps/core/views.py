from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status, viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import ActivityLog
from .serializers import ActivityLogSerializer
from .permissions import IsAdminUser
from django.db import models
from django.db.models import Sum, Count, Avg, F
from django.db.models.functions import Coalesce
from django.utils import timezone
from decimal import Decimal

from apps.ventes.models import Order, OrderLine
from apps.catalogue.models import ProductVariant, ClothingModel
from apps.production.models import ProductionOrder
from apps.remunerations.models import MonthlyCompensation
from apps.caisse.models import CashSession
from apps.depenses.models import Expense

class DashboardAPIView(APIView):
    """
    Vue API REST optimisée pour calculer et exposer l'ensemble des indicateurs du tableau de bord de direction.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        today = timezone.now().date()

        # 1. Chiffre d'Affaires du jour (hors Brouillons et Commandes annulées)
        today_sales = Order.objects.filter(
            date_commande__date=today
        ).exclude(
            statut_commande__in=['DRAFT', 'CANCELLED']
        ).aggregate(
            total=Coalesce(Sum('montant_total'), Decimal('0.00'))
        )['total']

        # 2. Chiffre d'Affaires du mois
        month_sales = Order.objects.filter(
            date_commande__year=today.year,
            date_commande__month=today.month
        ).exclude(
            statut_commande__in=['DRAFT', 'CANCELLED']
        ).aggregate(
            total=Coalesce(Sum('montant_total'), Decimal('0.00'))
        )['total']

        # 3. Nombre de ventes du jour
        today_sales_count = Order.objects.filter(
            date_commande__date=today
        ).exclude(
            statut_commande__in=['DRAFT', 'CANCELLED']
        ).count()

        # 4. Nombre de fabrications en cours
        active_productions = ProductionOrder.objects.filter(
            statut='IN_PROGRESS'
        ).count()

        # 4b. Nombre de fabrications en réception partielle
        partial_productions = ProductionOrder.objects.filter(
            statut='PARTIAL'
        ).count()

        # 5. Nombre de fabrications terminées (ce mois-ci)
        completed_productions = ProductionOrder.objects.filter(
            statut='COMPLETED',
            date_fin_reelle__year=today.year,
            date_fin_reelle__month=today.month
        ).count()

        # 5b. Indicateurs de confections (actifs ou complétés ce mois-ci)
        confections_of_interest = ProductionOrder.objects.filter(
            models.Q(statut__in=['IN_PROGRESS', 'PARTIAL']) |
            models.Q(statut='COMPLETED', date_fin_reelle__year=today.year, date_fin_reelle__month=today.month)
        )
        robes_demandees = confections_of_interest.aggregate(total=Coalesce(Sum('quantite_demandee'), 0))['total']
        robes_receues = confections_of_interest.aggregate(total=Coalesce(Sum('quantite_produite'), 0))['total']
        robes_manquantes = confections_of_interest.aggregate(total=Coalesce(Sum('pieces_defectueuses'), 0))['total']
        
        taux_realisation = 0.0
        if robes_demandees > 0:
            taux_realisation = round((float(robes_receues) / float(robes_demandees)) * 100, 1)

        # 6. Commandes en attente (uniquement PENDING ou EN_ATTENTE)
        pending_orders = Order.objects.filter(
            statut_commande__in=['PENDING', 'EN_ATTENTE']
        ).count()

        # 7. Matières premières en alerte de stock (quantité restante < seuil d'alerte, non archivé)
        from apps.achats.models import RawMaterial
        raw_materials_alert = RawMaterial.objects.filter(
            is_archived=False,
            quantite_restante_metres__lt=F('seuil_alerte')
        ).count()

        # 8. Produits finis : calculés sur les variantes de modèles non archivés
        active_variants = ProductVariant.objects.filter(
            model__is_archived=False
        ).annotate(
            total_dispo=Coalesce(Sum(models.F('stocks__quantite_reel') - models.F('stocks__quantite_reservee')), 0)
        )

        produits_finis_en_rupture = active_variants.filter(total_dispo=0).count()
        produits_finis_stock_faible = active_variants.filter(total_dispo__gte=1, total_dispo__lt=5).count()

        # 8b. Stock réel disponible (somme des disponibles des variantes de modèles non archivés)
        from apps.stocks.models import FinishedGoodStock
        stock_reel_disponible = FinishedGoodStock.objects.filter(
            variant__model__is_archived=False
        ).aggregate(
            total=Coalesce(Sum(models.F('quantite_reel') - models.F('quantite_reservee')), 0)
        )['total']

        # 9. Solde de la caisse globale
        from apps.caisse.models import CaisseMouvement
        total_entrees = CaisseMouvement.objects.filter(type_mouvement='ENTREE').aggregate(
            total=Coalesce(Sum('montant'), Decimal('0.00'))
        )['total']
        total_sorties = CaisseMouvement.objects.filter(type_mouvement='SORTIE').aggregate(
            total=Coalesce(Sum('montant'), Decimal('0.00'))
        )['total']
        solde_caisse_globale = total_entrees - total_sorties

        # 10. Montant des dépenses du mois
        month_expenses = Expense.objects.filter(
            date_depense__year=today.year,
            date_depense__month=today.month
        ).aggregate(
            total=Coalesce(Sum('montant'), Decimal('0.00'))
        )['total']

        # 11. Salaires du mois (MonthlyCompensation du mois en cours)
        month_salaries_due = MonthlyCompensation.objects.filter(
            annee=today.year,
            mois=today.month
        ).aggregate(
            total=Coalesce(Sum('net_amount_payable'), Decimal('0.00'))
        )['total']

        # 12. Calcul du COGS du mois (coût des marchandises vendues pour les commandes du mois en cours)
        model_costs = ClothingModel.objects.annotate(
            avg_unit_cost=Coalesce(
                Avg('production_orders__cout_revient_unitaire', filter=models.Q(production_orders__statut='COMPLETED')),
                Decimal('0.00'),
                output_field=models.DecimalField()
            )
        )
        cost_map = {m.id: m.avg_unit_cost for m in model_costs}

        month_order_lines = OrderLine.objects.filter(
            order__date_commande__year=today.year,
            order__date_commande__month=today.month
        ).exclude(
            order__statut_commande__in=['DRAFT', 'CANCELLED']
        ).select_related('variant', 'variant__model')

        month_cogs = Decimal('0.00')
        for line in month_order_lines:
            model_id = line.variant.model.id
            unit_cost = cost_map.get(model_id, Decimal('0.00'))
            month_cogs += line.quantite * unit_cost

        # 13. Bénéfice estimé du mois
        # Bénéfice brut = ventes du mois - COGS du mois
        # Bénéfice net estimé = bénéfice brut - dépenses d'exploitation du mois - salaires du mois
        benefice_brut_mois = month_sales - month_cogs
        benefice_estime_mois = benefice_brut_mois - month_expenses - month_salaries_due

        # Alertes stocks faibles détaillées (limitées à 10 pour affichage tableau de bord, uniquement non archivés)
        low_stock_variants = ProductVariant.objects.filter(
            model__is_archived=False
        ).annotate(
            total_dispo=Coalesce(Sum(models.F('stocks__quantite_reel') - models.F('stocks__quantite_reservee')), 0)
        ).filter(
            total_dispo__lt=5
        ).select_related('model', 'model__category')[:10]

        low_stock_list = []
        for v in low_stock_variants:
            photo_url = None
            if v.model.photo_principale:
                photo_url = v.model.photo_principale.url
                photo_url = request.build_absolute_uri(photo_url) if request else photo_url
            
            category_price = v.model.category.prix if v.model.category else v.model.prix_vente_conseille

            low_stock_list.append({
                'id': v.id,
                'sku': v.sku,
                'name': v.model.name,
                'category_price': category_price,
                'taille': v.taille,
                'couleur': v.couleur,
                'stock': v.total_dispo,
                'photo': photo_url
            })

        # Structuration de la réponse JSON
        data = {
            'indicators': {
                'chiffre_d_affaires_jour': today_sales,
                'chiffre_d_affaires_mois': month_sales,
                'benefice_estime_mois': benefice_estime_mois,
                'ventes_du_jour': today_sales_count,
                'production_en_cours': active_productions,
                'production_reception_partielle': partial_productions,
                'production_terminees_mois': completed_productions,
                'commandes_en_attente': pending_orders,
                'matieres_premieres_en_alerte': raw_materials_alert,
                'produits_finis_en_rupture': produits_finis_en_rupture,
                'produits_finis_stock_faible': produits_finis_stock_faible,
                'stock_reel_disponible': stock_reel_disponible,
                'montant_depenses_mois': month_expenses,
                'solde_caisse_globale': solde_caisse_globale,
                'robes_demandees': robes_demandees,
                'robes_receues': robes_receues,
                'robes_manquantes': robes_manquantes,
                'taux_realisation': taux_realisation,
            },
            'alertes_stock_faible': low_stock_list
        }

        return Response(data, status=status.HTTP_200_OK)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API pour consulter le journal d'activité global (Admin uniquement).
    """
    queryset = ActivityLog.objects.all().select_related('user')
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAuthenticated, IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['user', 'action']
    search_fields = ['action', 'details', 'user__username', 'user__first_name', 'user__last_name']
    ordering_fields = ['timestamp']
    ordering = ['-timestamp']

