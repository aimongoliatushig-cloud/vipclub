# VIP Club хөгжүүлэлтийн урсгал

Энэ repository нь VIP Club-ийн кодын үндсэн эх сурвалж. Linear нь хийх ажил, хариуцагч, төлөв болон хүлээн авах шалгуурын үндсэн эх сурвалж байна.

## Branch-ийн үүрэг

- `main` — production-д гаргахад бэлэн, баталгаажсан source.
- `develop` — review хийгдсэн өөрчлөлтүүдийг нэгтгэх branch.
- `nymka` — Nymka-ийн өдөр тутмын үндсэн branch. Хэрэглэгчийн local сайжруулалтыг өөрөөр заагаагүй бол эндээс эхлүүлнэ.
- `battushig` — Battushig-ийн өдөр тутмын branch.

`main` болон `develop` дээр шууд commit хийхгүй. Хувийн branch-ээс `develop` руу pull request нээнэ.

## Local source-ийг repository-д оруулах

Local workspace болон production сервер дээр хийсэн source өөрчлөлт GitHub-гүй үлдэх ёсгүй. Тохирох замд синк хийнэ:

| Local source | Repository зам |
| --- | --- |
| `nomad-vip-backend` | `apps/backend` |
| `manager-app` | `apps/manager` |
| `entertainer-app` | `apps/entertainer` |
| `vip-entry-app` | `apps/entry` |

Зөвхөн source болон шаардлагатай config template-ийг оруулна. `.env`, нууц түлхүүр, production database/backup, `node_modules`, `dist` болон түр файлыг commit хийхгүй.

## Linear → local → GitHub

1. Linear-ийн `VIP Club` project дотор task үүсгэж, зорилго, хамрах хүрээ, хүлээн авах шалгуур болон хариуцагчийг тодорхой болгоно.
2. Ажил эхлэхэд task-ийг `In Progress` болгоно.
3. Хариуцсан branch-ээ шинэчилж local хөгжүүлэлт хийнэ. Nymka-ийн хувьд:

   ```bash
   git fetch origin
   git switch nymka
   git pull --rebase origin nymka
   git rebase origin/develop
   ```

4. Өөрчилсөн app болон acceptance criteria-д тохирсон шалгалтыг ажиллуулна.
5. Commit-ийн эхэнд Linear ID оруулна: `BAT-123: manager sales goal approval`.
6. Хувийн branch-ээ push хийгээд `develop` руу pull request нээнэ.
7. Pull request холбоос болон шалгалтын үр дүнг Linear task дээр хавсаргаж, төлвийг `In Review` болгоно.
8. Review дууссаны дараа `develop` руу merge хийнэ. Production-д баталгаажсан багцыг `main` руу оруулна.
9. Шаардлагатай verification болон deploy evidence бүртгэгдсэний дараа Linear task-ийг `Done` болгоно.

## Pull request-ийн доод шаардлага

- Linear task-ийн ID болон холбоос.
- Ямар app, contract эсвэл data model өөрчилсөн товч тайлбар.
- Ямар шалгалт хийсэн үр дүн.
- Migration, environment variable эсвэл deploy дараалал өөрчлөгдсөн эсэх.
- Mobile UI өөрчилсөн бол 390x844 харагдацын нотолгоо.

Deploy нь тусдаа зөвшөөрөлтэй үйлдэл. Code merge болсон нь автоматаар production deploy хийх зөвшөөрөл биш.
