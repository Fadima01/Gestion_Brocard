from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Customer, Order, OrderLine, CustomerPayment, Reservation

class OrderLineInline(admin.TabularInline):
    model = OrderLine
    extra = 1
    fields = ('variant', 'quantite', 'prix_unitaire_applique')


class CustomerPaymentInline(admin.TabularInline):
    model = CustomerPayment
    extra = 1
    fields = ('session_caisse', 'date_paiement', 'montant', 'type_paiement', 'mode_paiement', 'notes')


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('nom', 'telephone', 'ville', 'created_at')
    list_filter = ('ville', 'created_at')
    search_fields = ('nom', 'telephone', 'ville')
    ordering = ('nom',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        'reference', 
        'customer', 
        'date_commande', 
        'canal_vente', 
        'statut_commande', 
        'montant_total', 
        'acompte_verse', 
        'reste_a_payer', 
        'statut_paiement'
    )
    list_filter = ('statut_commande', 'statut_paiement', 'canal_vente', 'date_commande')
    search_fields = ('reference', 'customer__nom', 'customer__telephone')
    ordering = ('-date_commande',)
    readonly_fields = ('reste_a_payer',)
    inlines = [OrderLineInline, CustomerPaymentInline]


@admin.register(CustomerPayment)
class CustomerPaymentAdmin(admin.ModelAdmin):
    list_display = ('order', 'date_paiement', 'montant', 'type_paiement', 'mode_paiement')
    list_filter = ('type_paiement', 'mode_paiement', 'date_paiement')
    search_fields = ('order__reference', 'order__customer__nom', 'notes')
    ordering = ('-date_paiement',)


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ('reference', 'customer', 'model', 'quantite', 'date_limite', 'montant_verse', 'montant_restant', 'statut')
    list_filter = ('statut', 'date_limite', 'model')
    search_fields = ('reference', 'customer__nom', 'customer__telephone')
    readonly_fields = ('montant_restant',)
    ordering = ('-date_limite',)
