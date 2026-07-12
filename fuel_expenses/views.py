from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from users.models import Role
from users.permissions import HasRole

from .models import Expense, FuelLog
from .serializers import ExpenseSerializer, FuelLogSerializer


class FinancialReadOrFleetWrite:
    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [IsAuthenticated(), HasRole(Role.FLEET_MANAGER, Role.FINANCIAL_ANALYST)]
        return [IsAuthenticated(), HasRole(Role.FLEET_MANAGER)]


class FuelLogViewSet(FinancialReadOrFleetWrite, viewsets.ModelViewSet):
    queryset = FuelLog.objects.all().order_by("-logged_at")
    serializer_class = FuelLogSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["vehicle"]


class ExpenseViewSet(FinancialReadOrFleetWrite, viewsets.ModelViewSet):
    queryset = Expense.objects.all().order_by("-date")
    serializer_class = ExpenseSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["category", "vehicle"]
