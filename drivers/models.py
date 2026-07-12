from django.db import models


class DriverStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE"
    ON_TRIP = "ON_TRIP"
    OFF_DUTY = "OFF_DUTY"
    SUSPENDED = "SUSPENDED"  # PRD 3.4/4: suspended drivers must be blocked from dispatch


class Driver(models.Model):
    name = models.CharField(max_length=128, blank=True)
    license = models.CharField(max_length=64, blank=True)
    license_category = models.CharField(max_length=32, blank=True)  # PRD 3.4
    license_expiry = models.DateField(null=True, blank=True)
    contact = models.CharField(max_length=64, blank=True)
    safety_score = models.IntegerField(default=100)
    status = models.CharField(max_length=16, choices=DriverStatus.choices, default=DriverStatus.AVAILABLE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
