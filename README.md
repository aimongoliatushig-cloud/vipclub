# VIP Club Platform

VIP Club-ийн ажилтан, удирдлага, үүдний бүртгэл болон өдөр тутмын зэрэглэлийн системийн нэгдсэн source repository.

## Apps

- `apps/backend` — Frappe/ERPNext backend, API, DocType, scheduled jobs болон backend tests.
- `apps/manager` — manager болон захирлын удирдлагын React PWA.
- `apps/entertainer` — бүжигчин, ахлах бүжигчин болон ажилтны mobile-first React PWA.
- `apps/entry` — үүд, оператор, хамгаалагч, bartender болон зочны бүртгэлийн React app.

## Product contracts

- `UI_UX_DESIGN_SYSTEM.md` — бүх role-д мөрдөх indigo UI/UX систем.
- `DAILY_RANKING_CONTRACT.md` — ирцэд суурилсан өдөр тутмын болон нийт дундаж зэрэглэлийн дүрэм.
- `SALES_GOAL_APPROVAL_CONTRACT.md` — manager-ийн санал → захирлын засвар/баталгаажуулалтын урсгал.
- `docs/` — product, architecture, process, data болон integration баримт бичгүүд.

## Local development

Frontend бүрийг тусад нь ажиллуулна:

```bash
cd apps/manager        # эсвэл entertainer / entry
npm ci
npm run dev
```

Backend setup болон Frappe app суулгалтын заавар `apps/backend/README.md` дотор бий.

## Branches

- `main` — production-д баталгаажсан source.
- `develop` — дараагийн хөгжүүлэлтийн нэгдсэн branch.
- `nymka` — Nymka-ийн өдөр тутмын үндсэн хөгжүүлэлтийн branch. Хэрэглэгчийн хүссэн local сайжруулалтыг өөрөөр заагаагүй бол энд commit/push хийнэ.
- `battushig` — Battushig-ийн өдөр тутмын хөгжүүлэлтийн branch.

Linear task-аас эхлээд local хөгжүүлэлт, review, merge, deploy хүртэлх дүрмийг [`CONTRIBUTING.md`](CONTRIBUTING.md)-ээс харна уу.

Нууц түлхүүр, `.env`, production backup, `node_modules`, build output repository-д commit хийхгүй.
