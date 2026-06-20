from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from apps.core.models import TimeStampedModel
from apps.core.choices import SalesChannel, OrderStatus, PaymentStatus
from apps.core.validators import validate_phone_number

class Customer(TimeStampedModel):
    """
    Fiche client unifiée (WhatsApp, Boutique, TikTok, etc.)
    """
    nom = models.CharField(
        max_length=150,
        verbose_name=_("Nom complet du client")
    )
    telephone = models.CharField(
        max_length=20,
        unique=True,
        validators=[validate_phone_number],
        verbose_name=_("Numéro de téléphone")
    )
    ville = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Ville de résidence")
    )
    quartier = models.CharField(
        max_length=150,
        blank=True,
        verbose_name=_("Quartier de résidence")
    )

    class Meta:
        verbose_name = _("Client")
        verbose_name_plural = _("Clients")
        ordering = ['nom']

    def __str__(self):
        return f"{self.nom} ({self.telephone})"


class Order(TimeStampedModel):
    """
    Commandes clients enregistrées par différents canaux de vente (Boutique, TikTok Live, etc.).
    """
    customer = models.ForeignKey(
        Customer,
        on_delete=models.RESTRICT,
        related_name="orders",
        verbose_name=_("Client")
    )
    reference = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Référence unique")
    )
    date_commande = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date et heure de la commande")
    )
    canal_vente = models.CharField(
        max_length=30,
        choices=SalesChannel.choices,
        verbose_name=_("Canal de vente")
    )
    statut_commande = models.CharField(
        max_length=30,
        choices=OrderStatus.choices,
        default=OrderStatus.DRAFT,
        verbose_name=_("Statut de la commande")
    )
    montant_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant total de la commande"),
        help_text=_("Somme des lignes de commande + frais éventuels - remises.")
    )
    acompte_verse = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Acompte versé par le client")
    )
    reste_a_payer = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Reste à payer"),
        help_text=_("Calculé automatiquement : montant_total - acompte_verse.")
    )
    statut_paiement = models.CharField(
        max_length=30,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
        verbose_name=_("Statut du paiement")
    )
    livraison_necessaire = models.BooleanField(
        default=False,
        verbose_name=_("Livraison nécessaire")
    )
    reservation = models.OneToOneField(
        'Reservation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sale_order',
        verbose_name=_("Réservation d'origine")
    )

    class Meta:
        verbose_name = _("Commande client")
        verbose_name_plural = _("Commandes clients")
        ordering = ['-date_commande']
        indexes = [
            models.Index(fields=['reference'], name='idx_orders_ref'),
            models.Index(fields=['canal_vente', 'date_commande'], name='idx_orders_channel_date'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(montant_total__gte=0),
                name="chk_ventes_order_total_positive"
            ),
            models.CheckConstraint(
                check=models.Q(acompte_verse__gte=0),
                name="chk_ventes_order_deposit_positive"
            ),
            models.CheckConstraint(
                check=models.Q(reste_a_payer__gte=0),
                name="chk_ventes_order_due_positive"
            ),
            models.CheckConstraint(
                check=models.Q(acompte_verse__lte=models.F('montant_total')),
                name="chk_ventes_deposit_lte_total"
            )
        ]

    def __str__(self):
        return f"{self.reference} - {self.customer.nom} ({self.get_statut_commande_display()})"

    def clean(self):
        super().clean()
        if self.montant_total is not None and self.acompte_verse is not None:
            self.reste_a_payer = self.montant_total - self.acompte_verse

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


