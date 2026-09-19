-- Runs automatically on first container init (docker-entrypoint-initdb.d),
-- i.e. only against a fresh volume. For an existing volume, create it
-- manually once: docker exec <container> psql -U postgres -c
-- "CREATE DATABASE website_starter_kit_test;"
CREATE DATABASE website_starter_kit_test;
