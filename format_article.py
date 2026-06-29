import json
from bs4 import BeautifulSoup

html_path = r"C:\Users\pablo\Downloads\articulo_sismicidad_venezuela.html"
with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

soup = BeautifulSoup(html_content, "html.parser")

title_tag = soup.find("h1")
title = title_tag.text if title_tag else "Venezuela Sismica"

if title_tag:
    title_tag.decompose()

# Remove style tag
style_tag = soup.find("style")
if style_tag:
    style_tag.decompose()

# The image is missing on the client side so remove it
img_tag = soup.find("img")
if img_tag:
    caption = img_tag.find_next_sibling("p", class_="caption")
    if caption:
        caption.decompose()
    img_tag.decompose()

# Extract inner HTML of body
body_content = "".join(str(child) for child in soup.body.children)

# The payload
payload = {
    "title": title.strip(),
    "content": body_content.strip(),
    "summary": "Hay un desconocimiento generalizado en Venezuela sobre su propia naturaleza sísmica. Este artículo explica el origen tectónico, las fallas principales, el mito de la falta de riesgo sísmico y un repaso por los terremotos históricos.",
    "cover_image": "",
    "is_published": True,
    "is_in_menu": False,
    "menu_weight": 0,
    "menu_icon": "",
    "seo_config": {
        "meta_title": title.strip(),
        "meta_description": "Explicación sobre la vulnerabilidad sísmica de Venezuela.",
        "focus_keyword": "sismicidad venezuela",
        "canonical_url": "",
        "schema_type": "Article",
        "robots_index": True,
        "robots_follow": True,
        "social_title": "",
        "social_description": "",
        "social_image": ""
    }
}

json_payload = json.dumps(payload, ensure_ascii=False)

print(json_payload)
