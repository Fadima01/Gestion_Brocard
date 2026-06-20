from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CashSessionViewSet, CaisseMouvementViewSet

router = DefaultRouter()
router.register(r'sessions', CashSessionViewSet, basename='cashsession')
router.register(r'movements', CaisseMouvementViewSet, basename='caissemouvement')

urlpatterns = [
    path('', include(router.urls)),
]
