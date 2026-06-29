import sys
from bs4 import BeautifulSoup
from sqlalchemy.orm import Session
from datetime import datetime

import os
os.chdir(r"C:\Users\pablo\Documents\arko360_platform\backend")
sys.path.append(r"C:\Users\pablo\Documents\arko360_platform\backend")

from app.db.base import SessionLocal
from app.blog.models import BlogPost, BlogPostSEO
import re

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'[\s-]+', '-', text)
    return text.strip('-')

html_path = r"C:\Users\pablo\Downloads\articulo_sismicidad_venezuela.html"
with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

soup = BeautifulSoup(html_content, "html.parser")

title_tag = soup.find("h1")
title = title_tag.text if title_tag else "Venezuela Sismica"

if title_tag:
    title_tag.decompose()

# Also remove the style tag
style_tag = soup.find("style")
if style_tag:
    style_tag.decompose()

# Remove the image to prevent broken links
img_tag = soup.find("img")
if img_tag:
    # Also remove the caption
    caption = img_tag.find_next_sibling("p", class_="caption")
    if caption:
        caption.decompose()
    img_tag.decompose()

body_content = "".join(str(child) for child in soup.body.children if str(child).strip())

db = SessionLocal()
try:
    slug = slugify(title)
    # Handle duplicate slug
    counter = 1
    original_slug = slug
    while db.query(BlogPost).filter(BlogPost.slug == slug).first():
        slug = f"{original_slug}-{counter}"
        counter += 1

    post = BlogPost(
        title=title,
        slug=slug,
        content=body_content,
        summary="Hay un desconocimiento generalizado en Venezuela sobre su propia naturaleza sismica. Este articulo explica el origen tectonico, las fallas principales, el mito de la falta de riesgo sismico y un repaso por los terremotos historicos.",
        is_published=True,
        published_at=datetime.utcnow(),
        is_in_menu=False,
        menu_weight=0,
        admin_id=1,
        is_service_content=False
    )
    
    db.add(post)
    db.flush()
    
    seo = BlogPostSEO(
        post_id=post.id,
        meta_title=title,
        meta_description=post.summary,
        focus_keyword="sismicidad venezuela",
        robots_index=True,
        robots_follow=True,
        schema_type="Article"
    )
    db.add(seo)
    db.commit()
    print(f"Success! Inserted post with id {post.id} and slug {slug}")
except Exception as e:
    db.rollback()
    print(f"Error: {e}")
finally:
    db.close()
