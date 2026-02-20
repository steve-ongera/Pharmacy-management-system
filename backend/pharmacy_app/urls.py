from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CustomTokenView, CategoryViewSet, MedicineViewSet,
    SaleViewSet, MpesaViewSet
)

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='category')
router.register('medicines', MedicineViewSet, basename='medicine')
router.register('sales', SaleViewSet, basename='sale')
router.register('mpesa', MpesaViewSet, basename='mpesa')

urlpatterns = [
    path('auth/token/', CustomTokenView.as_view(), name='token_obtain'),
    path('', include(router.urls)),
]