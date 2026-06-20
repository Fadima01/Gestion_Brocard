from django.contrib import admin
from django.contrib.admin import AdminSite
from django.utils.translation import gettext_lazy as _
from .models import ActivityLog

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'details')
    list_filter = ('action', 'timestamp', 'user')
    search_fields = ('action', 'details', 'user__username')
    ordering = ('-timestamp',)
    readonly_fields = ('timestamp', 'user', 'action', 'details')

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# Monkeypatch AdminSite.get_app_list to reorganize apps/models logically
def get_app_list_monkeypatch(self, request, app_label=None):
    app_list = original_get_app_list(self, request, app_label)
    
    if app_label:
        return app_list

    # Map model identifiers to their dictionaries: 'app_label.model_name' -> model_dict
    model_by_id = {}
    for app in app_list:
        for model in app['models']:
            model_class = None
            for mc in self._registry:
                if mc.__name__ == model['object_name']:
                    model_class = mc
                    break
            
            if model_class:
                label = model_class._meta.app_label.lower()
                m_name = model_class._meta.model_name.lower()
                model_by_id[f"{label}.{m_name}"] = model
            else:
                url = model.get('admin_url') or model.get('add_url')
                if url:
                    parts = [p for p in url.split('/') if p]
                    if len(parts) >= 3:
                        label = parts[1].lower()
                        m_name = parts[2].lower()
                        model_by_id[f"{label}.{m_name}"] = model

    # Virtual app configurations following the requested order
    virtual_apps_config = [
        {
            'name': 'Achats Matières Premières',
            'app_label': 'achats_virt',
            'models': [
                'achats.supplier',
                'achats.fabricpurchase',
                'achats.rawmaterial',
                'stocks.finishedgoodstock',
                'stocks.stockmovement',
            ]
        },
        {
            'name': 'Fabrication',
            'app_label': 'fabrication_virt',
            'models': [
                'production.workshop',
                'production.productionorder',
                'production.workshoppayment',
            ]
        },
        {
            'name': 'Catalogue',
            'app_label': 'catalogue_virt',
            'models': [
                'catalogue.pricecategory',
                'catalogue.clothingmodel',
                'catalogue.productvariant',
            ]
        },
        {
            'name': 'Réservations',
            'app_label': 'reservations_virt',
            'models': [
                'ventes.reservation',
            ]
        },
        {
            'name': 'Ventes & Commandes',
            'app_label': 'ventes_virt',
            'models': [
                'ventes.customer',
                'ventes.order',
                'ventes.customerpayment',
                'retours.customerreturn',
                'retours.returnline',
            ]
        },
        {
            'name': 'Livraisons',
            'app_label': 'livraisons_virt',
            'models': [
                'livraisons.delivery',
            ]
        },
        {
            'name': 'Dépenses',
            'app_label': 'depenses_virt',
            'models': [
                'depenses.expense',
            ]
        },
        {
            'name': 'Rémunérations',
            'app_label': 'remunerations_virt',
            'models': [
                'remunerations.companymember',
                'remunerations.monthlycompensation',
                'remunerations.salaryadvance',
                'remunerations.compensationpayment',
            ]
        },
        {
            'name': 'Caisse',
            'app_label': 'caisse_virt',
            'models': [
                'caisse.cashsession',
            ]
        },
        {
            'name': "Journal d'activité",
            'app_label': 'journal_virt',
            'models': [
                'core.activitylog',
            ]
        },
        {
            'name': 'Utilisateurs',
            'app_label': 'utilisateurs_virt',
            'models': [
                'users.user',
                'auth.group',
            ]
        },
    ]

    new_app_list = []
    categorized_keys = set()

    for config in virtual_apps_config:
        app_models = []
        for key in config['models']:
            if key in model_by_id:
                app_models.append(model_by_id[key])
                categorized_keys.add(key)
        
        if app_models:
            new_app_list.append({
                'name': config['name'],
                'app_label': config['app_label'],
                'app_url': f'/admin/{config["app_label"]}/',
                'has_module_perms': True,
                'models': app_models,
            })

    # Uncategorized models safety net
    uncategorized_models = []
    for key, model_dict in model_by_id.items():
        if key not in categorized_keys:
            uncategorized_models.append(model_dict)
    
    if uncategorized_models:
        new_app_list.append({
            'name': 'Autres',
            'app_label': 'autres_virt',
            'app_url': '/admin/autres_virt/',
            'has_module_perms': True,
            'models': uncategorized_models,
        })

    return new_app_list

original_get_app_list = AdminSite.get_app_list
AdminSite.get_app_list = get_app_list_monkeypatch
