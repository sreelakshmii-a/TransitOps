from django.contrib import admin

from .models import Expense, FuelLog

admin.site.register(FuelLog)
admin.site.register(Expense)
