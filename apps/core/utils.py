import re
from django.utils import timezone
from django.db import transaction

def generate_unique_reference(model_class, prefix, field_name='reference', padding=4):
    """
    Génère une référence unique séquentielle au format PREFIX-YYYY-XXXX.
    Exemple : CONF-2026-0001
    Les références ne sont jamais réutilisées (même après suppression).
    """
    from apps.core.models import ReferenceSequence
    current_year = timezone.now().year
    prefix_str = f"{prefix}-{current_year}-"
    sequence_key = f"{prefix}_{model_class.__name__}"

    with transaction.atomic():
        # Verrouiller la ligne avec une clé propre à la combinaison préfixe + modèle
        seq_obj, created = ReferenceSequence.objects.select_for_update().get_or_create(
            prefix=sequence_key,
            year=current_year,
            defaults={'last_sequence': 0}
        )

        if created or seq_obj.last_sequence == 0:
            # Récupérer les références existantes en base pour initialiser la séquence
            queryset = model_class.objects.all()
            values = queryset.filter(**{f"{field_name}__startswith": prefix_str}).values_list(field_name, flat=True)
            
            max_num = 0
            pattern = re.compile(rf"^{re.escape(prefix_str)}(\d+)$")
            for val in values:
                match = pattern.match(val)
                if match:
                    try:
                        num = int(match.group(1))
                        if num > max_num:
                            max_num = num
                    except ValueError:
                        pass
            seq_obj.last_sequence = max_num

        new_num = seq_obj.last_sequence + 1
        new_ref = f"{prefix}-{current_year}-{new_num:0{padding}d}"

        # Mettre à jour et enregistrer la séquence
        seq_obj.last_sequence = new_num
        seq_obj.save()

        # Boucle de sécurité additionnelle au cas où des modifications manuelles hors séquenceur auraient eu lieu
        while model_class.objects.filter(**{field_name: new_ref}).exists():
            new_num += 1
            new_ref = f"{prefix}-{current_year}-{new_num:0{padding}d}"
            seq_obj.last_sequence = new_num
            seq_obj.save()

        return new_ref

