from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import Role
from users.permissions import HasRole

from .models import Vehicle, VehicleStatus
from .serializers import VehicleSerializer


class VehicleViewSet(viewsets.ModelViewSet):
    queryset = Vehicle.objects.all().order_by("-created_at")
    serializer_class = VehicleSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["type", "status", "region"]

    def get_permissions(self):
        # Vehicles are Fleet Manager's full-access domain, but Driver needs
        # read access too: confirmed live that the Trips page's create form
        # fetches GET /api/vehicles/ to populate its vehicle dropdown, and
        # PRD 3.2 has Driver "creates trips, assigns vehicles and drivers" --
        # without this, Driver-role users get a 403 and can't create a trip.
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasRole(Role.FLEET_MANAGER, Role.DRIVER)]
        return [IsAuthenticated(), HasRole(Role.FLEET_MANAGER)]

    def destroy(self, request, *args, **kwargs):
        vehicle = self.get_object()
        if vehicle.status == VehicleStatus.ON_TRIP:
            return Response(
                {"reason": "vehicle_on_trip", "code": "cannot_delete_vehicle_on_trip"},
                status=status.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["patch"])
    def retire(self, request, pk=None):
        vehicle = self.get_object()
        if vehicle.status == VehicleStatus.ON_TRIP:
            return Response(
                {"reason": "vehicle_on_trip", "code": "cannot_retire_vehicle_on_trip"},
                status=status.HTTP_409_CONFLICT,
            )
        vehicle.status = VehicleStatus.RETIRED
        vehicle.save(update_fields=["status"])
        return Response(VehicleSerializer(vehicle).data)
