from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from .models import Order, OrderLine, CustomerPayment
from apps.core.choices import OrderStatus, PaymentStatus
from apps.stocks.services import InventoryService

class OrderService:
    """
    Service gérant la logique métier des commandes clients et des encaissements associés.
    """

    @staticmethod
    @transaction.atomic
    def create_order(customer, sales_channel, lines_data, deposit_paid=0.00):
        """
        Crée une commande client, génère ses lignes et réserve les stocks physiques associés.
        lines_data format: [{'variant': ProductVariant, 'quantity': int, 'applied_unit_price': Decimal}]
        """
        if not lines_data:
            raise ValidationError(_("Une commande doit comporter au moins une ligne."))

        # Création de l'entité commande (montant initialisé à 0)
        order = Order.objects.create(
            customer=customer,
            canal_vente=sales_channel,
            statut_commande=OrderStatus.DRAFT,
            montant_total=0,
            acompte_verse=0,
            reste_a_payer=0,
            statut_paiement=PaymentStatus.UNPAID
        )

        from decimal import Decimal
        deposit_paid = Decimal(str(deposit_paid))
        total_amount = Decimal('0.00')
        for line in lines_data:
            variant = line['variant']
            qty = line['quantity']
            price = line['applied_unit_price']

            # Création de la ligne de commande
            OrderLine.objects.create(
                order=order,
                variant=variant,
                quantite=qty,
                prix_unitaire_applique=price
            )
            total_amount += qty * price

            # Réservation de stock (emplacement par défaut : Magasin)
            InventoryService.reserve_stock(variant, "Magasin", qty)

        order.montant_total = total_amount
        order.acompte_verse = deposit_paid
        order.reste_a_payer = total_amount - deposit_paid
        
        # Attribution du statut de paiement initial
        if deposit_paid == 0:
            order.statut_paiement = PaymentStatus.UNPAID
        elif deposit_paid >= total_amount:
            order.statut_paiement = PaymentStatus.PAID
        else:
            order.statut_paiement = PaymentStatus.PARTIALLY_PAID

        # Now validate the order to trigger transitions
        order.statut_commande = OrderStatus.VALIDATED
        order.save()
        return order

    @staticmethod
    @transaction.atomic
    def record_payment(order, amount, payment_type, payment_mode, notes="", cash_session=None):
        """
        Enregistre un versement client sur une commande et recalcule les statuts de paiement.
        """
        from decimal import Decimal
        amount = Decimal(str(amount))
        if amount <= 0:
            raise ValidationError(_("Le montant du paiement doit être supérieur à zéro."))

        if amount > order.reste_a_payer:
            raise ValidationError(_("Le versement de %(amount)s dépasse le reste à payer de %(due)s."),
                                  params={'amount': amount, 'due': order.reste_a_payer})

        # Création du paiement client
        payment = CustomerPayment.objects.create(
            order=order,
            session_caisse=cash_session,
            montant=amount,
            type_paiement=payment_type,
            mode_paiement=payment_mode,
            notes=notes
        )

        # Recalcul de la commande
        order.acompte_verse += amount
        order.reste_a_payer = order.montant_total - order.acompte_verse

        if order.reste_a_payer <= 0:
            order.statut_paiement = PaymentStatus.PAID
        else:
            order.statut_paiement = PaymentStatus.PARTIALLY_PAID

        order.save()
        return payment
