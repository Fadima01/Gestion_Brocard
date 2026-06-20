from django.utils.translation import gettext_lazy as _

class SalesChannel:
    TIKTOK_LIVE = 'TIKTOK_LIVE', _('TikTok Live')
    TIKTOK = 'TIKTOK', _('TikTok')
    WHATSAPP = 'WHATSAPP', _('WhatsApp')
    BOUTIQUE = 'BOUTIQUE', _('Boutique Physique')
    TELEPHONE = 'TELEPHONE', _('Téléphone')

    CHOICES = [
        TIKTOK_LIVE,
        TIKTOK,
        WHATSAPP,
        BOUTIQUE,
        TELEPHONE,
    ]

class OrderStatus:
    DRAFT = 'DRAFT', _('Brouillon')
    VALIDATED = 'VALIDATED', _('Validée')
    SHIPPING = 'SHIPPING', _('En cours de livraison')
    DELIVERED = 'DELIVERED', _('Livrée')
    CANCELLED = 'CANCELLED', _('Annulée')
    RETURNED = 'RETURNED', _('Retournée')

    CHOICES = [
        DRAFT,
        VALIDATED,
        SHIPPING,
        DELIVERED,
        CANCELLED,
        RETURNED,
    ]

class PaymentStatus:
    UNPAID = 'UNPAID', _('Non payé')
    PARTIALLY_PAID = 'PARTIALLY_PAID', _('Partiellement payé')
    PAID = 'PAID', _('Payé')
    REFUNDED = 'REFUNDED', _('Remboursé')

    CHOICES = [
        UNPAID,
        PARTIALLY_PAID,
        PAID,
        REFUNDED,
    ]

class DeliveryStatus:
    PREPARATION = 'PREPARATION', _('En préparation')
    SHIPPING = 'SHIPPING', _('En cours de livraison')
    DELIVERED = 'DELIVERED', _('Livrée')
    RETURNED = 'RETURNED', _('Retournée / Échouée')

    CHOICES = [
        PREPARATION,
        SHIPPING,
        DELIVERED,
        RETURNED,
    ]

class ReturnReason:
    WRONG_SIZE = 'WRONG_SIZE', _('Taille incorrecte')
    WRONG_COLOR = 'WRONG_COLOR', _('Couleur incorrecte')
    DEFECTIVE = 'DEFECTIVE', _('Défaut produit')
    REFUSED_DELIVERY = 'REFUSED_DELIVERY', _('Refus de livraison')

    CHOICES = [
        WRONG_SIZE,
        WRONG_COLOR,
        DEFECTIVE,
        REFUSED_DELIVERY,
    ]
