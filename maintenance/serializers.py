from rest_framework import serializers

from .models import MaintenanceLog


class MaintenanceLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceLog
        fields = [
            "id",
            "vehicle",
            "reason",
            "cost",
            "status",
            "started_at",
            "closed_at",
        ]
        read_only_fields = ["status", "started_at", "closed_at"]
