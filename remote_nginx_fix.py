import os

def update_nginx(path):
    if not os.path.exists(path):
        print('File not found: ' + path)
        return
        
    with open(path, 'r') as f:
        content = f.read()
    if 'client_max_body_size 50M;' not in content:
        content = content.replace('server_name ', 'client_max_body_size 50M;
    server_name ')
        with open(path, 'w') as f:
            f.write(content)
        print('Updated ' + path)
    else:
        print('Already updated ' + path)

update_nginx('/etc/nginx/sites-available/api.arko360.net')
update_nginx('/etc/nginx/sites-available/admin.arko360.net')
update_nginx('/etc/nginx/sites-available/arko360.net')
update_nginx('/etc/nginx/sites-available/superadmin.arko360.net')
