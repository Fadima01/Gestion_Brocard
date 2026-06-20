from django.db import models
from django.utils.translation import gettext_lazy as _

class SalesChannel(models.TextChoices):
    TIKTOK_LIVE = 'TIKTOK_LIVE', _('TikTok Live')
    TIKTOK = 'TIKTOK', _('TikTok')
    WHATSAPP = 'WHATSAPP', _('WhatsApp')
    BOUTIQUE = 'BOUTIQUE', _('Boutique Physique')
    TELEPHONE = 'TELEPHONE', _('Téléphone')

class OrderStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Brouillon')
    VALIDATED = 'VALIDATED', _('Validée')
    SHIPPING = 'SHIPPING', _('En cours de livraison')
    DELIVERED = 'DELIVERED', _('Livrée')
    CANCELLED = 'CANCELLED', _('Annulée')
    RETURNED = 'RETURNED', _('Retournée')

class PaymentStatus(models.TextChoices):
    UNPAID = 'UNPAID', _('Non payé')
    PARTIALLY_PAID = 'PARTIALLY_PAID', _('Partiellement payé')
    PAID = 'PAID', _('Payé')
    REFUNDED = 'REFUNDED', _('Remboursé')

class DeliveryStatus(models.TextChoices):
    PENDING = 'PENDING', _('En attente')
    SHIPPING = 'SHIPPING', _('En cours de livraison')
    DELIVERED = 'DELIVERED', _('Livrée')
    DELIVERED_COLLECTED = 'DELIVERED_COLLECTED', _('Livrée et encaissée')
    RETURNED = 'RETURNED', _('Retournée')

class ReturnReason(models.TextChoices):
    WRONG_SIZE = 'WRONG_SIZE', _('Taille incorrecte')
    WRONG_COLOR = 'WRONG_COLOR', _('Couleur incorrecte')
    DEFECTIVE = 'DEFECTIVE', _('Défaut produit')
    REFUSED_DELIVERY = 'REFUSED_DELIVERY', _('Refus de livraison')

class ProductionStatus(models.TextChoices):
    PLANNED = 'PLANNED', _('Planifiée')
    IN_PROGRESS = 'IN_PROGRESS', _('En cours')
    PARTIAL = 'PARTIAL', _('Réception partielle')
    COMPLETED = 'COMPLETED', _('Terminée')
    CANCELLED = 'CANCELLED', _('Annulée')

class ExpenseCategory(models.TextChoices):
    TRANSPORT = 'TRANSPORT', _('Transport')
    FOOD = 'FOOD', _('Nourriture')
    DRINKS = 'DRINKS', _('Eau / Boisson')
    FUEL = 'FUEL', _('Carburant')
    COMMUNICATION = 'COMMUNICATION', _('Communication')
    COMPENSATION = 'COMPENSATION', _('Rémunérations')
    RAW_MAT = 'RAW_MAT', _('Achat Matières Premières')
    OTHER = 'OTHER', _('Autre')

class CashSessionStatus(models.TextChoices):
    OPEN = 'OPEN', _('Ouverte')
    CLOSED = 'CLOSED', _('Fermée')

class AdvanceStatus(models.TextChoices):
    PENDING = 'PENDING', _('En attente')
    APPROVED = 'APPROVED', _('Approuvée')
    REJECTED = 'REJECTED', _('Rejetée')
    DEDUCTED = 'DEDUCTED', _('Déduite')
