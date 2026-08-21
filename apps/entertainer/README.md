# NOMAD Entertainer App

Mobile-first entertainer workspace built from the supplied `index.html` concept. The interface uses the shared light indigo design system, with an optional slate/indigo dark mode, and prioritizes the daily shift workflow.

## Included in this frontend milestone

- Daily dashboard with shift, readiness, payout, rank and next reservation
- Schedule and attendance views
- Income summary and payout history
- Ranking and progress
- Reservation acceptance flow
- Loan calculator and request flow
- Leave request, profile, notifications and services
- Responsive bottom navigation and toast feedback

The current build uses mock data. ERPNext/Frappe authentication and live API data are the next integration milestone.

## Local development

```bash
npm install
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

## Deployment

The static `dist` build is served by Nginx in Docker. The staging instance runs separately from ERPNext so the admin system remains available on port `8080`.

- Entertainer staging: `http://187.77.144.226:3000`
- ERPNext admin: `http://187.77.144.226:8080/login`

## Design references

- Generated concept: `public/design/dashboard-concept.png`
- Implemented mobile capture: `artifacts/dashboard-mobile.png`
