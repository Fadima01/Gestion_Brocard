from django.db.models.signals import pre_save, post_save, post_delete
from django.dispatch import receiver
from django.db import transaction
from django.utils import timezone
from .models import Order, OrderLine, CustomerPayment, Reservation
from apps.caisse.services import CashRegisterService
from apps.stocks.models import FinishedGoodStock, StockMovement
from apps.core.choices import SalesChannel, OrderStatus, PaymentStatus

@receiver(post_save, sender=CustomerPayment)
def update_cash_session_on_payment(sender, instance, created, **kwargs):
    """
    Signal post-sauvegarde pour CustomerPayment.
    Si le mode de règlement est en espèces ('Especes') et qu'une session de caisse
    est ouverte, incrémente automatiquement le montant collecté de la caisse.
    """
    if created and instance.mode_paiement == 'Especes' and instance.session_caisse:
        # Exécuté dans une transaction atomique pour éviter les conflits d'écritures
        transaction.on_commit(
            lambda: CashRegisterService.add_cash_sales(instance.session_caisse, instance.montant)
        )


@receiver(pre_save, sender=Order)
def store_old_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            instance._old_statut_commande = Order.objects.get(pk=instance.pk).statut_commande
        except Order.DoesNotExist:
            instance._old_statut_commande = None
    else:
        instance._old_statut_commande = None


@receiver(post_save, sender=Order)
def handle_order_stock_transitions(sender, instance, created, **kwargs):
    old_status = getattr(instance, '_old_statut_commande', None)
    new_status = instance.statut_commande
    
    group_reserved = ['DRAFT']
    group_sold = ['VALIDATED', 'SHIPPING', 'DELIVERED']
    group_none = ['CANCELLED', 'RETURNED']
    
    if created:
        if new_status in group_sold:
            transition = 'reserved_to_sold'
        else:
            return
    else:
        if old_status == new_status:
            return
            
        transition = None
        if old_status in group_reserved and new_status in group_sold:
            transition = 'reserved_to_sold'
        elif old_status in group_reserved and new_status in group_none:
            transition = 'reserved_to_none'
        elif old_status in group_sold and new_status in group_none:
            transition = 'sold_to_none'
        elif old_status in group_none and new_status in group_reserved:
            transition = 'none_to_reserved'
        elif old_status in group_none and new_status in group_sold:
            transition = 'none_to_sold'
            
    if not transition:
        return
        
    with transaction.atomic():
        for line in instance.lines.all():
            variant = line.variant
            qty = line.quantite
            category = variant.model.category
            
            stock, _ = FinishedGoodStock.objects.get_or_create(
                variant=variant,
                emplacement="Magasin",
                defaults={'quantite_reel': 0, 'quantite_reservee': 0}
            )
            
            if transition == 'reserved_to_sold':
                # Decrement quantite_reel and release reservation
                stock.quantite_reel = max(0, stock.quantite_reel - qty)
                if not instance.reservation:
                    stock.quantite_reservee = max(0, stock.quantite_reservee - qty)
                stock.save()
                
                StockMovement.objects.create(
                    stock=stock,
                    quantite=-qty,
                    type_mouvement=StockMovement.MovementType.EXIT,
                    description=f"Validation vente {instance.reference}"
                )
                
                # Decrement category stock_global
                if category:
                    category.stock_global = max(0, category.stock_global - qty)
                    category.save(update_fields=['stock_global'])
                    
                # Update clothing model quantity
                variant.model.quantite_affectee = stock.quantite_reel
                variant.model.save(update_fields=['quantite_affectee'])
                    
            elif transition == 'reserved_to_none':
                # Release reservation only
                stock.quantite_reservee = max(0, stock.quantite_reservee - qty)
                stock.save()
                
            elif transition == 'sold_to_none':
                # Increment quantite_reel (stock returned)
                stock.quantite_reel += qty
                stock.save()
                
                StockMovement.objects.create(
                    stock=stock,
                    quantite=qty,
                    type_mouvement=StockMovement.MovementType.RETURN,
                    description=f"Annulation/Retour vente {instance.reference}"
                )
                
                # Increment category stock_global
                if category:
                    category.stock_global += qty
                    category.save(update_fields=['stock_global'])
                    
                # Update clothing model quantity
                variant.model.quantite_affectee = stock.quantite_reel
                variant.model.save(update_fields=['quantite_affectee'])
                
            elif transition == 'none_to_reserved':
                # Reserve stock again
                stock.quantite_reservee += qty
                stock.save()
                
            elif transition == 'none_to_sold':
                # Decrement stock physically
                stock.quantite_reel = max(0, stock.quantite_reel - qty)
                stock.save()
                
                StockMovement.objects.create(
                    stock=stock,
                    quantite=-qty,
                    type_mouvement=StockMovement.MovementType.EXIT,
                    description=f"Validation vente {instance.reference} (depuis statut annulé)"
                )
                
                # Decrement category stock_global
                if category:
                    category.stock_global = max(0, category.stock_global - qty)
                    category.save(update_fields=['stock_global'])
                    
                # Update clothing model quantity
                variant.model.quantite_affectee = stock.quantite_reel
                variant.model.save(update_fields=['quantite_affectee'])


