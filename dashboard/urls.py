from django.urls import path

from . import views

urlpatterns = [
    path("dashboard/kpis/", views.kpis),
    path("reports/operational-costs/", views.operational_costs),
    path("reports/csv/", views.reports_csv),
]
