import uuid
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

class UUIDModel(models.Model):
    """
    Classe de base abstraite utilisant un champ UUID4 unique
    comme identifiant ou comme clé secondaire publique.
    """
    uuid = models.UUIDField(
        default=uuid.uuid4,
        editable=False,
        unique=True,
        verbose_name=_("Identifiant unique (UUID)")
    )

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    """
    Classe de base abstraite fournissant des repères temporels 
    de création et de mise à jour automatiques.
    """
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Date de création")
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Date de mise à jour")
    )

    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    """
    QuerySet personnalisé pour la suppression logique (Soft Delete).
    Permet de filtrer par défaut les objets supprimés logiquement.
    """
    def delete(self):
        """Surcharge du delete() par lot pour effectuer une suppression logique."""
        return self.update(is_deleted=True, deleted_at=timezone.now())

    def hard_delete(self):
        """Effectue une suppression physique réelle de la base de données."""
        return super().delete()

    def deleted(self):
        """Retourne uniquement les éléments supprimés logiquement."""
        return self.filter(is_deleted=True)

    def active(self):
        """Retourne uniquement les éléments non supprimés."""
        return self.filter(is_deleted=False)


class SoftDeleteManager(models.Manager):
    """
    Manager de base pour SoftDeleteModel.
    Par défaut, filtre la base pour n'exposer que les enregistrements non supprimés.
    """
    def get_queryset(self):
        return SoftDeleteQuerySet(self.model, using=self._db).active()

    def get_deleted(self):
        """Permet de récupérer les objets supprimés logiquement."""
        return SoftDeleteQuerySet(self.model, using=self._db).deleted()

    def all_objects(self):
        """Permet d'accéder à l'ensemble des objets (actifs + supprimés)."""
        return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(models.Model):
    """
    Classe de base abstraite implémentant le Soft Delete (suppression logique).
    """
    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        verbose_name=_("Supprimé logiquement")
    )
    deleted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Date de suppression")
    )

    # Remplacement du manager par défaut
    objects = SoftDeleteManager()
    # Ajout d'un manager secondaire pour accéder aux données supprimées ou brutes
    global_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, *args, **kwargs):
        """Marque l'objet comme supprimé logiquement sans le détruire en base."""
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def restore(self):
        """Restaure un objet précédemment supprimé logiquement."""
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def hard_delete(self, *args, **kwargs):
        """Supprime définitivement l'objet de la base de données."""
        super().delete(*args, **kwargs)


class ActivityLog(models.Model):
    """
    Journal d'activité global pour tracer les actions clés d'administration et de vente.
    """
    user = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="activity_logs",
        verbose_name=_("Utilisateur ayant effectué l'action")
    )
    timestamp = models.DateTimeField(
        default=timezone.now,
        verbose_name=_("Date et heure")
    )
    action = models.CharField(
        max_length=150,
        verbose_name=_("Action effectuée")
    )
    details = models.TextField(
        blank=True,
        verbose_name=_("Détails complémentaires")
    )

    class Meta:
        verbose_name = _("Journal d'activité")
        verbose_name_plural = _("Journaux d'activité")
        ordering = ['-timestamp']

    def __str__(self):
        username = self.user.username if self.user else "Système"
        return f"{username} - {self.timestamp.strftime('%d/%m/%Y %H:%M')} - {self.action}"


def log_activity(user, action, details=""):
    """
    Utility function to log important activities.
    """
    try:
        if user and user.is_anonymous:
            user = None
        ActivityLog.objects.create(user=user, action=action, details=details)
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to log activity: {e}")


class ReferenceSequence(models.Model):
    """
    Séquenceur de numérotation pour garantir des références séquentielles,
    uniques, indépendantes et jamais réutilisées (même après suppression).
    """
    prefix = models.CharField(max_length=20, verbose_name=_("Préfixe du document"))
    year = models.IntegerField(verbose_name=_("Année"))
    last_sequence = models.IntegerField(default=0, verbose_name=_("Dernière séquence générée"))

    class Meta:
        verbose_name = _("Séquence de référence")
        verbose_name_plural = _("Séquences de références")
        unique_together = ('prefix', 'year')

    def __str__(self):
        return f"{self.prefix}-{self.year} : {self.last_sequence}"

