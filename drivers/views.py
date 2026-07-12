from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.response import Response

from .models import Driver, DriverStatus
from .serializers import DriverSerializer


class DriverViewSet(viewsets.ModelViewSet):
    queryset = Driver.objects.all().order_by("-created_at")
    serializer_class = DriverSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["status"]

    def destroy(self, request, *args, **kwargs):
        driver = self.get_object()
        if driver.status == DriverStatus.ON_TRIP:
            return Response(
                {"reason": "driver_on_trip", "code": "cannot_delete_driver_on_trip"},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)
