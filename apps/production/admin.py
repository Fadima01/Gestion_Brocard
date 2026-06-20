from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Workshop, ProductionOrder, MaterialConsumption, WorkshopPayment

class MaterialConsumptionInline(admin.TabularInline):
    model = MaterialConsumption
    extra = 1
    fields = ('raw_material', 'quantite_utilisee_metres')


class WorkshopPaymentInline(admin.TabularInline):
    model = WorkshopPayment
    extra = 1
    fields = ('date_paiement', 'montant', 'mode_paiement', 'reference_transaction', 'notes')


@admin.register(Workshop)
class WorkshopAdmin(admin.ModelAdmin):
    list_display = ('name', 'responsable', 'telephone', 'ville', 'est_actif')
    list_filter = ('est_actif', 'ville')
    search_fields = ('name', 'responsable', 'telephone', 'ville')
    ordering = ('name',)


@admin.register(ProductionOrder)
class ProductionOrderAdmin(admin.ModelAdmin):
    list_display = (
        'reference', 
        'workshop', 
        'statut', 
        'date_debut', 
        'date_fin_prevue', 
        'quantite_demandee', 
        'quantite_reçue', 
        'quantite_manquante', 
        'cout_facon_unitaire',
        'montant_facon_total',
        'statut_paiement_facon'
    )
    list_filter = ('statut', 'statut_paiement_facon', 'workshop', 'date_debut')
    search_fields = ('reference', 'workshop__name')
    ordering = ('-date_debut',)
    fields = (
        'reference', 'workshop', 'model', 'category', 'statut', 
        'date_debut', 'date_fin_prevue', 'date_fin_reelle', 
        'quantite_demandee', 'quantite_produite', 'quantite_manquante', 
        'cout_facon_unitaire', 'montant_facon_total', 'montant_facon_paye', 
        'statut_paiement_facon', 'cout_revient_unitaire'
    )
    readonly_fields = ('reference', 'montant_facon_total', 'montant_facon_paye', 'statut_paiement_facon', 'cout_revient_unitaire', 'quantite_manquante')
    inlines = [MaterialConsumptionInline, WorkshopPaymentInline]

    def quantite_reçue(self, obj):
        return obj.quantite_produite
    quantite_reçue.short_description = _("Quantité reçue")

    def quantite_manquante(self, obj):
        return max(0, obj.quantite_demandee - obj.quantite_produite)
    quantite_manquante.short_description = _("Quantité manquante")


@admin.register(WorkshopPayment)
class WorkshopPaymentAdmin(admin.ModelAdmin):
    list_display = ('production_order', 'date_paiement', 'montant', 'mode_paiement', 'reference_transaction')
    list_filter = ('mode_paiement', 'date_paiement', 'production_order__workshop')
    search_fields = ('production_order__reference', 'reference_transaction', 'notes')
    ordering = ('-date_paiement',)
