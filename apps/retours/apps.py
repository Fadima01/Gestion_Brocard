from django.apps import AppConfig

class RetoursConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.retours'

    def ready(self):
        import apps.retours.signals
