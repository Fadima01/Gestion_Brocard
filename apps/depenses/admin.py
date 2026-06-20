from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Expense

@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ('id', 'categorie', 'montant', 'date_depense', 'ordre_production', 'session_caisse')
    list_filter = ('categorie', 'date_depense', 'ordre_production__workshop')
    search_fields = ('description', 'montant', 'ordre_production__reference')
    ordering = ('-date_depense', '-id')
