from rest_framework import serializers

from .models import Trip


class TripSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trip
        fields = [
            "id", "vehicle", "driver", "cargo_weight", "origin", "destination",
            "status", "dispatched_at", "completed_at", "created_at",
        ]
        read_only_fields = ["status", "dispatched_at", "completed_at", "created_at"]

    def validate(self, attrs):
        vehicle = attrs.get("vehicle")
        cargo_weight = attrs.get("cargo_weight")
        if vehicle is not None and cargo_weight is not None and cargo_weight > vehicle.capacity:
            raise serializers.ValidationError(
                {"cargo_weight": "cargo_weight exceeds vehicle capacity"}
            )
        return attrs
