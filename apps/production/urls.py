from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WorkshopViewSet, ProductionOrderViewSet, MaterialConsumptionViewSet, WorkshopPaymentViewSet

router = DefaultRouter()
router.register(r'workshops', WorkshopViewSet, basename='workshop')
router.register(r'orders', ProductionOrderViewSet, basename='productionorder')
router.register(r'consumptions', MaterialConsumptionViewSet, basename='materialconsumption')
router.register(r'payments', WorkshopPaymentViewSet, basename='workshoppayment')

urlpatterns = [
    path('', include(router.urls)),
]
