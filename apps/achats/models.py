from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import TimeStampedModel
from apps.core.choices import PaymentStatus
from apps.core.validators import validate_phone_number

class Supplier(TimeStampedModel):
    """
    Fournisseurs de tissus Brocard et d'accessoires de couture.
    """
    name = models.CharField(
        max_length=150,
        verbose_name=_("Nom du fournisseur")
    )
    responsable = models.CharField(
        max_length=150,
        blank=True,
        verbose_name=_("Responsable / Contact")
    )
    telephone = models.CharField(
        max_length=20,
        validators=[validate_phone_number],
        verbose_name=_("Téléphone")
    )
    adresse = models.TextField(
        blank=True,
        verbose_name=_("Adresse")
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
        verbose_name = _("Fournisseur")
        verbose_name_plural = _("Fournisseurs")
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.ville})"


class FabricPurchase(TimeStampedModel):
    """
    Achats de rouleaux de tissus et de fournitures auprès de fournisseurs.
    """
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.RESTRICT,
        related_name="purchases",
        verbose_name=_("Fournisseur")
    )
    date_achat = models.DateField(
        verbose_name=_("Date d'achat")
    )
    montant_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Montant total d'achat")
    )
    reference = models.CharField(
        max_length=50,
        unique=True,
        null=True,
        blank=True,
        verbose_name=_("Référence unique")
    )
    statut_paiement = models.CharField(
        max_length=25,
        choices=PaymentStatus.choices,
        default=PaymentStatus.UNPAID,
        verbose_name=_("Statut du paiement")
    )

    class Meta:
        verbose_name = _("Achat de tissu")
        verbose_name_plural = _("Achats de tissus")
        ordering = ['-date_achat']
        constraints = [
            models.CheckConstraint(
                check=models.Q(montant_total__gte=0),
                name="chk_achats_total_amount_positive"
            )
        ]

    def __str__(self):
        return f"Achat {self.reference or self.id} du {self.date_achat} - {self.supplier.name}"

    def save(self, *args, **kwargs):
        if not self.reference:
            from apps.core.utils import generate_unique_reference
            self.reference = generate_unique_reference(FabricPurchase, 'ACH')
        super().save(*args, **kwargs)


