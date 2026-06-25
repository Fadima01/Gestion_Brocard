from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from .models import ProductionOrder, MaterialConsumption, WorkshopPayment
from apps.core.choices import ProductionStatus, PaymentStatus
from apps.stocks.services import InventoryService
from apps.stocks.models import StockMovement

class ProductionService:
    """
    Service gérant la logique métier de fabrication dans les ateliers de couture et le paiement associé.
    """

    @staticmethod
    @transaction.atomic
    def create_production_order(workshop, start_date, expected_end_date, requested_quantity, cout_facon_unitaire, materials_data, model=None, category=None):
        """
        Crée un ordre de production (OF) et affecte les matières premières nécessaires.
        materials_data format: [{'raw_material': RawMaterial, 'quantity_used': Decimal}]
        """
        order = ProductionOrder.objects.create(
            workshop=workshop,
            model=model,
            category=category,
            statut=ProductionStatus.PLANNED,
            date_debut=start_date,
            date_fin_prevue=expected_end_date,
            quantite_demandee=requested_quantity,
            cout_facon_unitaire=cout_facon_unitaire,
            montant_facon_total=requested_quantity * cout_facon_unitaire
        )

        for item in materials_data:
            raw_material = item['raw_material']
            qty = item['quantity_used']

            # Consommation de matière première
            InventoryService.consume_raw_material(raw_material, qty, production_order=order)

            # Liaison de la consommation à l'ordre de production
            MaterialConsumption.objects.create(
                production_order=order,
                raw_material=raw_material,
                quantite_utilisee_metres=qty
            )

        return order

    @staticmethod
    @transaction.atomic
    def complete_production_order(order, produced_quantity, defective_quantity=0, variant=None, location="Magasin", user=None):
        """
        Enregistre une réception (partielle ou complète) pour un ordre de production.
        """
        if order.statut in [ProductionStatus.COMPLETED, ProductionStatus.CANCELLED]:
            raise ValidationError(_("Cet ordre de production est déjà clôturé ou annulé."))

        if produced_quantity <= 0:
            raise ValidationError(_("La quantité reçue doit être supérieure à 0."))

        if order.quantite_produite + produced_quantity > order.quantite_demandee:
            raise ValidationError(_("La quantité reçue cumulée ne peut pas dépasser la quantité demandée."))

        # Enregistrement de la réception dans l'historique
        from .models import ProductionReceipt
        ProductionReceipt.objects.create(
            production_order=order,
            quantite_recue=produced_quantity,
            created_by=user
        )

        # Accumulation de la quantité produite/reçue
        order.quantite_produite += produced_quantity

        if order.quantite_produite == order.quantite_demandee:
            order.date_fin_reelle = timezone.now().date()

        # Sauvegarde (déclenche la validation clean() et l'ajustement de stock dans save())
        order.save()

        return order

    @staticmethod
    @transaction.atomic
    def pay_workshop(order, amount, payment_mode, transaction_reference="", notes=""):
        """
        Enregistre un paiement à l'atelier de couture pour sa façon et met à jour le statut financier.
        """
        if amount <= 0:
            raise ValidationError(_("Le montant du paiement doit être supérieur à zéro."))

        remaining = order.montant_facon_total - order.montant_facon_paye
        if amount > remaining:
            raise ValidationError(_("Le paiement de %(amount)s dépasse le reste à payer de %(due)s pour cet atelier."),
                                  params={'amount': amount, 'due': remaining})

        payment = WorkshopPayment.objects.create(
            production_order=order,
            montant=amount,
            mode_paiement=payment_mode,
            reference_transaction=transaction_reference,
            notes=notes
        )

        order.montant_facon_paye += amount
        
        if order.montant_facon_paye >= order.montant_facon_total:
            order.statut_paiement_facon = PaymentStatus.PAID
        else:
            order.statut_paiement_facon = PaymentStatus.PARTIALLY_PAID

        order.save()
        return payment
