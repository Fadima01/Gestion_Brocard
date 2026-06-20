from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.utils.translation import gettext_lazy as _

class CustomUserManager(UserManager):
    """
    Manager de base personnalisé pour le modèle User.
    Fournit des raccourcis de filtrage par rôle et garantit la bonne attribution 
    des rôles lors de la création d'utilisateurs.
    """
    def create_user(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', User.Role.SELLER)
        return super().create_user(username, email, password, **extra_fields)

    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('role', User.Role.ADMIN)
        if extra_fields.get('role') != User.Role.ADMIN:
            raise ValueError('Un superutilisateur doit obligatoirement avoir le rôle ADMIN.')
        return super().create_superuser(username, email, password, **extra_fields)

    def admins(self):
        """Retourne uniquement les administrateurs."""
        return self.filter(role=User.Role.ADMIN)

    def sellers(self):
        """Retourne uniquement les vendeurs."""
        return self.filter(role=User.Role.SELLER)


class User(AbstractUser):
    """
    Modèle utilisateur personnalisé intégrant la gestion des profils
    d'authentification pour l'ERP Brocard.
    """
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', _('Administrateur')
        SELLER = 'SELLER', _('Vendeur')

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.SELLER,
        db_index=True,
        verbose_name=_("Rôle de l'utilisateur"),
        help_text=_("Définit les droits d'accès au système (Administrateur / Vendeur).")
    )

    # Association du manager personnalisé
    objects = CustomUserManager()

    class Meta:
        verbose_name = _("Utilisateur")
        verbose_name_plural = _("Utilisateurs")
        ordering = ['-date_joined']
        # Déclaration explicite d'index de performance sur le rôle et les status actifs
        indexes = [
            models.Index(fields=['role', 'is_active'], name='idx_users_role_active'),
        ]

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        """Vérifie si l'utilisateur a le profil Administrateur."""
        return self.role == self.Role.ADMIN or self.is_superuser
