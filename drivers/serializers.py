from rest_framework import serializers

from .models import Driver


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Driver
        fields = [
            "id",
            "name",
            "license",
            "license_category",
            "license_expiry",
            "contact",
            "safety_score",
            "status",
            "created_at",
        ]
        read_only_fields = ["status", "created_at"]
