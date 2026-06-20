from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import CashSession

@admin.register(CashSession)
class CashSessionAdmin(admin.ModelAdmin):
    list_display = (
        'id', 
        'responsible', 
        'opening_date', 
        'closing_date', 
        'initial_amount', 
        'cash_sales_collected', 
        'cash_expenses', 
        'theoretical_amount', 
        'real_amount', 
        'cash_discrepancy', 
        'status'
    )
    list_filter = ('status', 'opening_date', 'responsible')
    search_fields = ('responsible__first_name', 'responsible__last_name', 'notes')
    ordering = ('-opening_date',)
    readonly_fields = ('theoretical_amount', 'cash_discrepancy')
