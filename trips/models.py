from django.db import models


class TripStatus(models.TextChoices):
    DRAFT = "DRAFT"
    DISPATCHED = "DISPATCHED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class Trip(models.Model):
    vehicle = models.ForeignKey("vehicles.Vehicle", on_delete=models.PROTECT)
    driver = models.ForeignKey("drivers.Driver", on_delete=models.PROTECT)
    cargo_weight = models.IntegerField()
    origin = models.CharField(max_length=128)
    destination = models.CharField(max_length=128)
    status = models.CharField(max_length=16, choices=TripStatus.choices, default=TripStatus.DRAFT)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
