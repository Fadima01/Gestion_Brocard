from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel
from apps.core.choices import ExpenseCategory

class Expense(TimeStampedModel):
    """
    Enregistrement des dépenses annexes d'exploitation (transport, carburant, nourriture couturiers, etc.).
    """
    categorie = models.CharField(
        max_length=50,
        choices=ExpenseCategory.choices,
        verbose_name=_("Catégorie de charge")
    )
    montant = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant dépensé")
    )
    date_depense = models.DateField(
        verbose_name=_("Date de la dépense")
    )
    description = models.TextField(
        blank=True,
        verbose_name=_("Description détaillée / Motif")
    )
    ordre_production = models.ForeignKey(
        'production.ProductionOrder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
        verbose_name=_("Ordre de production imputé"),
        help_text=_("Laissez vide si c'est une charge d'exploitation générale.")
    )
    session_caisse = models.ForeignKey(
        'caisse.CashSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
        verbose_name=_("Session de caisse associée"),
        help_text=_("Renseigné uniquement si la dépense a été prélevée directement du tiroir-caisse.")
    )
    fabric_purchase = models.ForeignKey(
        'achats.FabricPurchase',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="expenses",
        verbose_name=_("Achat de tissu associé")
    )
    reference = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        verbose_name=_("Référence unique")
    )

    class Meta:
        verbose_name = _("Dépense annexe")
        verbose_name_plural = _("Dépenses annexes")
        ordering = ['-date_depense', '-id']
        constraints = [
            models.CheckConstraint(
                check=models.Q(montant__gt=0),
                name="chk_depenses_amount_positive"
            )
        ]

    def __str__(self):
        return f"Dépense {self.reference or self.id} ({self.get_categorie_display()}) - {self.montant} FCFA le {self.date_depense}"

    def save(self, *args, **kwargs):
        if not self.reference:
            from apps.core.utils import generate_unique_reference
            self.reference = generate_unique_reference(Expense, 'DEP')
        super().save(*args, **kwargs)
