from django.urls import path

from .views import dispatch_trip_view

urlpatterns = [
    path("<str:trip_id>/", dispatch_trip_view, name="dispatch-trip"),
]
