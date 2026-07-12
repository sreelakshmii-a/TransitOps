from rest_framework.decorators import api_view
from rest_framework.response import Response

from .services import dispatch_trip


@api_view(["POST"])
def dispatch_trip_view(request, trip_id):
    result = dispatch_trip(trip_id)
    return Response(result)
