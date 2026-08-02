"""Shared Arko site configuration defaults and template presets.

`DEFAULT_SITE_CONFIG` is the canonical configuration used by the main Arko
landing site and as the "construccion" preset for cloned landing sites.
"""
from copy import deepcopy
from typing import Any, Dict

DEFAULT_SITE_CONFIG = {
    "siteName": "Ingeniería Arko 360",
    "logoUrl": "/images/logo_aeko360.png",
    "primaryColor": "#0a4275",
    "secondaryColor": "#27ae60",
    "branding": {
        "primaryColor": "#0a4275",
        "secondaryColor": "#27ae60"
    },
    "global": {
        "phone": "+58 412 000 0000",
        "email": "proyectos@arko360.com",
        "location": "Caracas, Venezuela",
        "whatsapp": "+58XXXXXXXXXX",
        "logo": "/images/logo_aeko360.png",
        "social": {
            "instagram": "#",
            "facebook": "#",
            "linkedin": "#",
            "twitter": "#"
        }
    },
    "sections": {
        "showAbout": True,
        "showServices": True,
        "showPortfolio": True,
        "showProcess": True,
        "showTestimonials": True,
        "showBiblio": True,
        "showTools": True
    },
    "tools": {
        "showCieloRaso": True,
        "showMuroGravedad": True,
        "showDisenoMezclas": True,
        "showDrywall": True,
        "showElectrica": True,
        "showEscaleras": True,
        "showLosas": True,
        "showArko3D": True,
        "showCieloRasoVisible": True
    },
    "hero": {
        "badge": "Ingeniería & Arquitectura",
        "titleLine1": "Construimos el",
        "titleAccent": "Futuro",
        "titleLine2": "con precisión.",
        "subtitle": "Expertos en proyectos residenciales, comerciales y cálculos estructurales. Llevamos tu visión de los planos a la realidad con estándares internacionales de calidad.",
        "ctaPrimary": "Cotizar Proyecto",
        "ctaSecondary": "Ver Portafolio"
    },
    "aboutUs": {
        "tag": "Sobre Nosotros",
        "title": "Construyendo sueños desde hace 15 años",
        "p1": "Ingeniería Arko 360 nació con una visión clara: ofrecer soluciones constructivas de la más alta calidad, combinando innovación tecnológica con la experiencia artesanal de nuestros técnicos.",
        "p2": "Hemos ejecutado más de 200 proyectos en todo el país, desde viviendas unifamiliares hasta complejos comerciales, siempre manteniendo nuestro compromiso con la excelencia y la satisfacción del cliente.",
        "imageUrl": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80"
    },
    "services": {
        "tag": "Nuestros Servicios",
        "title": "Soluciones integrales para cada desafío",
        "subtitle": "Cubrimos todo el ciclo de vida del proyecto, desde la conceptualización hasta la entrega llave en mano.",
        "list": [
            {
                "id": "srv-1",
                "icon": "Building2",
                "title": "Construcción Residencial",
                "desc": "Desarrollo de viviendas unifamiliares, conjuntos cerrados y torres de apartamentos con los más altos estándares."
            },
            {
                "id": "srv-2",
                "icon": "Hammer",
                "title": "Remodelaciones",
                "desc": "Renovación integral de espacios comerciales y residenciales. Modernización de oficinas y locales."
            },
            {
                "id": "srv-3",
                "icon": "Ruler",
                "title": "Diseño Arquitectónico",
                "desc": "Creación de planos, renders 3D y diseño de interiores adaptados a las necesidades y presupuesto del cliente."
            },
            {
                "id": "srv-4",
                "icon": "HardHat",
                "title": "Gestión de Proyectos",
                "desc": "Supervisión de obra, control de calidad, manejo de presupuesto y coordinación de contratistas."
            },
            {
                "id": "srv-5",
                "icon": "Wrench",
                "title": "Mantenimiento Industrial",
                "desc": "Servicios preventivos y correctivos para instalaciones industriales, fábricas y galpones."
            },
            {
                "id": "srv-6",
                "icon": "PenTool",
                "title": "Cálculo Estructural",
                "desc": "Análisis sísmico, diseño de fundaciones y estructuras de concreto armado y metálicas."
            }
        ]
    },
    "portfolio": {
        "tag": "Portafolio",
        "title": "Proyectos que hablan por sí solos",
        "subtitle": "Cada obra es un compromiso con la excelencia. Descubre algunos de nuestros proyectos más destacados a lo largo de Venezuela."
    },
    "process": {
        "tag": "Metodología de Trabajo",
        "title": "Nuestro proceso paso a paso",
        "subtitle": "Hemos perfeccionado nuestro método de trabajo para garantizar resultados predecibles, entregas a tiempo y sin sorpresas en el presupuesto.",
        "steps": [
            {
                "id": "prc-1",
                "icon": "Settings",
                "title": "1. Consulta Inicial",
                "desc": "Nos reunimos para entender tu visión, necesidades y presupuesto. Evaluamos el espacio y discutimos las posibilidades."
            },
            {
                "id": "prc-2",
                "icon": "PencilRuler",
                "title": "2. Diseño y Planificación",
                "desc": "Nuestros arquitectos crean propuestas de diseño, planos y renders 3D para que visualices el resultado final."
            },
            {
                "id": "prc-3",
                "icon": "FileSignature",
                "title": "3. Presupuesto y Contrato",
                "desc": "Presentamos un presupuesto detallado y transparente. Una vez aprobado, firmamos el contrato y establecemos el cronograma."
            },
            {
                "id": "prc-4",
                "icon": "HardHat",
                "title": "4. Ejecución de Obra",
                "desc": "Nuestro equipo comienza la construcción o remodelación, con supervisión constante y reportes de avance regulares."
            },
            {
                "id": "prc-5",
                "icon": "Key",
                "title": "5. Entrega Final",
                "desc": "Realizamos una inspección detallada contigo, entregamos garantías y te damos las llaves de tu nuevo espacio."
            }
        ]
    },
    "testimonials": {
        "tag": "Testimonios",
        "title": "Lo que dicen nuestros clientes",
        "subtitle": "La satisfacción de nuestros clientes es el mejor indicador de nuestro trabajo.",
        "list": [
            {
                "id": "tst-1",
                "text": "Arko 360 superó todas mis expectativas. Construyeron mi casa en el tiempo acordado y con una calidad impresionante. El equipo es profesional, ordenado y siempre dispuesto a resolver cualquier inquietud.",
                "name": "Carlos Mendoza",
                "role": "Propietario — Residencia Las Acacias",
                "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
                "stars": 5
            },
            {
                "id": "tst-2",
                "text": "La remodelación de nuestras oficinas fue un proceso sorprendentemente fluido. Cumplieron con el presupuesto, el tiempo y lo más importante: el resultado es extraordinario. Nuestros empleados y clientes quedaron encantados.",
                "name": "María González",
                "role": "Directora General — Grupo Comercial MG",
                "avatar": "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200&q=80",
                "stars": 5
            },
            {
                "id": "tst-3",
                "text": "Llevamos 3 proyectos con Arko 360 y no pensamos cambiar de empresa constructora. Su transparencia, comunicación constante y nivel de acabados los hacen únicos en el mercado venezolano.",
                "name": "Roberto Herrera",
                "role": "Desarrollador Inmobiliario",
                "avatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
                "stars": 5
            }
        ]
    }
}

