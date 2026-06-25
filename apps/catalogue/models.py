from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.exceptions import ValidationError
from apps.core.models import TimeStampedModel

class PriceCategory(TimeStampedModel):
    """
    Catégories de prix des robes (ex: 17 000 FCFA, 25 000 FCFA).
    """
    prix = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        unique=True,
        verbose_name=_("Prix de la catégorie")
    )
    stock_global = models.IntegerField(
        default=0,
        verbose_name=_("Stock global de robes")
    )

    class Meta:
        verbose_name = _("Catégorie de prix")
        verbose_name_plural = _("Catégories de prix")
        ordering = ['prix']

    def __str__(self):
        return f"Catégorie {int(self.prix)} FCFA"


class ClothingModel(TimeStampedModel):
    """
    Modèle d'habit/design (ex: Design Prestige, Design Élégance).
    """
    category = models.ForeignKey(
        PriceCategory,
        on_delete=models.RESTRICT,
        related_name="designs",
        null=False,
        blank=True,
        verbose_name=_("Catégorie de prix")
    )
    name = models.CharField(
        max_length=150,
        verbose_name=_("Nom du modèle")
    )
    description = models.TextField(
        blank=True,
        verbose_name=_("Description")
    )
    photo_principale = models.ImageField(
        upload_to="catalogue/photos/",
        verbose_name=_("Photo principale")
    )
    prix_vente_conseille = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name=_("Prix de vente conseillé")
    )
    is_available = models.BooleanField(
        default=True,
        verbose_name=_("Disponible pour la vente")
    )
    is_archived = models.BooleanField(
        default=False,
        verbose_name=_("Archivé")
    )
    quantite_affectee = models.IntegerField(
        default=0,
        verbose_name=_("Quantité affectée"),
        help_text=_("Nombre de robes de la catégorie globale affectées à ce design.")
    )
    cout_matieres_premieres = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        null=True,
        blank=True,
        verbose_name=_("Coût des matières premières")
    )
    cout_confection = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        null=True,
        blank=True,
        verbose_name=_("Coût de confection")
    )
    depenses_associees = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        null=True,
        blank=True,
        verbose_name=_("Dépenses associées")
    )

    class Meta:
        verbose_name = _("Modèle d'habit")
        verbose_name_plural = _("Modèles d'habits")
        ordering = ['name']
        constraints = [
            models.CheckConstraint(
                check=models.Q(prix_vente_conseille__gte=0),
                name="chk_catalogue_suggested_price_positive"
            )
        ]

    def __str__(self):
        return self.name

    @property
    def marge_brute(self):
        return (self.prix_vente_conseille or 0) - (self.cout_matieres_premieres or 0) - (self.cout_confection or 0)

    @property
    def benefice_net(self):
        return self.marge_brute - (self.depenses_associees or 0)

    def get_current_stock(self):
        variant = self.variants.first()
        if variant:
            stock = variant.stocks.filter(emplacement="Magasin").first()
            if stock:
                return stock.quantite_reel
        return 0

    def clean(self):
        super().clean()
        # Si la catégorie n'est pas définie, on la cherche ou on la crée à partir du prix
        if not self.category and self.prix_vente_conseille is not None:
            self.category, _ = PriceCategory.objects.get_or_create(prix=self.prix_vente_conseille)
        
        # Validation de la quantité affectée par rapport au stock global de la catégorie
        if self.category:
            other_designs = ClothingModel.objects.filter(category=self.category).exclude(pk=self.pk)
            sum_others = sum(d.get_current_stock() for d in other_designs)
            total_new = sum_others + self.quantite_affectee
            if total_new > self.category.stock_global:
                raise ValidationError(_(
                    "Impossible d'affecter %(qty)d robes. Le stock global disponible pour la catégorie %(price)d FCFA est de %(global_qty)d, et %(allocated)d robes sont déjà affectées à d'autres designs (maximum disponible pour ce design : %(max_avail)d)."
                ), params={
                    'qty': self.quantite_affectee,
                    'price': self.category.prix,
                    'global_qty': self.category.stock_global,
                    'allocated': sum_others,
                    'max_avail': max(0, self.category.stock_global - sum_others)
                })

    def save(self, *args, **kwargs):
        self.full_clean()
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        variant, created = ProductVariant.objects.get_or_create(
            model=self,
            sku=f"MOD-{self.id}",
            defaults={
                'taille': "Unique",
                'couleur': "Unique",
            }
        )
        
        # Ajustement du stock de produits finis correspondant à la quantité affectée
        from apps.stocks.models import FinishedGoodStock, StockMovement
        stock, stock_created = FinishedGoodStock.objects.get_or_create(
            variant=variant,
            emplacement="Magasin",
            defaults={
                'quantite_reel': self.quantite_affectee,
                'quantite_reservee': 0
            }
        )
        if not stock_created:
            diff = self.quantite_affectee - stock.quantite_reel
            if diff != 0:
                stock.quantite_reel = self.quantite_affectee
                stock.save()
                StockMovement.objects.create(
                    stock=stock,
                    quantite=diff,
                    type_mouvement=StockMovement.MovementType.ADJUSTMENT,
                    description=f"Ajustement quantité affectée de design (Nouvelle quantité: {self.quantite_affectee})"
                )
        else:
            if self.quantite_affectee > 0:
                StockMovement.objects.create(
                    stock=stock,
                    quantite=self.quantite_affectee,
                    type_mouvement=StockMovement.MovementType.ENTRY,
                    description="Initialisation quantité affectée de design"
                )



