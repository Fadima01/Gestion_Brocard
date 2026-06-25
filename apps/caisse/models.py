from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel
from apps.core.choices import CashSessionStatus

class CashSession(TimeStampedModel):
    """
    Session journalière de caisse du magasin physique pour suivre les espèces entrantes et sortantes.
    """
    responsible = models.ForeignKey(
        'remunerations.CompanyMember',
        on_delete=models.RESTRICT,
        related_name="cash_sessions",
        verbose_name=_("Responsable de caisse")
    )
    opening_date = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date et heure d'ouverture")
    )
    closing_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Date et heure de fermeture")
    )
    initial_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant initial (fond de caisse)")
    )
    cash_sales_collected = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Ventes encaissées (espèces)")
    )
    cash_expenses = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Dépenses de caisse")
    )
    theoretical_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant théorique attendu"),
        help_text=_("Calculé automatiquement : initial_amount + cash_sales_collected - cash_expenses.")
    )
    real_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Montant réel compté (à la fermeture)")
    )
    cash_discrepancy = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Écart de caisse"),
        help_text=_("Calculé automatiquement : real_amount - theoretical_amount.")
    )
    status = models.CharField(
        max_length=20,
        choices=CashSessionStatus.choices,
        default=CashSessionStatus.OPEN,
        verbose_name=_("Statut de la session")
    )
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes / Observations")
    )

    class Meta:
        verbose_name = _("Session de caisse")
        verbose_name_plural = _("Sessions de caisse")
        ordering = ['-opening_date']
        constraints = [
            models.CheckConstraint(
                check=models.Q(initial_amount__gte=0),
                name="chk_caisse_initial_amount_positive"
            ),
            models.CheckConstraint(
                check=models.Q(cash_sales_collected__gte=0),
                name="chk_caisse_sales_collected_positive"
            ),
            models.CheckConstraint(
                check=models.Q(cash_expenses__gte=0),
                name="chk_caisse_expenses_positive"
            ),
            models.CheckConstraint(
                check=models.Q(theoretical_amount__gte=0),
                name="chk_caisse_theoretical_amount_positive"
            )
        ]

    def __str__(self):
        return f"Caisse #{self.id} du {self.opening_date.date()} ({self.get_status_display()})"

    def clean(self):
        super().clean()
        if self.initial_amount is not None and self.cash_sales_collected is not None and self.cash_expenses is not None:
            self.theoretical_amount = self.initial_amount + self.cash_sales_collected - self.cash_expenses
        if self.real_amount is not None and self.theoretical_amount is not None:
            self.cash_discrepancy = self.real_amount - self.theoretical_amount

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class CaisseMouvement(TimeStampedModel):
    """
    Suivi des entrées et sorties de la caisse globale de l'entreprise.
    """
    class TypeMouvement(models.TextChoices):
        ENTREE = 'ENTREE', _('Entrée')
        SORTIE = 'SORTIE', _('Sortie')

    date_mouvement = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date du mouvement")
    )
    type_mouvement = models.CharField(
        max_length=10,
        choices=TypeMouvement.choices,
        verbose_name=_("Type de mouvement")
    )
    montant = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant")
    )
    mode_paiement = models.CharField(
        max_length=50,
        verbose_name=_("Mode de paiement"),
        help_text=_("Ex: Espèces, Orange Money, Wave, Virement bancaire")
    )
    description = models.TextField(
        blank=True,
        verbose_name=_("Description / Motif")
    )
    reference = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        verbose_name=_("Référence unique")
    )

    # Liaisons optionnelles avec cascade delete pour la traçabilité des opérations
    customer_payment = models.ForeignKey(
        'ventes.CustomerPayment',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='caisse_movements'
    )
    reservation = models.ForeignKey(
        'ventes.Reservation',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='caisse_movements'
    )
    expense = models.ForeignKey(
        'depenses.Expense',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='caisse_movements'
    )
    workshop_payment = models.ForeignKey(
        'production.WorkshopPayment',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='caisse_movements'
    )
    compensation_payment = models.ForeignKey(
        'remunerations.CompensationPayment',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='caisse_movements'
    )
    salary_advance = models.ForeignKey(
        'remunerations.SalaryAdvance',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='caisse_movements'
    )

    class Meta:
        verbose_name = _("Mouvement de caisse")
        verbose_name_plural = _("Mouvements de caisse")
        ordering = ['-date_mouvement', '-id']

    def __str__(self):
        return f"{self.reference or self.id} | {self.get_type_mouvement_display()} | {self.montant} FCFA | {self.mode_paiement} ({self.date_mouvement.date()})"

    def save(self, *args, **kwargs):
        if not self.reference:
            from apps.core.utils import generate_unique_reference
            self.reference = generate_unique_reference(CaisseMouvement, 'CAI')
        super().save(*args, **kwargs)

