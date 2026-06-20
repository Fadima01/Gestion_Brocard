from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel
from apps.core.choices import DeliveryStatus

class Delivery(TimeStampedModel):
    """
    Suivi de la livraison et de l'expédition des commandes clients.
    """
    order = models.ForeignKey(
        'ventes.Order',
        on_delete=models.RESTRICT,
        related_name="deliveries",
        verbose_name=_("Commande associée")
    )
    statut_livraison = models.CharField(
        max_length=30,
        choices=DeliveryStatus.choices,
        default=DeliveryStatus.PENDING,
        verbose_name=_("Statut d'expédition")
    )
    adresse_livraison = models.TextField(
        verbose_name=_("Adresse de livraison")
    )
    livreur_nom = models.CharField(
        max_length=150,
        blank=True,
        verbose_name=_("Nom du livreur")
    )
    livreur_prenom = models.CharField(
        max_length=150,
        blank=True,
        verbose_name=_("Prénom du livreur")
    )
    livreur_telephone = models.CharField(
        max_length=30,
        blank=True,
        verbose_name=_("Téléphone du livreur")
    )
    reference = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        verbose_name=_("Référence unique")
    )
    frais_livraison = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Frais de livraison")
    )
    date_livraison_reelle = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Date de livraison effective")
    )
    observations = models.TextField(
        blank=True,
        verbose_name=_("Observations")
    )
    montant_encaisse_livreur = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Montant encaissé par le livreur")
    )
    mode_paiement_recu = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Mode de paiement reçu")
    )
    argent_remis_a_brocard = models.BooleanField(
        default=False,
        verbose_name=_("Argent remis à Brocard")
    )
    montant_remis = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Montant remis à Brocard")
    )
    date_remise_argent = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Date de remise de l'argent")
    )

    class Meta:
        verbose_name = _("Livraison")
        verbose_name_plural = _("Livraisons")
        ordering = ['-created_at']
        constraints = [
            models.CheckConstraint(
                check=models.Q(frais_livraison__gte=0),
                name="chk_livraisons_fees_positive"
            ),
            models.CheckConstraint(
                check=models.Q(montant_encaisse_livreur__gte=0),
                name="chk_livraisons_collected_positive"
            ),
            models.CheckConstraint(
                check=models.Q(montant_remis__gte=0),
                name="chk_livraisons_remitted_positive"
            )
        ]

    def __str__(self):
        return f"Livraison {self.reference or self.id} de {self.order.reference} ({self.get_statut_livraison_display()})"

    def save(self, *args, **kwargs):
        if not self.reference:
            last_delivery = Delivery.objects.all().order_by('-id').first()
            seq = 1
            if last_delivery and last_delivery.reference:
                try:
                    seq = int(last_delivery.reference.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    pass
            self.reference = f"LIV-{seq:04d}"

        is_new = self.pk is None
        old_remis = False
        if not is_new:
            try:
                old_instance = Delivery.objects.get(pk=self.pk)
                old_remis = old_instance.argent_remis_a_brocard
            except Delivery.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        # Si l'argent vient d'être remis à Brocard et qu'il y a un montant collecté
        if not old_remis and self.argent_remis_a_brocard and self.montant_remis > 0:
            from apps.ventes.services import OrderService
            try:
                if self.order.reste_a_payer > 0:
                    pay_amount = min(self.montant_remis, self.order.reste_a_payer)
                    OrderService.record_payment(
                        order=self.order,
                        amount=pay_amount,
                        payment_type='BALANCE',
                        payment_mode=self.mode_paiement_recu or 'Espèces',
                        notes=f"Argent remis par le livreur (Livraison #{self.id})"
                    )
            except Exception:
                pass
