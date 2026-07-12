from rest_framework.routers import DefaultRouter

from .views import MaintenanceLogViewSet

router = DefaultRouter()
router.register(r"", MaintenanceLogViewSet, basename="maintenancelog")

urlpatterns = router.urls
