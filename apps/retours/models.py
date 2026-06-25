from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel
from apps.core.choices import ReturnReason

class CustomerReturn(TimeStampedModel):
    """
    Enregistrement des retours d'articles effectués par les clients.
    """
    class ReturnStatus(models.TextChoices):
        RECEIVED = 'RECEIVED', _('Reçu')
        INSPECTED = 'INSPECTED', _('Inspecté')
        CLOSED = 'CLOSED', _('Clôturé')

    reference = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        verbose_name=_("Référence unique")
    )
    order = models.ForeignKey(
        'ventes.Order',
        on_delete=models.RESTRICT,
        related_name="returns",
        verbose_name=_("Commande d'origine")
    )
    date_retour = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date du retour")
    )
    statut_retour = models.CharField(
        max_length=30,
        choices=ReturnStatus.choices,
        default=ReturnStatus.RECEIVED,
        verbose_name=_("Statut du retour")
    )
    montant_rembourse = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Montant remboursé (espèces)")
    )
    accredite_avoir = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Crédit d'avoir accordé (code d'achat)")
    )

    class Meta:
        verbose_name = _("Retour client")
        verbose_name_plural = _("Retours clients")
        ordering = ['-date_retour']
        constraints = [
            models.CheckConstraint(
                check=models.Q(montant_rembourse__gte=0),
                name="chk_retours_refund_positive"
            ),
            models.CheckConstraint(
                check=models.Q(accredite_avoir__gte=0),
                name="chk_retours_credit_positive"
            )
        ]

    def __str__(self):
        return f"Retour {self.reference or self.id} de la commande {self.order.reference} ({self.get_statut_retour_display()})"

    def save(self, *args, **kwargs):
        if not self.reference:
            from apps.core.utils import generate_unique_reference
            self.reference = generate_unique_reference(CustomerReturn, 'RET')
        super().save(*args, **kwargs)


class ReturnLine(models.Model):
    """
    Lignes d'articles détaillées au sein d'un retour client, spécifiant le motif et le traitement du stock.
    """
    customer_return = models.ForeignKey(
        CustomerReturn,
        on_delete=models.CASCADE,
        related_name="lines",
        verbose_name=_("Retour associé")
    )
    variant = models.ForeignKey(
        'catalogue.ProductVariant',
        on_delete=models.RESTRICT,
        related_name="returned_lines",
        verbose_name=_("Variante d'habit retournée")
    )
    quantite = models.IntegerField(
        verbose_name=_("Quantité retournée")
    )
    motif = models.CharField(
        max_length=50,
        choices=ReturnReason.choices,
        verbose_name=_("Motif de retour")
    )
    reintegre_stock = models.BooleanField(
        default=True,
        verbose_name=_("Réintégrer au stock commercialisable"),
        help_text=_("Si coché, l'habit est replacé en stock disponible. Sinon, il est dirigé vers la quarantaine (défaut).")
    )
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes / Détails sur l'état")
    )

    class Meta:
        verbose_name = _("Ligne de retour")
        verbose_name_plural = _("Lignes de retours")
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantite__gt=0),
                name="chk_retours_line_qty_positive"
            )
        ]

    def __str__(self):
        return f"{self.quantite}x {self.variant.sku} retourné pour {self.get_motif_display()}"
