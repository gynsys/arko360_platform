import re

with open('/etc/nginx/conf.d/arko360.conf', 'r') as f:
    content = f.read()

# We need to find the SSL server block for arko360.net and add the location /app/ and /admin-assets/ blocks to it.
# The block starts with "server_name arko360.net www.arko360.net;" inside a server block that has "listen 443 ssl;"

target_block = """    location /api/ {"""

replacement_block = """    location /app/ {
        proxy_pass http://172.18.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }

    location /admin-assets/ {
        proxy_pass http://172.18.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_connect_timeout 10s;
    }

    location /api/ {"""

if 'location /app/' not in content:
    content = content.replace(target_block, replacement_block)
    with open('/etc/nginx/conf.d/arko360.conf', 'w') as f:
        f.write(content)
    print("Added app and admin-assets to nginx config.")
else:
    print("Already exists.")
