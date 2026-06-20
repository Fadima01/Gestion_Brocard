from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FinishedGoodStockViewSet, StockMovementViewSet

router = DefaultRouter()
router.register(r'inventories', FinishedGoodStockViewSet, basename='finishedgoodstock')
router.register(r'movements', StockMovementViewSet, basename='stockmovement')

urlpatterns = [
    path('', include(router.urls)),
]
