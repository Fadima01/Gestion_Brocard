from django.db import transaction
from django.db.models import F
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from .models import FinishedGoodStock, StockMovement
from apps.achats.models import RawMaterial

class InventoryService:
    """
    Service gérant la logique métier des stocks de matières premières et de produits finis.
    """

    @staticmethod
    @transaction.atomic
    def adjust_stock(variant, location, quantity, movement_type, description=""):
        """
        Ajuste la quantité physique d'un produit fini en stock et enregistre le mouvement.
        """
        if quantity == 0:
            return None

        # Récupération ou création du stock à l'emplacement indiqué
        stock, created = FinishedGoodStock.objects.get_or_create(
            variant=variant,
            emplacement=location,
            defaults={'quantite_reel': 0, 'quantite_reservee': 0}
        )

        # Application de l'ajustement
        stock.quantite_reel = F('quantite_reel') + quantity
        stock.save()
        stock.refresh_from_db()

        # Validation de cohérence de stock
        if stock.quantite_reel < 0:
            raise ValidationError(_("Le stock physique de la variante %(sku)s à l'emplacement %(loc)s ne peut pas être négatif."),
                                  params={'sku': variant.sku, 'loc': location})

        # Enregistrement du mouvement
        movement = StockMovement.objects.create(
            stock=stock,
            quantite=quantity,
            type_mouvement=movement_type,
            description=description
        )

        return stock

    @staticmethod
    @transaction.atomic
    def reserve_stock(variant, location, quantity):
        """
        Réserve une quantité de produit fini lors d'une commande client.
        """
        if quantity <= 0:
            raise ValidationError(_("La quantité à réserver doit être supérieure à zéro."))

        stock = FinishedGoodStock.objects.filter(variant=variant, emplacement=location).first()
        if not stock or (stock.quantite_reel - stock.quantite_reservee) < quantity:
            raise ValidationError(_("Stock insuffisant pour la variante %(sku)s à l'emplacement %(loc)s."),
                                  params={'sku': variant.sku, 'loc': location})

        stock.quantite_reservee = F('quantite_reservee') + quantity
        stock.save()
        stock.refresh_from_db()
        return stock

    @staticmethod
    @transaction.atomic
    def release_reserved_stock(variant, location, quantity):
        """
        Libère une quantité de stock réservée (ex: livraison effectuée ou commande annulée).
        """
        if quantity <= 0:
            raise ValidationError(_("La quantité à libérer doit être supérieure à zéro."))

        stock = FinishedGoodStock.objects.filter(variant=variant, emplacement=location).first()
        if not stock or stock.quantite_reservee < quantity:
            raise ValidationError(_("Impossible de libérer plus de stock réservé que prévu pour la variante %(sku)s."),
                                  params={'sku': variant.sku})

        stock.quantite_reservee = F('quantite_reservee') - quantity
        stock.save()
        stock.refresh_from_db()
        return stock

    @staticmethod
    @transaction.atomic
    def consume_raw_material(raw_material, quantity):
        """
        Consomme une quantité de tissu Brocard ou d'accessoire de la table RawMaterial.
        """
        if quantity <= 0:
            raise ValidationError(_("La quantité de matière première consommée doit être positive."))

        if raw_material.quantite_restante_metres < quantity:
            raise ValidationError(_("Stock de matière première insuffisant pour %(material)s."),
                                  params={'material': raw_material.type_matiere})

        old_qty = raw_material.quantite_restante_metres
        raw_material.quantite_restante_metres = F('quantite_restante_metres') - quantity
        raw_material.save()
        raw_material.refresh_from_db()
        new_qty = raw_material.quantite_restante_metres

        # Log de mouvement de matière première
        from apps.achats.models import RawMaterialMovement
        RawMaterialMovement.objects.create(
            raw_material=raw_material,
            old_quantity=old_qty,
            new_quantity=new_qty,
            difference=-quantity,
            operation_type=RawMaterialMovement.OperationType.CONSUMPTION,
            description="Consommation pour ordre de production"
        )

        return raw_material
