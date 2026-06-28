"""
Social Media Content Generation Service for GynSys.
Delegates to llm_router for provider selection, fallback, and caching.
"""
import json
import re
import logging

from app.services.llm_router import call_llm_json

logger = logging.getLogger(__name__)


def clean_content_for_ai(content: str) -> str:
    """
    Limpia el contenido de etiquetas HTML y remueve datos Base64 pesados
    para evitar confundir a la IA o exceder límites de tokens.
    """
    if not content:
        return ""

    # 1. Remover etiquetas <img> completas (incluyendo base64)
    content = re.sub(r"<img[^>]*>", " [imagen] ", content)

    # 2. Remover cualquier rastro de data:image/base64
    content = re.sub(r"data:image/[^;]*;base64,[^\"'\s]*", "", content)

    # 3. Remover otras etiquetas HTML pero mantener el texto
    content = re.sub(r"<[^>]+>", " ", content)

    # 4. Limpiar espacios extra
    content = re.sub(r"\s+", " ", content).strip()

    return content[:15000]  # Limitar a 15k caracteres para seguridad


def generate_social_content(
    post_title: str,
    post_content: str,
    generation_type: str = "reel",
    special_instructions: str = None,
    existing_content: dict = None,
) -> dict:
    """
    Genera contenido para redes sociales (Reel o Carrusel).
    Usa el router de LLM configurado en /admin/llm-providers.
    """
    clean_text = clean_content_for_ai(post_content)

    instructions_prompt = ""
    if special_instructions:
        instructions_prompt = f"""
        INSTRUCCIONES ADICIONALES CRÍTICAS DEL USUARIO:
        {special_instructions}
        Sigue estas instrucciones estrictamente por encima de las reglas estándar.
        """

    if existing_content:
        existing_slides_str = json.dumps(existing_content, ensure_ascii=False, indent=2)
        instructions_prompt += f"""

        DIAPOSITIVAS ACTUALES EXISTENTES (ÚSALAS COMO BASE):
        {existing_slides_str}

        INSTRUCCIONES DE MODIFICACIÓN CRÍTICAS:
        1. CONSERVA las diapositivas existentes idénticas o casi idénticas.
        2. Si se pide AGREGAR una nueva diapositiva, colócala antes de la última (CTA).
        3. LA ÚLTIMA DIAPOSITIVA (CTA) DEBE SEGUIR SIENDO LA ÚLTIMA.
        4. Conserva el formato del JSON original exactamente igual.
        """

    if generation_type in ["video", "reel"]:
        prompt = f"""
        Actúa como un ingeniero civil experto, especialista en marketing técnico y editor de video viral para Instagram Reels.
        Tu misión es TRANSFORMAR o EXPANDIR el contenido en una secuencia de video (Reel) altamente persuasiva y científicamente precisa.

        CONTENIDO ORIGINAL:
        Título: {post_title}
        Contenido: {clean_text}

        {instructions_prompt}

        REGLAS DE RIGOR MÉDICO (CRÍTICAS):
        1. Si el CONTENIDO ORIGINAL es muy breve, vago o sólo un título, DEBES actuar como ginecólogo e investigarlo usando tus conocimientos médicos (Medicina Basada en la Evidencia) para completar la información antes de armar el guion.
        2. Mantén alta precisión clínica y no inventes tratamientos no avalados.

        REGLAS DE ORO PARA EL GUION (REEL):
        1. LÍMITE DE PALABRAS ESTRICTO: Cada diapositiva DEBE tener entre 8 y 12 palabras.
        2. GANCHO (HOOK): La primera diapositiva debe ser un gancho irresistible.
        3. RESALTADO: Envuelve las 1 o 2 palabras más importantes entre asteriscos (**palabra**).
        4. ESTRUCTURA: Genera exactamente entre 6 y 9 escenas.

        Responde EXCLUSIVAMENTE con un objeto JSON válido con esta estructura:
        {{
          "video_slides": [
            {{ "text": "Frase de 8 a 12 palabras exactamente" }}
          ],
          "music_suggestion": "Tipo de música específico",
          "duration_per_slide": 3,
          "total_duration": 25
        }}
        """
    else:
        prompt = f"""
        Actúa como un ingeniero civil experto, especialista en marketing técnico yInstagram experto en contenido médico y visualización de datos.
        Crea un carrusel de 5-10 diapositivas atractivo, profesional, fácil de leer y científicamente riguroso.

        ARTÍCULO:
        Título: {post_title}
        Contenido: {clean_text}

        {instructions_prompt}

        REGLAS DE RIGOR MÉDICO (CRÍTICAS):
        1. Si el ARTÍCULO es muy breve, vago o sólo un título, DEBES actuar como ginecólogo e investigarlo usando tus conocimientos médicos (Medicina Basada en la Evidencia) para completarlo antes de diseñar el carrusel.
        2. Mantén alta precisión clínica y no inventes tratamientos no avalados.

        REGLAS DE FORMATO CRÍTICAS PARA "content":
        1. LISTAS: Si incluyes una lista, CADA ITEM DEBE IR EN UNA LÍNEA NUEVA (usa \\n).
        2. VIÑETAS: Usa viñetas modernas como '•' para listas de puntos.
        3. LIMPIEZA: NUNCA amontones varios puntos en un párrafo.

        Responde EXCLUSIVAMENTE con un objeto JSON válido con esta estructura:
        {{
          "slides": [
            {{ "title": "título breve e impactante", "content": "cuerpo con formato limpio" }}
          ],
          "image_prompts": ["sugerencia de imagen o query para Unsplash"]
        }}
        """

    try:
        data = call_llm_json(prompt, use_case="social")
        # Normalizar slides si es necesario
        if isinstance(data, dict) and "slides" in data and isinstance(data["slides"], dict):
            data["slides"] = list(data["slides"].values())
        return data
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "quota" in error_str.lower():
            raise ValueError(
                "Has alcanzado los límites de uso de IA. "
                "El administrador puede configurar un proveedor alternativo en /admin/llm-providers."
            )
        logger.error(f"[social_service] Error al generar contenido: {error_str}", exc_info=True)
        raise


