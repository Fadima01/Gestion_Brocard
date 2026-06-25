from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel
from apps.core.choices import ProductionStatus, PaymentStatus
from apps.core.validators import validate_phone_number

class Workshop(TimeStampedModel):
    """
    Ateliers de couture et couturières sous-traitants pour l'assemblage des habits en Brocard.
    """
    name = models.CharField(
        max_length=150,
        verbose_name=_("Nom de l'atelier")
    )
    responsable = models.CharField(
        max_length=150,
        verbose_name=_("Nom du responsable")
    )
    telephone = models.CharField(
        max_length=20,
        validators=[validate_phone_number],
        verbose_name=_("Téléphone")
    )
    adresse = models.TextField(
        blank=True,
        verbose_name=_("Adresse physique")
    )
    ville = models.CharField(
        max_length=100,
        verbose_name=_("Ville")
    )
    est_actif = models.BooleanField(
        default=True,
        verbose_name=_("Actif")
    )

    class Meta:
        verbose_name = _("Atelier de couture")
        verbose_name_plural = _("Ateliers de couture")
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.responsable} - {self.ville})"


class ProductionOrder(TimeStampedModel):
    """
    Ordre de production (OF) confié à un atelier pour la confection d'un lot d'habits.
    """
    reference = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Référence unique")
    )
    workshop = models.ForeignKey(
        Workshop,
        on_delete=models.RESTRICT,
        related_name="production_orders",
        verbose_name=_("Atelier de couture")
    )
    model = models.ForeignKey(
        'catalogue.ClothingModel',
        on_delete=models.RESTRICT,
        related_name="production_orders",
        verbose_name=_("Modèle d'habit"),
        null=True,  # Nullable for safety during migration
        blank=True
    )
    category = models.ForeignKey(
        'catalogue.PriceCategory',
        on_delete=models.RESTRICT,
        related_name="production_orders",
        verbose_name=_("Catégorie de prix"),
        null=False,
        blank=False
    )
    statut = models.CharField(
        max_length=20,
        choices=ProductionStatus.choices,
        default=ProductionStatus.PLANNED,
        verbose_name=_("Statut de production")
    )
    date_debut = models.DateField(
        verbose_name=_("Date de début de fabrication")
    )
    date_fin_prevue = models.DateField(
        verbose_name=_("Date de fin prévue")
    )
    date_fin_reelle = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Date de fin réelle")
    )
    quantite_demandee = models.IntegerField(
        verbose_name=_("Quantité demandée")
    )
    quantite_produite = models.IntegerField(
        default=0,
        verbose_name=_("Quantité conforme produite")
    )
    pieces_defectueuses = models.IntegerField(
        default=0,
        verbose_name=_("Pièces défectueuses / rebutées")
    )
    cout_facon_unitaire = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Coût de façon unitaire"),
        help_text=_("Montant facturé par l'atelier pour assembler une seule pièce.")
    )
    montant_facon_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant façon total"),
        help_text=_("Calculé automatiquement : quantite_produite * cout_facon_unitaire.")
    )
    montant_facon_paye = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Montant façon réglé")
    )
    statut_paiement_facon = models.CharField(
        max_length=25,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
        verbose_name=_("Statut du paiement de la façon")
    )
    cout_matieres_premieres_historique = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        null=True,
        blank=True,
        verbose_name=_("Coût des matières premières (historique)")
    )
    cout_confection_historique = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        null=True,
        blank=True,
        verbose_name=_("Coût de confection (historique)")
    )
    depenses_associees_historique = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        null=True,
        blank=True,
        verbose_name=_("Dépenses associées (historique)")
    )
    cout_revient_unitaire = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Coût de revient unitaire")
    )

    class Meta:
        verbose_name = _("Ordre de production")
        verbose_name_plural = _("Ordres de production")
        ordering = ['-date_debut']
        indexes = [
            models.Index(fields=['reference'], name='idx_prod_reference'),
            models.Index(fields=['statut'], name='idx_prod_status'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantite_demandee__gt=0),
                name="chk_prod_quantity_requested_positive"
            ),
            models.CheckConstraint(
                check=models.Q(quantite_produite__gte=0),
                name="chk_prod_quantity_produced_positive"
            ),
            models.CheckConstraint(
                check=models.Q(pieces_defectueuses__gte=0),
                name="chk_prod_pieces_defective_positive"
            ),
            models.CheckConstraint(
                check=models.Q(cout_facon_unitaire__gte=0),
                name="chk_prod_labor_unit_cost_positive"
            ),
            models.CheckConstraint(
                check=models.Q(montant_facon_total__gte=0),
                name="chk_prod_labor_total_cost_positive"
            ),
            models.CheckConstraint(
                check=models.Q(montant_facon_paye__gte=0),
                name="chk_prod_labor_paid_cost_positive"
            ),
            models.CheckConstraint(
                check=models.Q(cout_revient_unitaire__gte=0),
                name="chk_prod_revient_cost_positive"
            )
        ]

    def __str__(self):
        return f"{self.reference} | {self.workshop.name} ({self.get_statut_display()})"

    def clean(self):
        super().clean()
        if self.quantite_produite is not None and self.quantite_demandee is not None:
            if self.quantite_produite > self.quantite_demandee:
                raise ValidationError(_("La quantité reçue ne peut pas être supérieure à la quantité demandée."))
            self.pieces_defectueuses = max(0, self.quantite_demandee - self.quantite_produite)

        # Transition de statut automatique basé sur les réceptions (si non annulée)
        if self.statut != ProductionStatus.CANCELLED:
            if self.quantite_produite == 0:
                if self.statut in [ProductionStatus.IN_PROGRESS, ProductionStatus.PARTIAL, ProductionStatus.COMPLETED]:
                    self.statut = ProductionStatus.IN_PROGRESS
            elif self.quantite_produite < self.quantite_demandee:
                self.statut = ProductionStatus.PARTIAL
            elif self.quantite_produite == self.quantite_demandee:
                self.statut = ProductionStatus.COMPLETED

        if self.cout_facon_unitaire is not None and self.quantite_produite is not None:
            self.montant_facon_total = self.quantite_produite * self.cout_facon_unitaire

        if self.montant_facon_total is not None and self.montant_facon_paye is not None:
            if self.montant_facon_total == 0:
                self.statut_paiement_facon = PaymentStatus.UNPAID
            elif self.montant_facon_paye == 0:
                self.statut_paiement_facon = PaymentStatus.UNPAID
            elif self.montant_facon_paye >= self.montant_facon_total:
                self.statut_paiement_facon = PaymentStatus.PAID
            else:
                self.statut_paiement_facon = PaymentStatus.PARTIALLY_PAID

        # Calcul et gel des coûts de revient lors de la complétion
        if self.statut == ProductionStatus.COMPLETED:
            if self.pk is not None:
                # Coût des matières premières utilisées
                mat_cost = sum(c.quantite_utilisee_metres * c.raw_material.prix_achat_metre for c in self.consumptions.all())
                # Coût de la confection (façon)
                conf_cost = self.montant_facon_total or 0
                # Autres dépenses associées
                exp_cost = sum(e.montant for e in self.expenses.all())
                
                self.cout_matieres_premieres_historique = mat_cost
                self.cout_confection_historique = conf_cost
                self.depenses_associees_historique = exp_cost
                
                total_cost = mat_cost + conf_cost + exp_cost
                if self.quantite_produite > 0:
                    self.cout_revient_unitaire = total_cost / self.quantite_produite
                else:
                    self.cout_revient_unitaire = 0

    def save(self, *args, **kwargs):
        if not self.reference:
            from apps.core.utils import generate_unique_reference
            self.reference = generate_unique_reference(ProductionOrder, 'CONF')
        self.clean()
        
        # Capture de l'ancienne quantité pour l'ajustement du stock
        old_qty = 0
        if self.pk is not None:
            try:
                old_instance = ProductionOrder.objects.get(pk=self.pk)
                old_qty = old_instance.quantite_produite
            except ProductionOrder.DoesNotExist:
                pass
                
        super().save(*args, **kwargs)
        
        # Ajustement progressif du stock des produits finis
        qty_diff = self.quantite_produite - old_qty
        
        if qty_diff != 0:
            if self.category:
                self.category.stock_global += qty_diff
                self.category.save()
            if self.model:
                variant = self.model.variants.first()
                if variant:
                    from apps.stocks.services import InventoryService
                    from apps.stocks.models import StockMovement
                    
                    mvt_type = StockMovement.MovementType.ENTRY if qty_diff > 0 else StockMovement.MovementType.EXIT
                    desc = f"Réception OF {self.reference}"
                    
                    try:
                        InventoryService.adjust_stock(
                            variant=variant,
                            location="Magasin",
                            quantity=qty_diff,
                            movement_type=mvt_type,
                            description=desc
                        )
                    except Exception:
                        pass


