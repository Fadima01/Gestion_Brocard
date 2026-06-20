from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import CompanyMember, MonthlyCompensation, SalaryAdvance, CompensationPayment

class SalaryAdvanceInline(admin.TabularInline):
    model = SalaryAdvance
    extra = 1
    fields = ('grant_date', 'amount', 'status', 'notes')


class MonthlyCompensationInline(admin.TabularInline):
    model = MonthlyCompensation
    extra = 0
    fields = ('mois', 'annee', 'montant_du', 'avances_deduites', 'net_amount_payable', 'paid_amount', 'amount_remaining', 'payment_status')
    readonly_fields = ('net_amount_payable', 'amount_remaining')
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False


class CompensationPaymentInline(admin.TabularInline):
    model = CompensationPayment
    extra = 1
    fields = ('payment_date', 'amount', 'payment_mode', 'transaction_reference', 'notes')


@admin.register(CompanyMember)
class CompanyMemberAdmin(admin.ModelAdmin):
    list_display = ('first_name', 'last_name', 'role', 'telephone', 'remuneration_mensuelle_standard', 'date_embauche', 'est_actif')
    list_filter = ('est_actif', 'role', 'date_embauche')
    search_fields = ('first_name', 'last_name', 'role', 'telephone')
    ordering = ('last_name', 'first_name')
    inlines = [SalaryAdvanceInline, MonthlyCompensationInline]


@admin.register(MonthlyCompensation)
class MonthlyCompensationAdmin(admin.ModelAdmin):
    list_display = (
        'member', 
        'mois', 
        'annee', 
        'montant_du', 
        'avances_deduites', 
        'net_amount_payable', 
        'paid_amount', 
        'amount_remaining', 
        'payment_status'
    )
    list_filter = ('annee', 'mois', 'payment_status', 'member')
    search_fields = ('member__first_name', 'member__last_name')
    ordering = ('-annee', '-mois', 'member')
    readonly_fields = ('net_amount_payable', 'amount_remaining')
    inlines = [CompensationPaymentInline]


@admin.register(SalaryAdvance)
class SalaryAdvanceAdmin(admin.ModelAdmin):
    list_display = ('member', 'grant_date', 'amount', 'status')
    list_filter = ('status', 'grant_date', 'member')
    search_fields = ('member__first_name', 'member__last_name', 'notes')
    ordering = ('-grant_date',)


@admin.register(CompensationPayment)
class CompensationPaymentAdmin(admin.ModelAdmin):
    list_display = ('monthly_compensation', 'payment_date', 'amount', 'payment_mode', 'transaction_reference')
    list_filter = ('payment_mode', 'payment_date', 'monthly_compensation__member')
    search_fields = ('monthly_compensation__member__first_name', 'monthly_compensation__member__last_name', 'transaction_reference')
    ordering = ('-payment_date',)
