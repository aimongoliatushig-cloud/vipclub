# NOMAD VIP Backend

Custom Frappe application for the NOMAD entertainer platform.

## Security

Bootstrap accounts use unique, account-specific one-time environment variables and fail closed when a credential is not supplied. See [docs/bootstrap-credentials.md](docs/bootstrap-credentials.md). Run `python scripts/check_no_bootstrap_secrets.py` before deployment.

## Current backend foundation

- Entertainer profile linked to ERPNext Employee, User and Branch
- Bronze, Silver, Gold and Diamond rank definitions
- Versioned ranking policy
- Immutable performance event and point ledger
- Immutable rank history and auditable readiness reversals
- One READY/NOT_READY readiness check per entertainer shift
- Reservation lifecycle and entertainer response command
- Self-service dashboard/rank/check-in API
- Supervisor readiness queue and submission API
- Role, branch and ownership permission hooks

The React frontend is intentionally kept separate. Business calculations and authorization live in this app.

## API methods

- `nomad_vip.api.entertainer.get_dashboard`
- `nomad_vip.api.entertainer.get_rank`
- `nomad_vip.api.entertainer.check_in`
- `nomad_vip.api.supervisor.get_readiness_queue`
- `nomad_vip.api.supervisor.submit_readiness`
- `nomad_vip.api.supervisor.reverse_readiness`
- `nomad_vip.api.reservations.respond`

## VPS deployment

The source is stored persistently at `/opt/nomad-vip/apps/nomad_vip` and bind-mounted into every Frappe process using `deploy/compose.nomad-app.yaml`.

After updating the source:

```bash
cd /opt/nomad-vip/frappe_docker
docker compose -p nomad -f compose.nomad.yaml -f compose.nomad-app.yaml up -d
docker exec nomad-backend-1 bench --site nomad.local migrate
```

### Installation

You can install this app using the [bench](https://github.com/frappe/bench) CLI:

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch main
bench install-app nomad_vip
```

### Contributing

This app uses `pre-commit` for code formatting and linting. Please [install pre-commit](https://pre-commit.com/#installation) and enable it for this repository:

```bash
cd apps/nomad_vip
pre-commit install
```

Pre-commit is configured to use the following tools for checking and formatting your code:

- ruff
- eslint
- prettier
- pyupgrade

### License

mit
