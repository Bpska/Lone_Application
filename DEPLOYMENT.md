# VPS deployment with Docker Compose

This stack runs three containers:

- `web`: Nginx serving the React PWA and proxying `/api`.
- `api`: the compiled Node.js API, running as a non-root user.
- `db`: PostgreSQL 16 on a private Docker network.

PostgreSQL data and private uploaded documents are stored in named Docker volumes. The API automatically runs pending database migrations before every start. Seed data is disabled by default.

## 1. Prepare the VPS

Install Docker Engine with the Compose plugin, point your domain to the VPS, and allow inbound ports 80 and 443 in the firewall. Clone the repository:

```bash
git clone <your-repository-url> saathi-finance
cd saathi-finance
cp .env.production.example .env.production
chmod 600 .env.production
```

## 2. Generate production secrets

Generate separate random values; do not reuse these examples:

```bash
openssl rand -base64 48
openssl rand -hex 32
openssl rand -base64 48
```

Use them for `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, and `SETUP_TOKEN`. Set a different strong `POSTGRES_PASSWORD`. If the database password contains URL-reserved characters, URL-encode it in `DATABASE_URL`.

Set `WEB_ORIGIN` to the final HTTPS address, for example:

```dotenv
WEB_ORIGIN=https://loans.example.com
```

Keep `SEED_ON_START=false` for production.

## 3. Build and start

```bash
docker compose --env-file .env.production config
docker compose --env-file .env.production build --pull
docker compose --env-file .env.production up -d
docker compose --env-file .env.production ps
```

Watch startup and migration logs:

```bash
docker compose --env-file .env.production logs -f api web
```

Check the public health endpoint:

```bash
curl -f http://127.0.0.1/health
```

## 4. HTTPS

The included Nginx container listens on HTTP port 80. Put it behind a TLS-terminating reverse proxy such as Caddy, Traefik, the host Nginx, or a trusted load balancer. Forward requests to `127.0.0.1:80`, preserve `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto`, then verify that the public site redirects HTTP to HTTPS.

Do not expose port 5432 publicly. The Compose file deliberately keeps PostgreSQL on an internal network.

## 5. First administrator

For a private pilot environment only, you may temporarily set:

```dotenv
SEED_ON_START=true
SEED_PASSWORD=a-temporary-strong-password
```

Start the stack once, confirm the accounts, then immediately set `SEED_ON_START=false`, remove `SEED_PASSWORD`, and recreate the API container:

```bash
docker compose --env-file .env.production up -d --force-recreate api
```

For a real deployment, replace seed credentials through an approved secure setup process before allowing users onto the system.

## 6. Updates

```bash
git pull --ff-only
docker compose --env-file .env.production build --pull
docker compose --env-file .env.production up -d
docker image prune -f
```

The API container applies new migrations before starting.

## 7. Backups

Create a database backup outside the container volume:

```bash
mkdir -p backups
docker compose --env-file .env.production exec -T db \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "backups/saathi-$(date +%F-%H%M).dump"
```

Back up the `private_uploads` volume separately and encrypt both backups. Test restoration regularly. Do not rely on a Docker volume as the only backup.

## 8. Useful commands

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=200 api
docker compose --env-file .env.production restart api
docker compose --env-file .env.production down
```

Do not use `docker compose down -v` in production; `-v` deletes the database and upload volumes.

## Local database-only Compose

The previous local PostgreSQL workflow remains available separately:

```bash
docker compose -f docker-compose.dev.yml up -d
npm run db:migrate
npm run db:seed
npm run dev
```
