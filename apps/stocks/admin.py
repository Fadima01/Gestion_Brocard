from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import FinishedGoodStock, StockMovement

class StockMovementInline(admin.TabularInline):
    model = StockMovement
    extra = 0
    readonly_fields = ('quantite', 'type_mouvement', 'description', 'created_at')
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(FinishedGoodStock)
class FinishedGoodStockAdmin(admin.ModelAdmin):
    list_display = ('variant', 'emplacement', 'quantite_reel', 'quantite_reservee', 'disponible_display')
    list_filter = ('emplacement', 'variant__model')
    search_fields = ('variant__sku', 'variant__model__name', 'emplacement')
    ordering = ('emplacement', 'variant')
    inlines = [StockMovementInline]

    def disponible_display(self, obj):
        return obj.disponible()
    disponible_display.short_description = _("Quantité disponible")


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ('stock', 'quantite', 'type_mouvement', 'created_at')
    list_filter = ('type_mouvement', 'created_at', 'stock__emplacement')
    search_fields = ('stock__variant__sku', 'description')
    ordering = ('-created_at',)
    readonly_fields = ('stock', 'quantite', 'type_mouvement', 'description', 'created_at')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False
