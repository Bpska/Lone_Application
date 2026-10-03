# VPS deployment with Docker Compose

This stack runs three containers:

- `web`: Nginx serving the React PWA and proxying `/api`.
- `api`: the compiled Node.js API, running as a non-root user.
- `db`: PostgreSQL 16 on a private Docker network.

PostgreSQL data and private uploaded documents are stored in named Docker volumes. The API automatically runs pending database migrations before every start. Seed data is disabled by default.

## 1. Prepare the VPS

Use Ubuntu 22.04/24.04 with at least 2 CPU cores, 2 GB RAM, 20 GB disk, a sudo user, and a domain whose DNS A record points to the VPS.

Connect, update Ubuntu, and install Docker Engine plus Compose:

```bash
ssh your-user@YOUR_VPS_IP
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git openssl ufw
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"
```

Reconnect to apply the Docker group change. Then configure the firewall. Never expose PostgreSQL port 5999, internal API port 4000, or application port 7001 publicly:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Clone the repository:

```bash
sudo mkdir -p /opt/saathi-finance
sudo chown "$USER":"$USER" /opt/saathi-finance
git clone YOUR_REPOSITORY_URL /opt/saathi-finance
cd /opt/saathi-finance
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
POSTGRES_DB=saathi_loans
POSTGRES_USER=saathi
POSTGRES_PASSWORD=YOUR_RANDOM_DATABASE_PASSWORD
DATABASE_URL=postgresql://saathi:YOUR_RANDOM_DATABASE_PASSWORD@db:5999/saathi_loans
JWT_SECRET=YOUR_RANDOM_JWT_SECRET
DATA_ENCRYPTION_KEY=YOUR_64_CHARACTER_HEX_KEY
SETUP_TOKEN=YOUR_RANDOM_SETUP_TOKEN
WEB_ORIGIN=https://loans.example.com
HTTP_PORT=7001
SEED_ON_START=false
SEED_PASSWORD=
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
curl -f http://127.0.0.1:7001/health
```

## 4. HTTPS

The web container listens only on `127.0.0.1:7001`. Install Caddy and use it as the HTTPS reverse proxy:

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Set `/etc/caddy/Caddyfile`, replacing the domain:

```caddyfile
loans.example.com {
    encode zstd gzip
    reverse_proxy 127.0.0.1:7001
}
```

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl enable caddy
curl -I https://loans.example.com
curl -f https://loans.example.com/health
```

PostgreSQL listens on port 5999 only inside its private Docker network. Do not publish port 5999 publicly.

## 5. First administrator

For private first-time setup only, run the demo seed explicitly:

```bash
docker compose --env-file .env.production run --rm -e SEED_PASSWORD='TEMPORARY_STRONG_PASSWORD' api node apps/api/dist/seed.js
```

Sign in as `superadmin@saathi.test`, create and verify the real administrator, deactivate demo accounts, and remove the temporary password. Keep `SEED_ON_START=false` in production.

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
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "backups/saathi-$(date +%F-%H%M).dump"
```

Back up uploads too:

```bash
BACKUP_NAME="uploads-$(date +%F-%H%M).tar.gz"
docker run --rm -v saathi-finance_private_uploads:/source:ro -v "$PWD/backups:/backup" alpine tar -czf "/backup/$BACKUP_NAME" -C /source .
```

Encrypt both backups, copy them to separate storage, and test restoration regularly. Docker volumes are not backups.

## 8. Useful commands

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=200 api
docker compose --env-file .env.production restart api
docker compose --env-file .env.production down
```

Do not use `docker compose down -v` in production; `-v` deletes the database and upload volumes.

## 9. Verification and troubleshooting

Test customer registration/login/logout, application and document submission, admin review/approval, user-visible status updates, offers, loans, and payments. Restart the API and confirm uploaded files remain available.

```bash
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=300 api
curl -f https://loans.example.com/health
```

If PostgreSQL fails, make sure `DATABASE_URL` uses hostname `db`, not `localhost`, and all database credentials agree. For CORS errors, make `WEB_ORIGIN` exactly match the public HTTPS origin without a trailing slash, then recreate the API.

For certificate problems, verify DNS and both firewalls:

```bash
sudo ss -lntp | grep -E ':80|:443'
sudo journalctl -u caddy --since "30 minutes ago"
```

## Local database-only Compose

The previous local PostgreSQL workflow remains available separately:

```bash
docker compose -f docker-compose.dev.yml up -d
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Local PostgreSQL is available at `localhost:5999`. The local web application remains at `http://localhost:5173`; port 7001 is the production application port.