class RawMaterial(TimeStampedModel):
    """
    Matières premières (tissus Brocard, doublures, boutons) en stock.
    """
    class CategorieMatiere(models.TextChoices):
        TISSU = 'TISSU', _('Tissu')
        FIL = 'FIL', _('Fil')
        PERLE = 'PERLE', _('Perle')
        FERMETURE = 'FERMETURE', _('Fermeture')
        BOUTON = 'BOUTON', _('Bouton')
        GARNITURE = 'GARNITURE', _('Garniture')
        EMBALLAGE = 'EMBALLAGE', _('Emballage')
        AUTRE = 'AUTRE', _('Autre')

    class UniteMesure(models.TextChoices):
        METRES = 'mètres', _('Mètres')
        BOBINES = 'bobines', _('Bobines')
        SACHETS = 'sachets', _('Sachets')
        UNITES = 'unités', _('Unités')
        ROULEAUX = 'rouleaux', _('Rouleaux')
        PAQUETS = 'paquets', _('Paquets')
        BOITES = 'boîtes', _('Boîtes')
        AUTRE = 'autre', _('Autre')

    fabric_purchase = models.ForeignKey(
        FabricPurchase,
        on_delete=models.CASCADE,
        related_name="raw_materials",
        null=True,
        blank=True,
        verbose_name=_("Achat associé")
    )
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="raw_materials_direct",
        verbose_name=_("Fournisseur")
    )
    date_achat = models.DateField(
        null=True,
        blank=True,
        verbose_name=_("Date d'achat")
    )
    observations = models.TextField(
        blank=True,
        verbose_name=_("Observations")
    )
    type_matiere = models.CharField(
        max_length=100,
        verbose_name=_("Type de matière première"),
        help_text=_("Ex: Brocard Soie Or, Doublure Satin, Bouton Métal")
    )
    categorie = models.CharField(
        max_length=30,
        choices=CategorieMatiere.choices,
        default=CategorieMatiere.TISSU,
        verbose_name=_("Catégorie de matière première")
    )
    unite_mesure = models.CharField(
        max_length=30,
        choices=UniteMesure.choices,
        default=UniteMesure.METRES,
        verbose_name=_("Unité de mesure")
    )
    couleur = models.CharField(
        max_length=50,
        blank=True,
        verbose_name=_("Couleur")
    )
    quantite_achetee_metres = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_("Quantité achetée (mètres / unités)")
    )
    quantite_restante_metres = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_("Quantité restante en stock")
    )
    prix_achat_metre = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Prix d'achat unitaire")
    )
    date_reception = models.DateField(
        verbose_name=_("Date de réception")
    )
    is_archived = models.BooleanField(
        default=False,
        verbose_name=_("Archivé")
    )
    seuil_alerte = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=10.00,
        verbose_name=_("Seuil d'alerte de stock")
    )

    class Meta:
        verbose_name = _("Matière première")
        verbose_name_plural = _("Matières premières")
        ordering = ['-date_reception']
        indexes = [
            models.Index(fields=['type_matiere', 'couleur'], name='idx_raw_material_spec'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(quantite_achetee_metres__gte=0),
                name="chk_achats_quantity_purchased_positive"
            ),
            models.CheckConstraint(
                check=models.Q(quantite_restante_metres__gte=0),
                name="chk_achats_quantity_remaining_positive"
            ),
            models.CheckConstraint(
                check=models.Q(prix_achat_metre__gte=0),
                name="chk_achats_price_positive"
            ),
            models.CheckConstraint(
                check=models.Q(seuil_alerte__gte=0),
                name="chk_achats_seuil_alerte_positive"
            ),
            models.CheckConstraint(
                check=models.Q(quantite_restante_metres__lte=models.F('quantite_achetee_metres')),
                name="chk_achats_remaining_lte_purchased"
            )
        ]

    def __str__(self):
        return f"{self.type_matiere} {self.couleur} ({self.quantite_restante_metres} {self.unite_mesure} restants)"

    @property
    def montant_total_achat(self):
        return (self.quantite_achetee_metres or 0) * (self.prix_achat_metre or 0)

    @property
    def supplier_display(self):
        if self.supplier:
            return self.supplier
        if self.fabric_purchase and self.fabric_purchase.supplier:
            return self.fabric_purchase.supplier
        return None

    @property
    def date_achat_display(self):
        if self.date_achat:
            return self.date_achat
        if self.fabric_purchase and self.fabric_purchase.date_achat:
            return self.fabric_purchase.date_achat
        return self.date_reception


class RawMaterialMovement(models.Model):
    """
    Historique des mouvements de stocks de matières premières (achats, consommations, ajustements).
    """
    class OperationType(models.TextChoices):
        PURCHASE = 'PURCHASE', _('Achat')
        CONSUMPTION = 'CONSUMPTION', _('Consommation atelier')
        CORRECTION = 'CORRECTION', _('Correction')
        RETURN = 'RETURN', _('Retour')
        ADJUSTMENT = 'ADJUSTMENT', _('Ajustement manuel')

    raw_material = models.ForeignKey(
        RawMaterial,
        on_delete=models.CASCADE,
        related_name="movements",
        verbose_name=_("Matière première")
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="raw_material_movements",
        verbose_name=_("Utilisateur")
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Date et heure")
    )
    old_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_("Ancienne quantité")
    )
    new_quantity = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_("Nouvelle quantité")
    )
    difference = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name=_("Différence")
    )
    operation_type = models.CharField(
        max_length=30,
        choices=OperationType.choices,
        verbose_name=_("Type d'opération")
    )
    description = models.TextField(
        blank=True,
        verbose_name=_("Description / Notes")
    )
    production_order = models.ForeignKey(
        'production.ProductionOrder',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='raw_material_movements',
        verbose_name=_("Ordre de production d'origine")
    )
    fabric_purchase = models.ForeignKey(
        'achats.FabricPurchase',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='raw_material_movements',
        verbose_name=_("Achat d'origine")
    )

    class Meta:
        verbose_name = _("Mouvement de matière première")
        verbose_name_plural = _("Mouvements de matières premières")
        ordering = ['-created_at']

    def __str__(self):
        sign = "+" if self.difference > 0 else ""
        unit = self.raw_material.unite_mesure if self.raw_material else "unités"
        return f"{self.get_operation_type_display()} | {sign}{self.difference} {unit} pour {self.raw_material.type_matiere}"
