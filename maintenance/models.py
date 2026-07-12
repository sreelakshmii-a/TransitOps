from django.db import models


class MaintenanceStatus(models.TextChoices):
    OPEN = "OPEN"
    CLOSED = "CLOSED"


class MaintenanceLog(models.Model):
    vehicle = models.ForeignKey("vehicles.Vehicle", on_delete=models.CASCADE)
    reason = models.CharField(max_length=256)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(
        max_length=16, choices=MaintenanceStatus.choices, default=MaintenanceStatus.OPEN
    )
    started_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.vehicle_id} — {self.reason}"
