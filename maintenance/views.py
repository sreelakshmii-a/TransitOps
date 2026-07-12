from django.db import transaction
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from users.models import Role
from users.permissions import HasRole
from vehicles.models import Vehicle, VehicleStatus

from .models import MaintenanceLog, MaintenanceStatus
from .serializers import MaintenanceLogSerializer


class MaintenanceLogViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceLog.objects.all().order_by("-started_at")
    serializer_class = MaintenanceLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vehicle", "status"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasRole(Role.FLEET_MANAGER, Role.SAFETY_OFFICER)]
        return [IsAuthenticated(), HasRole(Role.FLEET_MANAGER)]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vehicle_id = serializer.validated_data["vehicle"].id

        with transaction.atomic():
            vehicle = Vehicle.objects.select_for_update().get(id=vehicle_id)
            if vehicle.status == VehicleStatus.ON_TRIP:
                return Response(
                    {"reason": "vehicle_on_trip", "code": "cannot_open_maintenance_mid_trip"},
                    status=status.HTTP_409_CONFLICT,
                )
            serializer.save()
            vehicle.status = VehicleStatus.IN_SHOP
            vehicle.save(update_fields=["status"])

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        log = self.get_object()
        if log.status == MaintenanceStatus.CLOSED:
            return Response(
                {"reason": "already_closed", "code": "maintenance_already_closed"},
                status=status.HTTP_409_CONFLICT,
            )
        log.status = MaintenanceStatus.CLOSED
        log.closed_at = timezone.now()
        log.save(update_fields=["status", "closed_at"])

        # Conditional update: only restores AVAILABLE if the vehicle is still
        # IN_SHOP. If it was retired (or otherwise moved) while this log was
        # open, closing maintenance must not silently overwrite that — matches
        # PRD 4: "Closing maintenance restores the vehicle to Available (unless
        # retired)".
        Vehicle.objects.filter(id=log.vehicle_id, status=VehicleStatus.IN_SHOP).update(
            status=VehicleStatus.AVAILABLE
        )
        return Response(MaintenanceLogSerializer(log).data)
