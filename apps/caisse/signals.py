from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from apps.ventes.models import CustomerPayment, Reservation
from apps.depenses.models import Expense
from apps.production.models import WorkshopPayment
from apps.remunerations.models import CompensationPayment, SalaryAdvance
from .models import CaisseMouvement

@receiver(post_save, sender=CustomerPayment)
def manage_customer_payment_movement(sender, instance, created, **kwargs):
    if instance.reservation:
        description = f"Encaissement client - Réservation {instance.reservation.reference}"
    elif instance.order:
        description = f"Encaissement client - Commande {instance.order.reference}"
    else:
        description = "Encaissement client"

    mvt, created_mvt = CaisseMouvement.objects.get_or_create(
        customer_payment=instance,
        defaults={
            'type_mouvement': CaisseMouvement.TypeMouvement.ENTREE,
            'montant': instance.montant,
            'mode_paiement': instance.mode_paiement,
            'description': description,
            'date_mouvement': instance.date_paiement,
            'reservation': instance.reservation
        }
    )
    if not created_mvt:
        mvt.montant = instance.montant
        mvt.mode_paiement = instance.mode_paiement
        mvt.description = description
        mvt.date_mouvement = instance.date_paiement
        mvt.reservation = instance.reservation
        mvt.save()

@receiver(post_save, sender=Expense)
def manage_expense_movement(sender, instance, created, **kwargs):
    date_mvmt = timezone.now()
    if instance.date_depense:
        try:
            date_mvmt = timezone.make_aware(timezone.datetime.combine(instance.date_depense, timezone.datetime.min.time()))
        except Exception:
            pass
    mvt, created_mvt = CaisseMouvement.objects.get_or_create(
        expense=instance,
        defaults={
            'type_mouvement': CaisseMouvement.TypeMouvement.SORTIE,
            'montant': instance.montant,
            'mode_paiement': 'Espèces',
            'description': f"Dépense - Catégorie: {instance.get_categorie_display()} - Motif: {instance.description}",
            'date_mouvement': date_mvmt
        }
    )
    if not created_mvt:
        mvt.montant = instance.montant
        mvt.description = f"Dépense - Catégorie: {instance.get_categorie_display()} - Motif: {instance.description}"
        mvt.date_mouvement = date_mvmt
        mvt.save()

@receiver(post_save, sender=WorkshopPayment)
def manage_workshop_payment_movement(sender, instance, created, **kwargs):
    mvt, created_mvt = CaisseMouvement.objects.get_or_create(
        workshop_payment=instance,
        defaults={
            'type_mouvement': CaisseMouvement.TypeMouvement.SORTIE,
            'montant': instance.montant,
            'mode_paiement': instance.mode_paiement,
            'description': f"Règlement façon atelier - OF: {instance.production_order.reference} - Atelier: {instance.production_order.workshop.name}",
            'date_mouvement': instance.date_paiement
        }
    )
    if not created_mvt:
        mvt.montant = instance.montant
        mvt.mode_paiement = instance.mode_paiement
        mvt.date_mouvement = instance.date_paiement
        mvt.save()

@receiver(post_save, sender=CompensationPayment)
def manage_compensation_payment_movement(sender, instance, created, **kwargs):
    mvt, created_mvt = CaisseMouvement.objects.get_or_create(
        compensation_payment=instance,
        defaults={
            'type_mouvement': CaisseMouvement.TypeMouvement.SORTIE,
            'montant': instance.amount,
            'mode_paiement': instance.payment_mode,
            'description': f"Règlement rémunération - Collaborateur: {instance.monthly_compensation.member.get_full_name()} - Période: {instance.monthly_compensation.mois}/{instance.monthly_compensation.annee}",
            'date_mouvement': instance.payment_date
        }
    )
    if not created_mvt:
        mvt.montant = instance.amount
        mvt.mode_paiement = instance.payment_mode
        mvt.date_mouvement = instance.payment_date
        mvt.save()

@receiver(post_save, sender=SalaryAdvance)
def manage_salary_advance_movement(sender, instance, created, **kwargs):
    if instance.status == 'APPROVED':
        mvt, created_mvt = CaisseMouvement.objects.get_or_create(
            salary_advance=instance,
            defaults={
                'type_mouvement': CaisseMouvement.TypeMouvement.SORTIE,
                'montant': instance.amount,
                'mode_paiement': 'Espèces',
                'description': f"Acompte/Avance sur salaire - Collaborateur: {instance.member.get_full_name()}",
                'date_mouvement': timezone.now()
            }
        )
        if not created_mvt:
            mvt.montant = instance.amount
            mvt.save()
    elif instance.status in ['PENDING', 'REJECTED']:
        CaisseMouvement.objects.filter(salary_advance=instance).delete()
