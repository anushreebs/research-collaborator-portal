
CREATE TABLE IF NOT EXISTS rate_limits (bucket text PRIMARY KEY, window_id bigint NOT NULL, count integer NOT NULL);
CREATE TABLE IF NOT EXISTS studies (id text PRIMARY KEY, title text NOT NULL, description text NOT NULL, domain text NOT NULL, records integer NOT NULL, updated text NOT NULL, fields jsonb NOT NULL, trend jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS access_requests (study_id text PRIMARY KEY REFERENCES studies(id), purpose text NOT NULL, status text NOT NULL CHECK (status IN ('pending','approved','denied')), requested_at text NOT NULL);