class OrderLine(models.Model):
    """
    Détail des articles et quantités associés à une commande.
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="lines",
        verbose_name=_("Commande associée")
    )
    variant = models.ForeignKey(
        'catalogue.ProductVariant',
        on_delete=models.RESTRICT,
        related_name="order_lines",
        verbose_name=_("Variante d'habit vendue")
    )
    quantite = models.IntegerField(
        verbose_name=_("Quantité commandée")
    )
    prix_unitaire_applique = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Prix unitaire appliqué")
    )

    class Meta:
        verbose_name = _("Ligne de commande")
        verbose_name_plural = _("Lignes de commandes")
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantite__gt=0),
                name="chk_ventes_line_qty_positive"
            ),
            models.CheckConstraint(
                check=models.Q(prix_unitaire_applique__gte=0),
                name="chk_ventes_line_price_positive"
            )
        ]

    def __str__(self):
        return f"{self.quantite}x {self.variant.sku} dans {self.order.reference}"

    def total_ligne(self):
        """Calcule le montant de la ligne."""
        return self.quantite * self.prix_unitaire_applique


class CustomerPayment(TimeStampedModel):
    """
    Enregistrement de tous les paiements effectués par le client (acomptes, solde comptant, etc.).
    """
    class PaymentType(models.TextChoices):
        DEPOSIT = 'DEPOSIT', _('Acompte de garantie')
        BALANCE = 'BALANCE', _('Solde de commande')
        FULL = 'FULL', _('Paiement complet initial')

    order = models.ForeignKey(
        Order,
        on_delete=models.RESTRICT,
        null=True,
        blank=True,
        related_name="payments",
        verbose_name=_("Commande associée")
    )
    reservation = models.ForeignKey(
        'Reservation',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="payments",
        verbose_name=_("Réservation associée")
    )
    session_caisse = models.ForeignKey(
        'caisse.CashSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customer_payments",
        verbose_name=_("Session de caisse associée")
    )
    date_paiement = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date du versement")
    )
    reference = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        verbose_name=_("Référence unique")
    )
    montant = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant versé")
    )
    type_paiement = models.CharField(
        max_length=30,
        choices=PaymentType.choices,
        verbose_name=_("Type de versement")
    )
    mode_paiement = models.CharField(
        max_length=50,
        verbose_name=_("Mode de paiement"),
        help_text=_("Ex: Espèces, Mobile Money, Virement, Contre-remboursement")
    )
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes / Remarques")
    )

    class Meta:
        verbose_name = _("Paiement client")
        verbose_name_plural = _("Paiements clients")
        ordering = ['-date_paiement']
        constraints = [
            models.CheckConstraint(
                check=models.Q(montant__gt=0),
                name="chk_ventes_payment_amount_positive"
            )
        ]

    def __str__(self):
        return f"Encaissement client {self.reference or self.id} de {self.montant} pour {self.order.reference} ({self.date_paiement.date()})"

    def save(self, *args, **kwargs):
        if not self.reference:
            last_payment = CustomerPayment.objects.exclude(reference__isnull=True).exclude(reference='').order_by('-id').first()
            seq = 1
            if last_payment and last_payment.reference:
                try:
                    seq = int(last_payment.reference.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    pass
            self.reference = f"PAY-{seq:04d}"
        super().save(*args, **kwargs)


class Reservation(TimeStampedModel):
    """
    Réservations clients pour des modèles d'habits avec acompte de garantie et date limite.
    """
    class ReservationStatus(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', _('En attente')
        PAIEMENT_PARTIEL = 'PAIEMENT_PARTIEL', _('Paiement partiel')
        PAYEE = 'PAYEE', _('Payée')
        RECUPEREE = 'RECUPEREE', _('Récupérée')
        ANNULEE = 'ANNULEE', _('Annulée')
        EXPIREE = 'EXPIREE', _('Expirée')

    reference = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        verbose_name=_("Référence de réservation")
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.RESTRICT,
        related_name="reservations",
        verbose_name=_("Client")
    )
    model = models.ForeignKey(
        'catalogue.ClothingModel',
        on_delete=models.RESTRICT,
        related_name="reservations",
        verbose_name=_("Modèle réservé")
    )
    quantite = models.IntegerField(
        default=1,
        verbose_name=_("Quantité réservée")
    )
    date_limite = models.DateField(
        verbose_name=_("Date limite de retrait")
    )
    montant_verse = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Montant versé (acompte)")
    )
    montant_restant = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant restant à payer"),
        help_text=_("Calculé automatiquement : (quantite * prix_vente_conseille) - montant_verse.")
    )
    statut = models.CharField(
        max_length=30,
        choices=ReservationStatus.choices,
        default=ReservationStatus.EN_ATTENTE,
        verbose_name=_("Statut de la réservation")
    )

    class Meta:
        verbose_name = _("Réservation client")
        verbose_name_plural = _("Réservations clients")
        ordering = ['-date_limite', '-id']
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantite__gt=0),
                name="chk_ventes_res_qty_positive"
            ),
            models.CheckConstraint(
                check=models.Q(montant_verse__gte=0),
                name="chk_ventes_res_paid_positive"
            ),
            models.CheckConstraint(
                check=models.Q(montant_restant__gte=0),
                name="chk_ventes_res_remaining_positive"
            )
        ]

    def __str__(self):
        return f"Réservation {self.reference} - {self.customer.nom} ({self.get_statut_display()})"

    def clean(self):
        super().clean()
        if self.model and self.montant_verse is not None:
            total = self.quantite * self.model.prix_vente_conseille
            self.montant_restant = total - self.montant_verse
            
        if self.statut not in [self.ReservationStatus.RECUPEREE, self.ReservationStatus.ANNULEE, self.ReservationStatus.EXPIREE]:
            if self.montant_verse == 0:
                self.statut = self.ReservationStatus.EN_ATTENTE
            elif self.montant_verse > 0 and self.montant_restant > 0:
                self.statut = self.ReservationStatus.PAIEMENT_PARTIEL
            elif self.montant_verse > 0 and self.montant_restant == 0:
                self.statut = self.ReservationStatus.PAYEE
                
        if self.statut == self.ReservationStatus.RECUPEREE and self.montant_restant > 0:
            raise ValidationError(_("Impossible de remettre l'habit au client car un solde reste à payer."))

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        if not self.reference:
            year_str = timezone.now().strftime('%Y')
            last_res = Reservation.objects.filter(reference__startswith=f"RES-{year_str}").order_by('-id').first()
            seq = 1
            if last_res:
                try:
                    seq = int(last_res.reference.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    pass
            self.reference = f"RES-{year_str}-{seq:04d}"
        self.clean()
        super().save(*args, **kwargs)
        if is_new and self.montant_verse > 0:
            pay_type = 'FULL' if self.montant_restant == 0 else 'DEPOSIT'
            CustomerPayment.objects.create(
                reservation=self,
                order=None,
                montant=self.montant_verse,
                type_paiement=pay_type,
                mode_paiement='Espèces',
                notes=f"Acompte de création pour la réservation {self.reference}"
            )
