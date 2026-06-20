from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Delivery

@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = (
        'id', 
        'order', 
        'statut_livraison', 
        'livreur_nom', 
        'frais_livraison', 
        'date_livraison_reelle', 
        'created_at'
    )
    list_filter = ('statut_livraison', 'date_livraison_reelle', 'created_at')
    search_fields = ('order__reference', 'order__customer__nom', 'livreur_nom', 'adresse_livraison')
    ordering = ('-created_at',)
