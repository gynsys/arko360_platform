SELECT slug, site_config->'global'->>'logo' as logo FROM landing_sites ORDER BY created_at DESC LIMIT 1;