def pregenerate_social_content_async(post_id: int) -> None:
    """
    Background task to generate and save social media content (reel and carousel) for a blog post.
    """
    from app.db.base import SessionLocal
    from app.blog.models import BlogPost

    logger.info(f"[GynSys-Pregeneration] Starting background pre-generation for post {post_id}")

    db = SessionLocal()
    try:
        post = db.query(BlogPost).filter(BlogPost.id == post_id).first()
        if not post:
            logger.warning(f"[GynSys-Pregeneration] Post {post_id} not found.")
            return

        # 1. Pregenerate Reel
        try:
            logger.info(f"[GynSys-Pregeneration] Generating Reel for post {post_id}")
            reel_data = generate_social_content(
                post_title=post.title,
                post_content=post.content,
                generation_type="reel",
            )
            if isinstance(reel_data, dict):
                reel_data["type"] = "reel"
            post.pregenerated_reel = reel_data
            db.commit()
            logger.info(f"[GynSys-Pregeneration] Reel saved for post {post_id}")
        except Exception as e:
            logger.error(f"[GynSys-Pregeneration] Error pregenerating Reel for post {post_id}: {e}", exc_info=True)

        # 2. Pregenerate Carousel
        try:
            logger.info(f"[GynSys-Pregeneration] Generating Carousel for post {post_id}")
            carousel_data = generate_social_content(
                post_title=post.title,
                post_content=post.content,
                generation_type="carousel",
            )
            if isinstance(carousel_data, dict):
                carousel_data["type"] = "carousel"
            post.pregenerated_carousel = carousel_data
            db.commit()
            logger.info(f"[GynSys-Pregeneration] Carousel saved for post {post_id}")
        except Exception as e:
            logger.error(f"[GynSys-Pregeneration] Error pregenerating Carousel for post {post_id}: {e}", exc_info=True)

    except Exception as e:
        db.rollback()
        logger.error(f"[GynSys-Pregeneration] General error for post {post_id}: {e}", exc_info=True)
    finally:
        db.close()

