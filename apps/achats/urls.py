from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupplierViewSet, FabricPurchaseViewSet, RawMaterialViewSet, RawMaterialMovementViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'purchases', FabricPurchaseViewSet, basename='fabricpurchase')
router.register(r'materials', RawMaterialViewSet, basename='rawmaterial')
router.register(r'movements', RawMaterialMovementViewSet, basename='rawmaterialmovement')

urlpatterns = [
    path('', include(router.urls)),
]