from apps.stocks.services import InventoryService

@receiver(pre_save, sender=Reservation)
def store_old_reservation_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = Reservation.objects.get(pk=instance.pk)
            instance._old_statut = old_instance.statut
            instance._old_quantite = old_instance.quantite
        except Reservation.DoesNotExist:
            instance._old_statut = None
            instance._old_quantite = None
    else:
        instance._old_statut = None
        instance._old_quantite = None

@receiver(post_save, sender=Reservation)
def handle_reservation_stock(sender, instance, created, **kwargs):
    old_status = getattr(instance, '_old_statut', None)
    new_status = instance.statut
    
    variant = instance.model.variants.first()
    if not variant:
        return
        
    location = "Magasin"
    active_states = ['EN_ATTENTE', 'PAIEMENT_PARTIEL', 'PAYEE']
    
    if created:
        if new_status in active_states:
            InventoryService.reserve_stock(variant, location, instance.quantite)
    else:
        was_active = old_status in active_states
        is_active = new_status in active_states
        
        if was_active and not is_active:
            # Went from active to inactive -> release reservation
            InventoryService.release_reserved_stock(variant, location, instance.quantite)
        elif not was_active and is_active:
            # Went from inactive to active -> reserve stock
            InventoryService.reserve_stock(variant, location, instance.quantite)
        elif was_active and is_active:
            # Remained active, check if quantity changed
            old_qty = getattr(instance, '_old_quantite', instance.quantite)
            if old_qty != instance.quantite:
                InventoryService.release_reserved_stock(variant, location, old_qty)
                InventoryService.reserve_stock(variant, location, instance.quantite)

@receiver(post_delete, sender=Reservation)
def release_stock_on_reservation_delete(sender, instance, **kwargs):
    if instance.statut in ['EN_ATTENTE', 'PAIEMENT_PARTIEL', 'PAYEE']:
        variant = instance.model.variants.first()
        if variant:
            try:
                InventoryService.release_reserved_stock(variant, "Magasin", instance.quantite)
            except Exception:
                pass


@receiver(post_save, sender=Reservation)
def convert_reservation_to_sale_on_completion(sender, instance, created, **kwargs):
    old_status = getattr(instance, '_old_statut', None)
    new_status = instance.statut
    
    if new_status == 'RECUPEREE' and old_status != 'RECUPEREE':
        if Order.objects.filter(reservation=instance).exists():
            return
            
        with transaction.atomic():
            variant = instance.model.variants.first()
            if not variant:
                return
                
            order = Order.objects.create(
                customer=instance.customer,
                canal_vente=SalesChannel.BOUTIQUE,
                statut_commande=OrderStatus.DRAFT,
                montant_total=instance.quantite * instance.model.prix_vente_conseille,
                acompte_verse=instance.montant_verse,
                reste_a_payer=0,
                statut_paiement=PaymentStatus.PAID,
                livraison_necessaire=False,
                reservation=instance
            )
            
            OrderLine.objects.create(
                order=order,
                variant=variant,
                quantite=instance.quantite,
                prix_unitaire_applique=instance.model.prix_vente_conseille
            )
            
            # Now validate the order to trigger the stock deduction transitions
            order.statut_commande = OrderStatus.VALIDATED
            order.save()
            
            CustomerPayment.objects.filter(reservation=instance).update(order=order)


@receiver(post_delete, sender=OrderLine)
def restore_stock_on_line_delete(sender, instance, **kwargs):
    order = instance.order
    group_sold = ['VALIDATED', 'SHIPPING', 'DELIVERED']
    if order.statut_commande in group_sold:
        variant = instance.variant
        qty = instance.quantite
        category = variant.model.category
        
        stock = FinishedGoodStock.objects.filter(variant=variant, emplacement="Magasin").first()
        if stock:
            stock.quantite_reel += qty
            stock.save()
            
            StockMovement.objects.create(
                stock=stock,
                quantite=qty,
                type_mouvement=StockMovement.MovementType.RETURN,
                description=f"Suppression ligne de vente de {order.reference}"
            )
            
            if category:
                category.stock_global += qty
                category.save(update_fields=['stock_global'])
                
            variant.model.quantite_affectee = stock.quantite_reel
            variant.model.save(update_fields=['quantite_affectee'])

