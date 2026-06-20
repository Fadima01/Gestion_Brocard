from decimal import Decimal
from rest_framework import viewsets, filters, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import Customer, Order, OrderLine, CustomerPayment, Reservation
from .serializers import (
    CustomerSerializer, OrderSerializer, 
    OrderLineSerializer, CustomerPaymentSerializer,
    ReservationSerializer
)
from .services import OrderService
from apps.caisse.models import CashSession
from apps.core.models import log_activity
from apps.core.choices import SalesChannel, OrderStatus, PaymentStatus

class CustomerViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les clients de la boutique.
    """
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['ville']
    search_fields = ['nom', 'telephone', 'ville']
    ordering_fields = ['nom', 'created_at']


class OrderViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les commandes et ventes.
    """
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut_commande', 'statut_paiement', 'canal_vente', 'customer']
    search_fields = ['reference', 'customer__nom', 'customer__telephone']
    ordering_fields = ['date_commande', 'montant_total']

    def perform_create(self, serializer):
        order = serializer.save()
        log_activity(
            user=self.request.user,
            action="création de vente",
            details=f"Vente {order.reference} créée pour le client {order.customer.nom} (Montant: {order.montant_total} FCFA, Statut: {order.statut_commande})"
        )

    def perform_update(self, serializer):
        old_order = self.get_object()
        old_status = old_order.statut_commande
        order = serializer.save()
        new_status = order.statut_commande
        if old_status != new_status:
            if new_status == 'CANCELLED':
                log_activity(
                    user=self.request.user,
                    action="annulation de vente",
                    details=f"Vente {order.reference} annulée pour le client {order.customer.nom}"
                )
            elif old_status == 'DRAFT' and new_status == 'VALIDATED':
                log_activity(
                    user=self.request.user,
                    action="création de vente",
                    details=f"Vente {order.reference} validée pour le client {order.customer.nom} (Montant: {order.montant_total} FCFA)"
                )

    @action(detail=True, methods=['post'], url_path='pay')
    def pay_order(self, request, pk=None):
        """
        Action personnalisée pour enregistrer un encaissement (acompte, solde, etc.) sur la commande.
        Supporte également le mode de paiement 'Mixte' avec des splits.
        """
        order = self.get_object()
        mode = request.data.get('payment_mode')
        pay_type = request.data.get('payment_type')
        notes = request.data.get('notes', '')

        if mode == 'Mixte':
            splits = request.data.get('payment_splits', [])
            if not splits:
                return Response(
                    {"error": "Pour un paiement mixte, vous devez spécifier les montants par mode de paiement (payment_splits)."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            created_payments = []
            from django.db import transaction
            try:
                with transaction.atomic():
                    for split in splits:
                        split_mode = split['mode']
                        split_amount = Decimal(str(split['amount']))
                        
                        payment = OrderService.record_payment(
                            order=order,
                            amount=split_amount,
                            payment_type=pay_type,
                            payment_mode=split_mode,
                            notes=notes
                        )
                        created_payments.append(payment)
                serializer = CustomerPaymentSerializer(created_payments, many=True)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        else:
            amount = request.data.get('amount')
            if amount is None or pay_type is None or mode is None:
                return Response(
                    {"error": "amount, payment_type et payment_mode sont requis."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                payment = OrderService.record_payment(
                    order=order,
                    amount=Decimal(str(amount)),
                    payment_type=pay_type,
                    payment_mode=mode,
                    notes=notes
                )
                serializer = CustomerPaymentSerializer(payment)
                return Response(serializer.data, status=status.HTTP_201_CREATED)
            except Exception as e:
                return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class OrderLineViewSet(viewsets.ModelViewSet):
    queryset = OrderLine.objects.all()
    serializer_class = OrderLineSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['order', 'variant', 'variant__model']

    def get_queryset(self):
        queryset = super().get_queryset()
        variant_model = self.request.query_params.get('variant__model')
        
        category_id = None
        variant_id = None
        if variant_model:
            from apps.catalogue.models import ClothingModel
            try:
                model_obj = ClothingModel.objects.get(pk=variant_model)
                category_id = model_obj.category_id
                first_variant = model_obj.variants.first()
                if first_variant:
                    variant_id = first_variant.id
            except ClothingModel.DoesNotExist:
                pass

        print("=== BACKEND ORDERLINE LOG ===")
        print(f"  model_id reçu: {variant_model}")
        print(f"  category_id reçu: {category_id}")
        print(f"  variant_id reçu: {variant_id}")

        if variant_model:
            queryset = queryset.filter(variant__model_id=variant_model)
        print(f"  Nombre de OrderLines retournées: {queryset.count()}")
        return queryset
class CustomerPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CustomerPayment.objects.all()
    serializer_class = CustomerPaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['order', 'type_paiement', 'mode_paiement', 'session_caisse']
    search_fields = ['notes']
    ordering_fields = ['date_paiement']


class ReservationViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les réservations de modèles.
    """
    serializer_class = ReservationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['statut', 'customer', 'model']
    search_fields = ['reference', 'customer__nom', 'customer__telephone', 'model__name']
    ordering_fields = ['date_limite', 'created_at']

    def get_queryset(self):
        self.check_and_expire_reservations()
        queryset = Reservation.objects.all()
        model_id = self.request.query_params.get('model')
        
        category_id = None
        variant_id = None
        if model_id:
            from apps.catalogue.models import ClothingModel
            try:
                model_obj = ClothingModel.objects.get(pk=model_id)
                category_id = model_obj.category_id
                first_variant = model_obj.variants.first()
                if first_variant:
                    variant_id = first_variant.id
            except ClothingModel.DoesNotExist:
                pass

        print("=== BACKEND RESERVATION LOG ===")
        print(f"  model_id reçu: {model_id}")
        print(f"  category_id reçu: {category_id}")
        print(f"  variant_id reçu: {variant_id}")

        if model_id:
            queryset = queryset.filter(model_id=model_id)
        print(f"  Nombre de Reservations retournées: {queryset.count()}")
        return queryset

    def check_and_expire_reservations(self):
        today = timezone.now().date()
        overdue = Reservation.objects.filter(
            statut__in=['EN_ATTENTE', 'PAIEMENT_PARTIEL', 'PAYEE'],
            date_limite__lt=today
        )
        for res in overdue:
            res.statut = 'EXPIREE'
            res.save()
            log_activity(
                user=None,
                action="expiration réservation",
                details=f"La réservation {res.reference} pour {res.customer.nom} a expiré automatiquement (date limite : {res.date_limite} dépassée)."
            )

    def perform_create(self, serializer):
        reservation = serializer.save()
        log_activity(
            user=self.request.user,
            action="création de réservation",
            details=f"Réservation {reservation.reference} créée pour {reservation.customer.nom} (Modèle: {reservation.model.name}, Qté: {reservation.quantite}, Acompte: {reservation.montant_verse} FCFA, Date limite: {reservation.date_limite})"
        )

    def perform_update(self, serializer):
        old_res = self.get_object()
        old_status = old_res.statut
        reservation = serializer.save()
        new_status = reservation.statut
        if old_status != new_status:
            if new_status == 'ANNULEE':
                log_activity(
                    user=self.request.user,
                    action="annulation de réservation",
                    details=f"Réservation {reservation.reference} annulée pour {reservation.customer.nom} (Modèle: {reservation.model.name})"
                )
            elif new_status == 'RECUPEREE':
                pass
            elif new_status == 'EXPIREE':
                pass
            else:
                log_activity(
                    user=self.request.user,
                    action="modification de statut réservation",
                    details=f"Statut de la réservation {reservation.reference} changé de {old_status} à {new_status}."
                )
        else:
            log_activity(
                user=self.request.user,
                action="modification réservation",
                details=f"Réservation {reservation.reference} modifiée (Client: {reservation.customer.nom}, Modèle: {reservation.model.name})."
            )

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_reservation(self, request, pk=None):
        reservation = self.get_object()
        if reservation.statut == 'ANNULEE':
            return Response({"error": "La réservation est déjà annulée."}, status=status.HTTP_400_BAD_REQUEST)
        reservation.statut = 'ANNULEE'
        reservation.save()
        log_activity(
            user=self.request.user,
            action="annulation de réservation",
            details=f"Réservation {reservation.reference} annulée pour {reservation.customer.nom} (Modèle: {reservation.model.name})"
        )
        return Response(ReservationSerializer(reservation, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='pay')
    def pay_reservation(self, request, pk=None):
        reservation = self.get_object()
        amount = request.data.get('amount')
        mode = request.data.get('payment_mode', 'Espèces')
        
        if amount is None:
            return Response({"error": "Le montant à payer (amount) est requis."}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            amount = Decimal(str(amount))
        except Exception:
            return Response({"error": "Montant invalide."}, status=status.HTTP_400_BAD_REQUEST)
            
        if amount <= 0:
            return Response({"error": "Le montant doit être supérieur à zéro."}, status=status.HTTP_400_BAD_REQUEST)
            
        if amount > reservation.montant_restant:
            return Response({"error": f"Le montant payé ({amount} FCFA) dépasse le reste à payer ({reservation.montant_restant} FCFA)."}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.db import transaction
        with transaction.atomic():
            payment = CustomerPayment.objects.create(
                reservation=reservation,
                order=None,
                montant=amount,
                type_paiement='BALANCE',
                mode_paiement=mode,
                notes=f"Paiement solde pour la réservation {reservation.reference}"
            )
            
            reservation.montant_verse = sum(p.montant for p in reservation.payments.all())
            reservation.save()
            
            log_activity(
                user=self.request.user,
                action="paiement réservation",
                details=f"Paiement de {amount} FCFA (mode: {mode}) enregistré pour la réservation {reservation.reference}. Nouveau montant versé: {reservation.montant_verse} FCFA, Reste à payer: {reservation.montant_restant} FCFA."
            )
            
        return Response(ReservationSerializer(reservation, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete_reservation(self, request, pk=None):
        reservation = self.get_object()
        
        today = timezone.now().date()
        if reservation.statut == 'EXPIREE' or reservation.date_limite < today:
            return Response({"error": "Cette réservation a expiré et ne peut pas être récupérée."}, status=status.HTTP_400_BAD_REQUEST)
        if reservation.statut == 'ANNULEE':
            return Response({"error": "Cette réservation a été annulée et ne peut pas être récupérée."}, status=status.HTTP_400_BAD_REQUEST)
        if reservation.statut == 'RECUPEREE':
            return Response({"error": "Cette réservation a déjà été récupérée."}, status=status.HTTP_400_BAD_REQUEST)
            
        if reservation.montant_restant > 0:
            return Response({"error": "Impossible de remettre l'habit au client car un solde reste à payer."}, status=status.HTTP_400_BAD_REQUEST)
            
        if Order.objects.filter(reservation=reservation).exists():
            return Response({"error": "Une vente liée à cette réservation existe déjà."}, status=status.HTTP_400_BAD_REQUEST)
            
        variant = reservation.model.variants.first()
        if not variant:
            return Response({"error": "Aucune variante de produit trouvée pour ce modèle."}, status=status.HTTP_400_BAD_REQUEST)
            
        from apps.stocks.models import FinishedGoodStock
        stock = FinishedGoodStock.objects.filter(variant=variant, emplacement="Magasin").first()
        if not stock or stock.quantite_reel < reservation.quantite:
            actual_stock = stock.quantite_reel if stock else 0
            return Response({"error": f"Stock physique insuffisant en magasin. Disponible : {actual_stock}, Requis : {reservation.quantite}."}, status=status.HTTP_400_BAD_REQUEST)
            
        from django.db import transaction
        with transaction.atomic():
            reservation.statut = 'RECUPEREE'
            reservation.save()
            
            # If the post-save signal already converted it, we don't need to recreate it.
            if Order.objects.filter(reservation=reservation).exists():
                log_activity(
                    user=self.request.user,
                    action="retrait final de réservation",
                    details=f"Réservation {reservation.reference} récupérée par {reservation.customer.nom}."
                )
                return Response(ReservationSerializer(reservation, context={'request': request}).data)
                
            date_str = timezone.now().strftime('%Y%m%d')
            last_order = Order.objects.filter(reference__startswith=f"CMD-{date_str}").order_by('-id').first()
            seq = 1
            if last_order:
                try:
                    seq = int(last_order.reference.split('-')[-1]) + 1
                except Exception:
                    pass
            reference = f"CMD-{date_str}-{seq:04d}"
            
            order = Order.objects.create(
                customer=reservation.customer,
                reference=reference,
                canal_vente=SalesChannel.BOUTIQUE,
                statut_commande=OrderStatus.DRAFT,
                montant_total=reservation.quantite * reservation.model.prix_vente_conseille,
                acompte_verse=reservation.montant_verse,
                reste_a_payer=0,
                statut_paiement=PaymentStatus.PAID,
                livraison_necessaire=False,
                reservation=reservation
            )
            
            OrderLine.objects.create(
                order=order,
                variant=variant,
                quantite=reservation.quantite,
                prix_unitaire_applique=reservation.model.prix_vente_conseille
            )
            
            order.statut_commande = OrderStatus.VALIDATED
            order.save()
            
            CustomerPayment.objects.filter(reservation=reservation).update(order=order)
            
            log_activity(
                user=self.request.user,
                action="transformation en vente",
                details=f"Réservation {reservation.reference} convertie automatiquement en vente {order.reference} pour le client {reservation.customer.nom}."
            )
            log_activity(
                user=self.request.user,
                action="retrait final de réservation",
                details=f"Réservation {reservation.reference} récupérée par {reservation.customer.nom}. Vente {order.reference} créée automatiquement."
            )
            
        return Response(ReservationSerializer(reservation, context={'request': request}).data)

