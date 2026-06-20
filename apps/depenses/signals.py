from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from .models import Expense
from apps.caisse.services import CashRegisterService
from apps.core.choices import ExpenseCategory
from apps.achats.models import FabricPurchase

@receiver(post_save, sender=Expense)
def update_cash_session_on_expense(sender, instance, created, **kwargs):
    """
    Signal post-sauvegarde pour Expense.
    Si la dépense a été prélevée sur la caisse physique (session_caisse renseignée),
    enregistre automatiquement le débit en espèces de la session de caisse en cours.
    """
    if created and instance.session_caisse:
        transaction.on_commit(
            lambda: CashRegisterService.add_cash_expense(instance.session_caisse, instance.montant)
        )

@receiver(post_save, sender=FabricPurchase)
def create_or_update_expense_for_fabric_purchase(sender, instance, created, **kwargs):
    """
    Crée ou met à jour automatiquement une dépense d'achat de matières premières
    lorsqu'un FabricPurchase est enregistré.
    """
    expense, exp_created = Expense.objects.get_or_create(
        fabric_purchase=instance,
        defaults={
            'categorie': ExpenseCategory.RAW_MAT,
            'montant': instance.montant_total,
            'date_depense': instance.date_achat,
            'description': f"Achat automatique de matières premières - Fournisseur : {instance.supplier.name} (Achat #{instance.id})"
        }
    )
    if not exp_created:
        expense.montant = instance.montant_total
        expense.date_depense = instance.date_achat
        expense.description = f"Achat automatique de matières premières - Fournisseur : {instance.supplier.name} (Achat #{instance.id})"
        expense.save()
