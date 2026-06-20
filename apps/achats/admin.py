from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Supplier, FabricPurchase, RawMaterial

class RawMaterialInline(admin.TabularInline):
    model = RawMaterial
    extra = 1
    fields = ('type_matiere', 'categorie', 'couleur', 'quantite_achetee_metres', 'quantite_restante_metres', 'unite_mesure', 'prix_achat_metre', 'date_reception')


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ('name', 'responsable', 'telephone', 'ville', 'est_actif', 'created_at')
    list_filter = ('est_actif', 'ville', 'created_at')
    search_fields = ('name', 'responsable', 'telephone', 'ville')
    ordering = ('name',)


@admin.register(FabricPurchase)
class FabricPurchaseAdmin(admin.ModelAdmin):
    list_display = ('id', 'supplier', 'date_achat', 'montant_total', 'statut_paiement')
    list_filter = ('statut_paiement', 'date_achat', 'supplier')
    search_fields = ('supplier__name', 'id')
    ordering = ('-date_achat',)
    inlines = [RawMaterialInline]


@admin.register(RawMaterial)
class RawMaterialAdmin(admin.ModelAdmin):
    list_display = (
        'type_matiere', 
        'categorie',
        'couleur', 
        'quantite_achetee_metres', 
        'quantite_restante_metres', 
        'unite_mesure',
        'prix_achat_metre', 
        'date_reception',
        'is_archived'
    )
    list_filter = ('is_archived', 'categorie', 'unite_mesure', 'type_matiere', 'couleur', 'date_reception')
    search_fields = ('type_matiere', 'couleur', 'fabric_purchase__supplier__name')
    ordering = ('-date_reception',)
