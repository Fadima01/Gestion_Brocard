from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from .models import CustomerReturn
from apps.stocks.services import InventoryService
from apps.stocks.models import StockMovement

@receiver(post_save, sender=CustomerReturn)
def restock_on_return_closure(sender, instance, **kwargs):
    """
    Signal post-sauvegarde pour CustomerReturn.
    Lorsqu'un retour client passe à l'état clôturé ('CLOSED'), réintègre automatiquement
    les pièces retournées dans le stock physique (Magasin ou Quarantaine selon l'état).
    """
    if instance.statut_retour == 'CLOSED':
        # Exécuté dans une transaction atomique
        with transaction.atomic():
            for line in instance.lines.select_related('variant').all():
                # Système anti-double-restockage : vérifie si un mouvement de stock
                # a déjà été enregistré pour cette ligne de retour spécifique
                marker = f"Retour ligne ID {line.id}"
                already_processed = StockMovement.objects.filter(description__contains=marker).exists()
                
                if not already_processed:
                    # Choix de la destination du stock
                    location = "Magasin" if line.reintegre_stock else "Quarantaine Defectueux"
                    
                    # Ajustement du stock physique
                    InventoryService.adjust_stock(
                        variant=line.variant,
                        location=location,
                        quantity=line.quantite,
                        movement_type=StockMovement.MovementType.RETURN,
                        description=f"Réintégration de stock - {marker} - Motif: {line.get_motif_display()}"
                    )
