from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClothingModelViewSet, ModelPhotoViewSet, ProductVariantViewSet, PriceCategoryViewSet

router = DefaultRouter()
router.register(r'categories', PriceCategoryViewSet, basename='pricecategory')
router.register(r'models', ClothingModelViewSet, basename='clothingmodel')
router.register(r'photos', ModelPhotoViewSet, basename='modelphoto')
router.register(r'variants', ProductVariantViewSet, basename='productvariant')

urlpatterns = [
    path('', include(router.urls)),
]
