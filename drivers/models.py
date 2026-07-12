# PLACEHOLDER STUB — owned by Dev A. Created only so Trip (Dev B) can FK
# against a real table at contract lock. Dev A: flesh this out (remaining
# fields, license expiry validation helper) in Hour 2 and replace this
# notice.
from django.db import models


class DriverStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE"
    ON_TRIP = "ON_TRIP"
    OFF_DUTY = "OFF_DUTY"


class Driver(models.Model):
    name = models.CharField(max_length=128, blank=True)
    license = models.CharField(max_length=64, blank=True)
    license_expiry = models.DateField(null=True, blank=True)
    contact = models.CharField(max_length=64, blank=True)
    safety_score = models.IntegerField(default=100)
    status = models.CharField(max_length=16, choices=DriverStatus.choices, default=DriverStatus.AVAILABLE)
    created_at = models.DateTimeField(auto_now_add=True)
