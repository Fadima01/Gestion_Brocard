from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import CustomerReturn, ReturnLine

class ReturnLineInline(admin.TabularInline):
    model = ReturnLine
    extra = 1
    fields = ('variant', 'quantite', 'motif', 'reintegre_stock', 'notes')


@admin.register(CustomerReturn)
class CustomerReturnAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'date_retour', 'statut_retour', 'montant_rembourse', 'accredite_avoir')
    list_filter = ('statut_retour', 'date_retour', 'order__canal_vente')
    search_fields = ('order__reference', 'order__customer__nom', 'order__customer__telephone')
    ordering = ('-date_retour',)
    inlines = [ReturnLineInline]


@admin.register(ReturnLine)
class ReturnLineAdmin(admin.ModelAdmin):
    list_display = ('customer_return', 'variant', 'quantite', 'motif', 'reintegre_stock')
    list_filter = ('motif', 'reintegre_stock', 'variant__model')
    search_fields = ('customer_return__order__reference', 'variant__sku', 'notes')
    ordering = ('customer_return', 'variant')
