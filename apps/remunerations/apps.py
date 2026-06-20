from django.apps import AppConfig

class RemunerationsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.remunerations'

    def ready(self):
        import apps.remunerations.signals
