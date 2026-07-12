from django.db import models


class VehicleStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE"
    ON_TRIP = "ON_TRIP"
    IN_SHOP = "IN_SHOP"
    RETIRED = "RETIRED"


class Vehicle(models.Model):
    registration_number = models.CharField(max_length=32, unique=True)
    model = models.CharField(max_length=64, blank=True)
    type = models.CharField(max_length=32, blank=True)
    capacity = models.IntegerField(default=0)
    odometer = models.IntegerField(default=0)
    acquisition_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=16, choices=VehicleStatus.choices, default=VehicleStatus.AVAILABLE)
    region = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.registration_number
