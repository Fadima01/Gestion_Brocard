from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    """
    Configuration personnalisée de l'interface d'administration Django 
    pour le modèle d'utilisateur personnalisé.
    """
    # Affichage en liste
    list_display = (
        'username', 
        'email', 
        'first_name', 
        'last_name', 
        'role', 
        'is_active', 
        'is_staff',
        'date_joined'
    )
    
    # Filtres latéraux de recherche
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser')
    
    # Recherche textuelle
    search_fields = ('username', 'first_name', 'last_name', 'email')
    
    # Tri par défaut
    ordering = ('-date_joined',)

    # Surcharge des champs éditables pour inclure le rôle
    fieldsets = UserAdmin.fieldsets + (
        (_('Profil ERP Brocard'), {
            'fields': ('role',),
            'description': _('Paramètres d\'accès aux modules métiers.')
        }),
    )

    # Surcharge des champs lors de la création d'un utilisateur
    add_fieldsets = UserAdmin.add_fieldsets + (
        (_('Profil ERP Brocard'), {
            'classes': ('wide',),
            'fields': ('role',),
        }),
    )
