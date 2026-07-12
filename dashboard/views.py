import csv

from django.http import HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response

from drivers.models import Driver, DriverStatus
from fuel_expenses.models import Expense, FuelLog
from maintenance.models import MaintenanceLog
from trips.models import Trip, TripStatus
from vehicles.models import Vehicle, VehicleStatus


@api_view(["GET"])
def kpis(request):
    # type/status/region narrow the Vehicle queryset used for the vehicle-derived
    # KPIs (Active/Available/Maintenance Vehicles, Fleet Utilization). Trip- and
    # driver-derived KPIs stay global, since those filters are vehicle attributes
    # -- matches the contract Dev C documented in frontend/src/api/dashboard.js.
    vehicles = Vehicle.objects.all()
    for param, field in (("type", "type"), ("status", "status"), ("region", "region")):
        value = request.query_params.get(param)
        if value:
            vehicles = vehicles.filter(**{field: value})

    active_vehicles = vehicles.filter(status=VehicleStatus.ON_TRIP).count()
    available_vehicles = vehicles.filter(status=VehicleStatus.AVAILABLE).count()
    vehicles_in_maintenance = vehicles.filter(status=VehicleStatus.IN_SHOP).count()
    non_retired = vehicles.exclude(status=VehicleStatus.RETIRED).count()
    fleet_utilization = round((active_vehicles / non_retired) * 100, 2) if non_retired else 0

    return Response({
        "active_vehicles": active_vehicles,
        "available_vehicles": available_vehicles,
        "vehicles_in_maintenance": vehicles_in_maintenance,
        "active_trips": Trip.objects.filter(status=TripStatus.DISPATCHED).count(),
        "pending_trips": Trip.objects.filter(status=TripStatus.DRAFT).count(),
        "drivers_on_duty": Driver.objects.filter(status=DriverStatus.ON_TRIP).count(),
        "fleet_utilization": fleet_utilization,
    })


@api_view(["GET"])
def operational_costs(request):
    # PRD 3.7: "Automatically compute total operational cost (Fuel + Maintenance)
    # per vehicle." Matches the shape Dev C's getOperationalCosts() expects.
    results = []
    for vehicle in Vehicle.objects.all():
        fuel_cost = sum(
            FuelLog.objects.filter(vehicle=vehicle).values_list("cost", flat=True)
        )
        maintenance_cost = sum(
            MaintenanceLog.objects.filter(vehicle=vehicle).values_list("cost", flat=True)
        )
        results.append({
            "vehicle_id": vehicle.id,
            "registration_number": vehicle.registration_number,
            "fuel_cost": float(fuel_cost),
            "maintenance_cost": float(maintenance_cost),
            "operational_cost": float(fuel_cost + maintenance_cost),
        })
    return Response(results)


@api_view(["GET"])
def reports_csv(request):
    report_type = request.query_params.get("type")
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{report_type}.csv"'
    writer = csv.writer(response)

    if report_type == "trips":
        writer.writerow(["vehicle", "driver", "origin", "destination", "cargo_weight",
                          "status", "dispatched_at", "completed_at", "created_at"])
        for t in Trip.objects.select_related("vehicle", "driver"):
            writer.writerow([t.vehicle.registration_number, t.driver.name, t.origin,
                              t.destination, t.cargo_weight, t.status,
                              t.dispatched_at, t.completed_at, t.created_at])
    elif report_type == "fuel":
        writer.writerow(["vehicle", "liters", "cost", "odometer_at_fill", "logged_at"])
        for f in FuelLog.objects.select_related("vehicle"):
            writer.writerow([f.vehicle.registration_number, f.liters, f.cost,
                              f.odometer_at_fill, f.logged_at])
    elif report_type == "expenses":
        writer.writerow(["category", "amount", "vehicle", "trip", "date"])
        for e in Expense.objects.all():
            writer.writerow([e.category, e.amount,
                              e.vehicle.registration_number if e.vehicle else "",
                              e.trip_id or "", e.date])
    else:
        return HttpResponse(status=400)

    return response
