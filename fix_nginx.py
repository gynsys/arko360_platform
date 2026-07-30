import re

with open('/etc/nginx/conf.d/arko360.conf', 'r') as f:
    content = f.read()

# Fix the broken variables
content = content.replace('Host \\System.Management.Automation.Internal.Host.InternalHost;', 'Host $host;')
content = content.replace('X-Real-IP \\;', 'X-Real-IP $remote_addr;')
content = content.replace('X-Forwarded-For \\;', 'X-Forwarded-For $proxy_add_x_forwarded_for;')
content = content.replace('X-Forwarded-Proto \\;', 'X-Forwarded-Proto $scheme;')

with open('/etc/nginx/conf.d/arko360.conf', 'w') as f:
    f.write(content)