class ModelPhoto(models.Model):
    """
    Galerie de photos supplémentaires associée à un modèle d'habit.
    """
    model = models.ForeignKey(
        ClothingModel,
        on_delete=models.CASCADE,
        related_name="gallery_photos",
        verbose_name=_("Modèle d'habit")
    )
    image = models.ImageField(
        upload_to="catalogue/gallery/",
        verbose_name=_("Photo")
    )
    ordre_affichage = models.IntegerField(
        default=0,
        verbose_name=_("Ordre d'affichage")
    )
    legende = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("Légende")
    )

    class Meta:
        verbose_name = _("Photo de modèle")
        verbose_name_plural = _("Photos de modèles")
        ordering = ['ordre_affichage', 'id']

    def __str__(self):
        return f"Photo de {self.model.name} (Position: {self.ordre_affichage})"


class ProductVariant(TimeStampedModel):
    """
    Déclinaisons physiques d'un modèle d'habit en tailles et couleurs uniques.
    """
    model = models.ForeignKey(
        ClothingModel,
        on_delete=models.RESTRICT,
        related_name="variants",
        verbose_name=_("Modèle d'habit")
    )
    sku = models.CharField(
        max_length=50,
        unique=True,
        verbose_name=_("Code SKU")
    )
    taille = models.CharField(
        max_length=20,
        verbose_name=_("Taille")
    )
    couleur = models.CharField(
        max_length=50,
        verbose_name=_("Couleur")
    )
    prix_vente_specifique = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name=_("Prix de vente spécifique"),
        help_text=_("Laissez vide pour utiliser le prix de vente conseillé du modèle.")
    )

    class Meta:
        verbose_name = _("Variante produit")
        verbose_name_plural = _("Variantes produits")
        ordering = ['model', 'taille', 'couleur']
        indexes = [
            models.Index(fields=['sku'], name='idx_variant_sku'),
            models.Index(fields=['taille', 'couleur'], name='idx_variant_specs'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['model', 'taille', 'couleur'],
                name='uq_variant_model_size_color'
            ),
            models.CheckConstraint(
                check=models.Q(prix_vente_specifique__gte=0) | models.Q(prix_vente_specifique__isnull=True),
                name="chk_catalogue_variant_price_positive"
            )
        ]

    def __str__(self):
        return f"{self.model.name} - {self.taille} - {self.couleur} ({self.sku})"

    def get_price(self):
        """Retourne le prix applicable (spécifique ou de base)."""
        return self.prix_vente_specifique if self.prix_vente_specifique is not None else self.model.prix_vente_conseille