class MaterialConsumption(models.Model):
    """
    Consommation de matières premières (tissus Brocard, boutons) utilisées pour un ordre de production.
    """
    production_order = models.ForeignKey(
        ProductionOrder,
        on_delete=models.CASCADE,
        related_name="consumptions",
        verbose_name=_("Ordre de production")
    )
    raw_material = models.ForeignKey(
        'achats.RawMaterial',
        on_delete=models.RESTRICT,
        related_name="consumptions",
        verbose_name=_("Matière première consommée")
    )
    quantite_utilisee_metres = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_("Quantité consommée (mètres / unités)")
    )

    class Meta:
        verbose_name = _("Consommation de matière")
        verbose_name_plural = _("Consommations de matières")
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantite_utilisee_metres__gt=0),
                name="chk_prod_consumption_qty_positive"
            )
        ]

    def __str__(self):
        return f"{self.quantite_utilisee_metres}m de {self.raw_material.type_matiere} pour {self.production_order.reference}"


class WorkshopPayment(TimeStampedModel):
    """
    Historique des paiements versés à l'atelier de couture pour sa prestation de façon.
    """
    production_order = models.ForeignKey(
        ProductionOrder,
        on_delete=models.RESTRICT,
        related_name="payments",
        verbose_name=_("Ordre de production")
    )
    date_paiement = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date du paiement")
    )
    montant = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant versé")
    )
    mode_paiement = models.CharField(
        max_length=50,
        verbose_name=_("Mode de règlement"),
        help_text=_("Ex: Espèces, Mobile Money, Virement, Chèque")
    )
    reference_transaction = models.CharField(
        max_length=100,
        blank=True,
        verbose_name=_("Référence de la transaction")
    )
    reference = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        null=True,
        verbose_name=_("Référence unique")
    )
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes / Remarques")
    )

    class Meta:
        verbose_name = _("Paiement d'atelier")
        verbose_name_plural = _("Paiements d'ateliers")
        ordering = ['-date_paiement']
        constraints = [
            models.CheckConstraint(
                check=models.Q(montant__gt=0),
                name="chk_prod_payment_amount_positive"
            )
        ]

    def __str__(self):
        return f"Règlement d'atelier {self.reference or self.id} de {self.montant} FCFA pour {self.production_order.reference} ({self.date_paiement.date()})"

    def save(self, *args, **kwargs):
        if not self.reference:
            from apps.core.utils import generate_unique_reference
            self.reference = generate_unique_reference(WorkshopPayment, 'PAY')
        super().save(*args, **kwargs)


