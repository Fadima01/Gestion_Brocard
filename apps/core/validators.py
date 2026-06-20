import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

def validate_phone_number(value):
    """
    Valide qu'un numéro de téléphone est dans un format valide international ou national.
    Exemples autorisés : +221771234567, 00221771234567, 771234567
    """
    # Expression régulière autorisant optionnellement +, 00, suivis de 7 à 14 chiffres
    phone_regex = re.compile(r'^\+?(?:[0-9] ?){6,14}[0-9]$')
    if not phone_regex.match(value):
        raise ValidationError(
            _("%(value)s n'est pas un numéro de téléphone valide."),
            params={'value': value},
        )
