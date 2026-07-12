from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ExpenseViewSet, FuelLogViewSet

router = DefaultRouter()
router.register(r"fuel-logs", FuelLogViewSet, basename="fuellog")
router.register(r"expenses", ExpenseViewSet, basename="expense")

urlpatterns = [
    path("", include(router.urls)),
]