# Presets available when cloning a landing site.
TEMPLATE_CONFIGS: Dict[str, Dict[str, Any]] = {
    "construccion": DEFAULT_SITE_CONFIG,
    "medico": {
        "siteName": "Clínica Médica",
        "logoUrl": "/images/logo_medico.png",
        "primaryColor": "#0ea5e9",
        "secondaryColor": "#10b981",
        "branding": {
            "primaryColor": "#0ea5e9",
            "secondaryColor": "#10b981"
        },
        "global": {
            "phone": "+58 412 000 0000",
            "email": "contacto@clinica.com",
            "location": "Caracas, Venezuela",
            "whatsapp": "+58XXXXXXXXXX",
            "logo": "/images/logo_medico.png",
            "social": {
                "instagram": "#",
                "facebook": "#",
                "linkedin": "#",
                "twitter": "#"
            }
        },
        "sections": {
            "showAbout": True,
            "showServices": True,
            "showPortfolio": False,
            "showProcess": True,
            "showTestimonials": True,
            "showBiblio": False,
            "showTools": False
        },
        "tools": {
            "showCieloRaso": False,
            "showMuroGravedad": False,
            "showDisenoMezclas": False,
            "showDrywall": False,
            "showElectrica": False,
            "showEscaleras": False,
            "showLosas": False,
            "showArko3D": False,
            "showCieloRasoVisible": False
        },
        "hero": {
            "badge": "Salud Integral",
            "titleLine1": "Cuidamos tu",
            "titleAccent": "Salud",
            "titleLine2": "con dedicación.",
            "subtitle": "Equipo médico especializado comprometido con tu bienestar. Atención personalizada con tecnología de vanguardia.",
            "ctaPrimary": "Agendar Cita",
            "ctaSecondary": "Nuestros Servicios"
        },
        "aboutUs": {
            "tag": "Sobre Nosotros",
            "title": "Más de 20 años de experiencia médica",
            "p1": "Nuestra clínica se ha consolidado como un referente en atención médica integral, combinando experiencia profesional con tecnología de última generación.",
            "p2": "Contamos con un equipo multidisciplinario de especialistas dedicados a brindar la mejor atención a cada paciente.",
            "imageUrl": "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=800&q=80"
        },
        "services": {
            "tag": "Nuestros Servicios",
            "title": "Atención médica especializada",
            "subtitle": "Ofrecemos una amplia gama de servicios médicos para cubrir todas tus necesidades de salud.",
            "list": [
                {
                    "id": "srv-1",
                    "icon": "Stethoscope",
                    "title": "Medicina General",
                    "desc": "Consultas médicas generales, chequeos preventivos y seguimiento de enfermedades crónicas."
                },
                {
                    "id": "srv-2",
                    "icon": "Heart",
                    "title": "Cardiología",
                    "desc": "Evaluación cardiovascular, electrocardiogramas y monitoreo de presión arterial."
                },
                {
                    "id": "srv-3",
                    "icon": "Baby",
                    "title": "Pediatría",
                    "desc": "Atención especializada para niños desde recién nacidos hasta adolescentes."
                },
                {
                    "id": "srv-4",
                    "icon": "Activity",
                    "title": "Ginecología",
                    "desc": "Consultas ginecológicas, control prenatal y atención de la mujer."
                },
                {
                    "id": "srv-5",
                    "icon": "Syringe",
                    "title": "Vacunación",
                    "desc": "Programa completo de vacunación para niños y adultos."
                },
                {
                    "id": "srv-6",
                    "icon": "Microscope",
                    "title": "Laboratorio Clínico",
                    "desc": "Análisis clínicos completos con resultados rápidos y confiables."
                }
            ]
        },
        "portfolio": {
            "tag": "Portafolio",
            "title": "Nuestras Instalaciones",
            "subtitle": "Conoce nuestras instalaciones modernas equipadas con tecnología de vanguardia."
        },
        "process": {
            "tag": "Proceso de Atención",
            "title": "Tu salud en buenas manos",
            "subtitle": "Proceso de atención médica optimizado para brindarte el mejor servicio.",
            "steps": [
                {
                    "id": "prc-1",
                    "icon": "Calendar",
                    "title": "1. Agendar Cita",
                    "desc": "Reserva tu cita a través de nuestro sitio web, WhatsApp o teléfono."
                },
                {
                    "id": "prc-2",
                    "icon": "FileText",
                    "title": "2. Evaluación",
                    "desc": "Nuestros médicos realizan una evaluación completa de tu estado de salud."
                },
                {
                    "id": "prc-3",
                    "icon": "Clipboard",
                    "title": "3. Diagnóstico",
                    "desc": "Te proporcionamos un diagnóstico preciso y un plan de tratamiento personalizado."
                },
                {
                    "id": "prc-4",
                    "icon": "Pill",
                    "title": "4. Tratamiento",
                    "desc": "Implementamos el tratamiento con seguimiento constante y ajustes según sea necesario."
                },
                {
                    "id": "prc-5",
                    "icon": "CheckCircle",
                    "title": "5. Seguimiento",
                    "desc": "Monitoreamos tu evolución para garantizar los mejores resultados."
                }
            ]
        },
        "testimonials": {
            "tag": "Testimonios",
            "title": "Pacientes satisfechos",
            "subtitle": "La confianza de nuestros pacientes es nuestro mayor logro.",
            "list": [
                {
                    "id": "tst-1",
                    "text": "La atención médica recibida fue excepcional. El doctor fue muy atento y explicativo. Me sentí en buenas manos durante todo el proceso.",
                    "name": "Ana Martínez",
                    "role": "Paciente",
                    "avatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80",
                    "stars": 5
                },
                {
                    "id": "tst-2",
                    "text": "Excelente servicio desde la recepción hasta la consulta médica. Las instalaciones son modernas y limpias. Recomiendo esta clínica.",
                    "name": "Pedro Rodríguez",
                    "role": "Paciente",
                    "avatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80",
                    "stars": 5
                },
                {
                    "id": "tst-3",
                    "text": "Llevo años viniendo a esta clínica y siempre recibo la mejor atención. El personal es amable y profesional.",
                    "name": "Carmen López",
                    "role": "Paciente",
                    "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
                    "stars": 5
                }
            ]
        }
    }
}

DEFAULT_TEMPLATE_NAME = "construccion"


def get_template_config(template_name: str) -> Dict[str, Any]:
    """Return a deep copy of the template preset, falling back to the default one."""
    template = TEMPLATE_CONFIGS.get(template_name) or TEMPLATE_CONFIGS[DEFAULT_TEMPLATE_NAME]
    return deepcopy(template)


def deep_merge(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively merge `override` into `base`, returning a new dict."""
    result = base.copy()
    for key, value in override.items():
        if isinstance(result.get(key), dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result
