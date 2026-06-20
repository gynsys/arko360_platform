UPDATE landing_sites 
SET site_config = jsonb_set(
  site_config, 
  '{global,logo}', 
  to_jsonb(replace(site_config->'global'->>'logo', 'http://backend:8001', 'https://api.arko360.net'))
) 
WHERE site_config->'global'->>'logo' LIKE 'http://backend:8001%';
