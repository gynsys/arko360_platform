import re

try:
    with open('/opt/appgynsys/nginx/conf.d/arko360.conf', 'r') as f:
        content = f.read()

    new_locations = '''
    location /app/ {
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
'''

    target_block_start = content.find('server_name arko360.net www.arko360.net;')
    target_block_start = content.find('server_name arko360.net www.arko360.net;', target_block_start + 1)
    insert_pos = content.find('location /uploads/ {', target_block_start)

    if insert_pos != -1:
        new_content = content[:insert_pos] + new_locations + '\n    ' + content[insert_pos:]
        with open('/opt/appgynsys/nginx/conf.d/arko360.conf', 'w') as f:
            f.write(new_content)
        print('Updated successfully')
    else:
        print('Failed to find insertion point')
except Exception as e:
    print(f"Error: {e}")
