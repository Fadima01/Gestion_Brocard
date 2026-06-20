from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import ClothingModel, ModelPhoto, ProductVariant, PriceCategory

@admin.register(PriceCategory)
class PriceCategoryAdmin(admin.ModelAdmin):
    list_display = ('prix', 'stock_global')
    ordering = ('prix',)

class ModelPhotoInline(admin.TabularInline):
    model = ModelPhoto
    extra = 1
    fields = ('image', 'ordre_affichage', 'legende')
    ordering = ('ordre_affichage',)


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 1
    fields = ('sku', 'taille', 'couleur', 'prix_vente_specifique')
    prepopulated_fields = {}


@admin.register(ClothingModel)
class ClothingModelAdmin(admin.ModelAdmin):
    list_display = ('name', 'prix_vente_conseille', 'is_available', 'is_archived', 'created_at', 'updated_at')
    list_filter = ('is_available', 'is_archived', 'created_at')
    search_fields = ('name', 'description')
    ordering = ('name',)
    inlines = [ModelPhotoInline, ProductVariantInline]


@admin.register(ProductVariant)
class ProductVariantAdmin(admin.ModelAdmin):
    list_display = ('sku', 'model', 'taille', 'couleur', 'specific_price_display')
    list_filter = ('model', 'taille', 'couleur')
    search_fields = ('sku', 'model__name', 'taille', 'couleur')
    ordering = ('model', 'taille', 'couleur')

    def specific_price_display(self, obj):
        if obj.prix_vente_specifique is not None:
            return f"{obj.prix_vente_specifique} FCFA"
        return _("Prix conseillé du modèle")
    specific_price_display.short_description = _("Prix de vente")
