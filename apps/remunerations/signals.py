from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from .models import MonthlyCompensation, SalaryAdvance
from apps.core.choices import AdvanceStatus

@receiver(pre_save, sender=MonthlyCompensation)
def calculate_deductions_on_compensation_creation(sender, instance, **kwargs):
    """
    Signal pré-sauvegarde pour MonthlyCompensation.
    Si la fiche de paie est en cours de création, recherche toutes les avances
    approuvées du collaborateur et les impute automatiquement sur sa paie.
    """
    if instance.id is None: # Nouveau record uniquement
        # Recherche des avances de salaire approuvées
        advances = SalaryAdvance.objects.filter(
            member=instance.member,
            status=AdvanceStatus.APPROVED
        )
        total_advances = sum(adv.amount for adv in advances)
        
        # Plafonnement de la déduction au salaire mensuel dû
        deduction = min(total_advances, instance.montant_du)
        
        instance.avances_deduites = deduction
        instance.net_amount_payable = instance.montant_du - deduction
        instance.amount_remaining = instance.net_amount_payable - instance.paid_amount


@receiver(post_save, sender=MonthlyCompensation)
def mark_advances_as_deducted(sender, instance, created, **kwargs):
    """
    Signal post-sauvegarde pour MonthlyCompensation.
    Une fois la fiche de paie créée, bascule les avances de salaire imputées à l'état
    'Déduite' (DEDUCTED) et gère les montants résiduels éventuels.
    """
    if created:
        # Exécuté de manière atomique
        with transaction.atomic():
            advances = SalaryAdvance.objects.filter(
                member=instance.member,
                status=AdvanceStatus.APPROVED
            )
            
            remaining_deduction = instance.avances_deduites
            
            for adv in advances:
                if remaining_deduction <= 0:
                    break
                
                if adv.amount <= remaining_deduction:
                    # L'avance est entièrement remboursée
                    remaining_deduction -= adv.amount
                    adv.status = AdvanceStatus.DEDUCTED
                    adv.save(update_fields=['status'])
                else:
                    # L'avance est partiellement déduite. On passe son statut à 'DEDUCTED'
                    # et on crée une avance résiduelle pour la différence.
                    residual = adv.amount - remaining_deduction
                    adv.status = AdvanceStatus.DEDUCTED
                    adv.save(update_fields=['status'])
                    
                    # Création de l'avance résiduelle approuvée
                    SalaryAdvance.objects.create(
                        member=instance.member,
                        grant_date=adv.grant_date,
                        amount=residual,
                        status=AdvanceStatus.APPROVED,
                        notes=_("Reliquat suite à déduction partielle sur la paie %s/%s.") % (instance.mois, instance.annee)
                    )
                    remaining_deduction = 0
