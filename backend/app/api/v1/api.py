"""
Main API router that aggregates all v1 endpoints.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import auth, profiles, users, appointments, uploads, testimonials, gallery, faq, admin, consultations, locations, contact, services, preconsultation, cycle_users, templates, patients, recommendations, online_consultation, payment, dashboard, tests, notifications, push_test, compliance, onboarding, campaigns, logo_proxy, scheduled_appointments, staff
from app.blog import router as blog_router
from app.cycle_predictor import router as cycle_router

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
api_router.include_router(profiles.router, prefix="/profiles", tags=["profiles"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["appointments"])
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(uploads.router, prefix="/uploads", tags=["uploads"])
api_router.include_router(testimonials.router, prefix="/testimonials", tags=["testimonials"])
api_router.include_router(gallery.router, prefix="/gallery", tags=["gallery"])
api_router.include_router(faq.router, prefix="/faq", tags=["faq"])
api_router.include_router(locations.router, prefix="/locations", tags=["locations"])
api_router.include_router(contact.router, prefix="/contact", tags=["contact"])
api_router.include_router(services.router, prefix="/services", tags=["services"])
api_router.include_router(recommendations.router, prefix="/recommendations", tags=["recommendations"])
api_router.include_router(blog_router.router, prefix="/blog", tags=["blog"])
api_router.include_router(cycle_users.router, prefix="/cycle-users", tags=["cycle-users"])
api_router.include_router(cycle_router.router, prefix="", tags=["cycle-predictor"]) 
api_router.include_router(consultations.router, prefix="/consultations", tags=["consultations"])
api_router.include_router(preconsultation.router, prefix="/preconsultation", tags=["preconsultation"])
api_router.include_router(online_consultation.router, prefix="/online-consultation", tags=["online-consultation"])
api_router.include_router(payment.router, prefix="/payment", tags=["payment"])
api_router.include_router(admin.router, prefix="", tags=["admin"])
api_router.include_router(templates.router) 
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(push_test.router, prefix="/push-test", tags=["push-testing"])
api_router.include_router(compliance.router, prefix="/compliance", tags=["compliance"])
api_router.include_router(onboarding.router, prefix="/onboarding", tags=["onboarding"])
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
api_router.include_router(logo_proxy.router, prefix="/assets", tags=["logo-proxy"])
api_router.include_router(scheduled_appointments.router, prefix="/scheduled-appointments", tags=["scheduled-appointments"])
api_router.include_router(staff.router, prefix="/staff", tags=["staff"])

# Arko 360 Endpoints
from app.api.v1.endpoints import arko
api_router.include_router(arko.router, prefix="/arko", tags=["arko360"])
