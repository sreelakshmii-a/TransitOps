from django.db import models


class FuelLog(models.Model):
    vehicle = models.ForeignKey("vehicles.Vehicle", on_delete=models.CASCADE)
    liters = models.DecimalField(max_digits=8, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    odometer_at_fill = models.IntegerField()
    logged_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.vehicle_id} — {self.liters}L"


class ExpenseCategory(models.TextChoices):
    FUEL = "FUEL"
    MAINTENANCE = "MAINTENANCE"
    TOLL = "TOLL"
    OPERATIONAL = "OPERATIONAL"


class Expense(models.Model):
    vehicle = models.ForeignKey(
        "vehicles.Vehicle", null=True, blank=True, on_delete=models.SET_NULL
    )
    trip = models.ForeignKey(
        "trips.Trip", null=True, blank=True, on_delete=models.SET_NULL
    )
    category = models.CharField(max_length=16, choices=ExpenseCategory.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category} — {self.amount}"
