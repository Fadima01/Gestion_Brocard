from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel
from apps.core.choices import PaymentStatus, AdvanceStatus
from apps.core.validators import validate_phone_number

class CompanyMember(TimeStampedModel):
    """
    Membres de la famille ou employés de l'entreprise percevant une rémunération mensuelle fixe ou variable.
    """
    first_name = models.CharField(
        max_length=100,
        verbose_name=_("Prénom")
    )
    last_name = models.CharField(
        max_length=100,
        verbose_name=_("Nom de famille")
    )
    role = models.CharField(
        max_length=100,
        verbose_name=_("Rôle / Poste occupé")
    )
    telephone = models.CharField(
        max_length=20,
        validators=[validate_phone_number],
        verbose_name=_("Téléphone")
    )
    remuneration_mensuelle_standard = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Rémunération mensuelle de base")
    )
    date_embauche = models.DateField(
        verbose_name=_("Date d'embauche")
    )
    est_actif = models.BooleanField(
        default=True,
        verbose_name=_("Actif")
    )

    class Meta:
        verbose_name = _("Membre de l'entreprise")
        verbose_name_plural = _("Membres de l'entreprise")
        ordering = ['last_name', 'first_name']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.role})"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"


class MonthlyCompensation(TimeStampedModel):
    """
    Fiche de règlement mensuelle récapitulative pour un membre.
    """
    member = models.ForeignKey(
        CompanyMember,
        on_delete=models.RESTRICT,
        related_name="monthly_compensations",
        verbose_name=_("Collaborateur")
    )
    mois = models.IntegerField(
        verbose_name=_("Mois de règlement"),
        help_text=_("Valeur numérique de 1 (Janvier) à 12 (Décembre).")
    )
    annee = models.IntegerField(
        verbose_name=_("Année de règlement")
    )
    montant_du = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant brut dû")
    )
    avances_deduites = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Avances de salaires déduites")
    )
    net_amount_payable = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant net à payer"),
        help_text=_("Calculé automatiquement : montant_du - avances_deduites.")
    )
    paid_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Montant réglé effectif")
    )
    amount_remaining = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Reste à régler"),
        help_text=_("Calculé automatiquement : net_amount_payable - paid_amount.")
    )
    payment_status = models.CharField(
        max_length=25,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
        verbose_name=_("Statut du paiement")
    )

    class Meta:
        verbose_name = _("Rémunération mensuelle")
        verbose_name_plural = _("Rémunérations mensuelles")
        ordering = ['-annee', '-mois', 'member']
        constraints = [
            models.UniqueConstraint(
                fields=['member', 'mois', 'annee'],
                name='uq_remun_member_period'
            ),
            models.CheckConstraint(
                check=models.Q(mois__gte=1) & models.Q(mois__lte=12),
                name="chk_remun_month_valid"
            ),
            models.CheckConstraint(
                check=models.Q(montant_du__gte=0),
                name="chk_remun_due_positive"
            ),
            models.CheckConstraint(
                check=models.Q(avances_deduites__gte=0),
                name="chk_remun_advances_deducted_positive"
            ),
            models.CheckConstraint(
                check=models.Q(net_amount_payable__gte=0),
                name="chk_remun_net_positive"
            ),
            models.CheckConstraint(
                check=models.Q(paid_amount__gte=0),
                name="chk_remun_paid_positive"
            ),
            models.CheckConstraint(
                check=models.Q(amount_remaining__gte=0),
                name="chk_remun_remaining_positive"
            ),
            models.CheckConstraint(
                check=models.Q(avances_deduites__lte=models.F('montant_du')),
                name="chk_remun_advances_deducted_lte_due"
            ),
            models.CheckConstraint(
                check=models.Q(paid_amount__lte=models.F('net_amount_payable')),
                name="chk_remun_paid_lte_net"
            )
        ]

    def __str__(self):
        return f"{self.member.get_full_name()} - {self.mois}/{self.annee} ({self.get_payment_status_display()})"

    def clean(self):
        super().clean()
        if self.montant_du is not None and self.avances_deduites is not None:
            self.net_amount_payable = self.montant_du - self.avances_deduites
        if self.net_amount_payable is not None and self.paid_amount is not None:
            self.amount_remaining = self.net_amount_payable - self.paid_amount

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class SalaryAdvance(TimeStampedModel):
    """
    Enregistrement des acomptes et avances sur salaires octroyés à un collaborateur.
    """
    member = models.ForeignKey(
        CompanyMember,
        on_delete=models.RESTRICT,
        related_name="salary_advances",
        verbose_name=_("Collaborateur")
    )
    grant_date = models.DateField(
        default=timezone.now,
        verbose_name=_("Date d'octroi")
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant accordé")
    )
    reference = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        verbose_name=_("Référence unique")
    )
    status = models.CharField(
        max_length=30,
        choices=AdvanceStatus.choices,
        default=AdvanceStatus.PENDING,
        verbose_name=_("Statut de l'avance")
    )
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes explicatives")
    )

    class Meta:
        verbose_name = _("Avance sur salaire")
        verbose_name_plural = _("Avances sur salaires")
        ordering = ['-grant_date']
        constraints = [
            models.CheckConstraint(
                check=models.Q(amount__gt=0),
                name="chk_remun_advance_amount_positive"
            )
        ]

    def __str__(self):
        return f"Avance {self.reference or self.id} de {self.amount} FCFA pour {self.member.get_full_name()} du {self.grant_date}"

    def save(self, *args, **kwargs):
        if not self.reference:
            last_adv = SalaryAdvance.objects.all().order_by('-id').first()
            seq = 1
            if last_adv and last_adv.reference:
                try:
                    seq = int(last_adv.reference.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    pass
            self.reference = f"SAL-{seq:04d}"
        super().save(*args, **kwargs)


class CompensationPayment(TimeStampedModel):
    """
    Historique des versements réels versés sur les fiches de rémunérations.
    """
    monthly_compensation = models.ForeignKey(
        MonthlyCompensation,
        on_delete=models.RESTRICT,
        related_name="payments",
        verbose_name=_("Fiche de paie mensuelle")
    )
    payment_date = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date du versement")
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant versé")
    )
    reference = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        verbose_name=_("Référence unique")
    )
    payment_mode = models.CharField(
        max_length=50,
        verbose_name=_("Mode de versement"),
        help_text=_("Ex: Espèces, Virement, Mobile Money")
    )
    transaction_reference = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Référence de la transaction")
    )
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes / Détails")
    )

    class Meta:
        verbose_name = _("Paiement de rémunération")
        verbose_name_plural = _("Paiements de rémunérations")
        ordering = ['-payment_date']
        constraints = [
            models.CheckConstraint(
                check=models.Q(amount__gt=0),
                name="chk_remun_payment_amount_positive"
            )
        ]

    def __str__(self):
        return f"Versement {self.reference or self.id} ({self.amount} FCFA) à {self.monthly_compensation.member.get_full_name()} le {self.payment_date.date()}"

    def save(self, *args, **kwargs):
        if not self.reference:
            last_pay = CompensationPayment.objects.all().order_by('-id').first()
            seq = 1
            if last_pay and last_pay.reference:
                try:
                    seq = int(last_pay.reference.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    pass
            self.reference = f"SAL-{seq:04d}"
        super().save(*args, **kwargs)
