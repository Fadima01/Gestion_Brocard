from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel

class FinishedGoodStock(TimeStampedModel):
    """
    Gestion des stocks physiques des habits confectionnés (produits finis) par variante et emplacement.
    """
    variant = models.ForeignKey(
        'catalogue.ProductVariant',
        on_delete=models.RESTRICT,
        related_name="stocks",
        verbose_name=_("Variante d'habit")
    )
    quantite_reel = models.IntegerField(
        default=0,
        verbose_name=_("Quantité réelle physique")
    )
    quantite_reservee = models.IntegerField(
        default=0,
        verbose_name=_("Quantité réservée"),
        help_text=_("Quantité vendue mais non encore livrée ou récupérée.")
    )
    emplacement = models.CharField(
        max_length=100,
        default="Magasin",
        verbose_name=_("Emplacement du stock"),
        help_text=_("Ex: Magasin, Dépôt A, Quarantaine Défectueux")
    )

    class Meta:
        verbose_name = _("Stock produit fini")
        verbose_name_plural = _("Stocks produits finis")
        ordering = ['emplacement', 'variant']
        indexes = [
            models.Index(fields=['emplacement', 'variant'], name='idx_stocks_loc_var'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['variant', 'emplacement'],
                name='uq_stocks_variant_location'
            ),
            models.CheckConstraint(
                check=models.Q(quantite_reel__gte=0),
                name="chk_stocks_quantite_reel_positive"
            ),
            models.CheckConstraint(
                check=models.Q(quantite_reservee__gte=0),
                name="chk_stocks_quantite_reservee_positive"
            )
        ]

    def __str__(self):
        return f"{self.variant.sku} @ {self.emplacement} (Dispo: {self.disponible()})"

    def disponible(self):
        """Retourne le stock disponible à la vente."""
        return self.quantite_reel - self.quantite_reservee


class StockMovement(models.Model):
    """
    Historique de tous les mouvements de stocks (entrées, sorties, ajustements).
    """
    class MovementType(models.TextChoices):
        ENTRY = 'ENTRY', _('Entrée (Production / Restock)')
        EXIT = 'EXIT', _('Sortie (Vente)')
        RETURN = 'RETURN', _('Retour client')
        ADJUSTMENT = 'ADJUSTMENT', _('Ajustement inventaire')
        REJECT = 'REJECT', _('Mise au rebut')

    stock = models.ForeignKey(
        FinishedGoodStock,
        on_delete=models.CASCADE,
        related_name="movements",
        verbose_name=_("Stock affecté")
    )
    quantite = models.IntegerField(
        verbose_name=_("Quantité déplacée"),
        help_text=_("Valeur positive pour les entrées, négative pour les sorties.")
    )
    type_mouvement = models.CharField(
        max_length=30,
        choices=MovementType.choices,
        verbose_name=_("Type de mouvement")
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("Description / Justification")
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Date du mouvement")
    )

    class Meta:
        verbose_name = _("Mouvement de stock")
        verbose_name_plural = _("Mouvements de stocks")
        ordering = ['-created_at']

    def __str__(self):
        sign = "+" if self.quantite > 0 else ""
        return f"{self.get_type_mouvement_display()} | {sign}{self.quantite} pour {self.stock.variant.sku}"
