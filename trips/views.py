from django_filters import rest_framework as filters
from rest_framework import mixins, viewsets

from .models import Trip
from .serializers import TripSerializer


class TripFilter(filters.FilterSet):
    region = filters.CharFilter(field_name="vehicle__region")

    class Meta:
        model = Trip
        fields = ["status", "region"]


class TripViewSet(mixins.CreateModelMixin, mixins.ListModelMixin,
                   mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    Hour 1: DRAFT creation + read only. complete/cancel actions land in Hour 4
    per the build plan (trips/dispatch business rules land in Hour 3).
    """
    queryset = Trip.objects.all()
    serializer_class = TripSerializer
    filterset_class = TripFilter
