from django_filters import rest_framework as filters
from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Trip
from .serializers import TripSerializer
from .services import cancel_trip, complete_trip


class TripFilter(filters.FilterSet):
    region = filters.CharFilter(field_name="vehicle__region")

    class Meta:
        model = Trip
        fields = ["status", "region"]


class TripViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                   mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Hour 1: DRAFT creation + read only. Hour 4: complete/cancel actions with
    conditional status release (see trips/services.py).
    """
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    filterset_class = TripFilter

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        result = complete_trip(pk)
        return Response(result)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        result = cancel_trip(pk)
        return Response(result)
