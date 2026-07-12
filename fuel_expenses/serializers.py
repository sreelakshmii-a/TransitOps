from rest_framework import serializers

from .models import Expense, FuelLog


class FuelLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FuelLog
        fields = ["id", "vehicle", "liters", "cost", "odometer_at_fill", "logged_at"]
        read_only_fields = ["logged_at"]


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ["id", "vehicle", "trip", "category", "amount", "date"]
        read_only_fields = ["date"]
