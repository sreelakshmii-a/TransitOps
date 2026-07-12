
# TransitOps — Smart Transport Operations Platform

> High-quality Markdown conversion.

# Business Context

Digitize transport operations including fleet, drivers, dispatch, maintenance, expenses and analytics.

# Target Users

| Role | Responsibility |
|------|----------------|
| Fleet Manager | Fleet lifecycle |
| Driver | Trips |
| Safety Officer | Compliance |
| Financial Analyst | Costs & profitability |

# Functional Requirements

## Authentication
- Secure login
- RBAC

## Dashboard

KPIs
- Active Vehicles
- Available Vehicles
- Vehicles in Maintenance
- Active Trips
- Pending Trips
- Drivers On Duty
- Fleet Utilization

Filters
- Vehicle type
- Status
- Region

## Vehicle Registry

Fields

- Registration Number (unique)
- Vehicle Model
- Type
- Capacity
- Odometer
- Acquisition Cost
- Status

Status:
- Available
- On Trip
- In Shop
- Retired

## Driver Management

Fields:
- Name
- License
- Expiry
- Contact
- Safety Score
- Status

## Trip Management

Workflow

Draft → Dispatched → Completed / Cancelled

## Maintenance

Automatic:
- Vehicle enters In Shop
- Removed from dispatch

## Fuel & Expenses

- Fuel logs
- Maintenance cost
- Tolls
- Operational cost

## Reports

- Fuel efficiency
- Fleet utilization
- Operational cost
- Vehicle ROI
- CSV export

# Mandatory Business Rules

- Unique registration
- Retired/In Shop cannot dispatch
- Expired license cannot dispatch
- Driver/Vehicle cannot have concurrent trips
- Cargo <= capacity
- Dispatch → Vehicle & Driver = On Trip
- Complete → Available
- Cancel → Available
- Maintenance → In Shop
- Close maintenance → Available

# Example Workflow

```text
Register Vehicle
      │
Register Driver
      │
Create Trip
      │
Validation
      │
Dispatch
      │
Complete Trip
      │
Maintenance
      │
Analytics Update
```

# Database Entities

- Users
- Roles
- Vehicles
- Drivers
- Trips
- Maintenance Logs
- Fuel Logs
- Expenses

# Mandatory Deliverables

- Responsive UI
- RBAC
- CRUD
- Trip management
- Automatic status transitions
- Maintenance
- Fuel tracking
- KPI dashboard

# Bonus

- Charts
- PDF export
- Email reminders
- Vehicle documents
- Search
- Dark mode

## Mockup

https://link.excalidraw.com/l/65VNwvy7c4X/1FHGDNgD2td