class ProductionReceipt(TimeStampedModel):
    """
    Historique de réception de pièces d'un ordre de production.
    """
    production_order = models.ForeignKey(
        ProductionOrder,
        on_delete=models.CASCADE,
        related_name="receipts",
        verbose_name=_("Ordre de production")
    )
    quantite_recue = models.IntegerField(
        verbose_name=_("Quantité reçue")
    )
    date_reception = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date de réception")
    )
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("Validé par")
    )

    class Meta:
        verbose_name = _("Réception de fabrication")
        verbose_name_plural = _("Réceptions de fabrications")
        ordering = ['-date_reception']

    def __str__(self):
        return f"Réception de {self.quantite_recue} robes pour {self.production_order.reference} ({self.date_reception.date()})"


from django.db.models.signals import post_delete
from django.dispatch import receiver

@receiver(post_delete, sender=ProductionOrder)
def decrement_stock_on_order_delete(sender, instance, **kwargs):
    if instance.category and instance.quantite_produite > 0:
        instance.category.stock_global = max(0, instance.category.stock_global - instance.quantite_produite)
        instance.category.save(update_fields=['stock_global'])
        
    if instance.model and instance.quantite_produite > 0:
        variant = instance.model.variants.first()
        if variant:
            from apps.stocks.services import InventoryService
            from apps.stocks.models import StockMovement
            try:
                InventoryService.adjust_stock(
                    variant=variant,
                    location="Magasin",
                    quantity=-instance.quantite_produite,
                    movement_type=StockMovement.MovementType.EXIT,
                    description=f"Suppression OF {instance.reference}"
                )
            except Exception:
                pass
