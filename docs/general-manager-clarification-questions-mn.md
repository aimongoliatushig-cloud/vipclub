---
type: stakeholder-interview-guide
status: draft-for-general-manager-review
last_reviewed: 2026-08-07
language: mn
---

# Ерөнхий менежерийн тодруулгын асуулт ба санал болгож буй шийдлүүд

## Зорилго

Энэ баримт нь VIP Club repository дахь 79 Markdown файлыг бүхэлд нь уншиж хийсэн аудитын үр дүн юм. Ерөнхий менежерээс авах шаардлагатай бизнесийн шийдвэр, тодруулгыг нэг ярилцлагын багц болгон нэгтгэж, асуулт бүрт хэрэгжүүлж болох эхний хувилбарыг санал болгов.

Энд байгаа **санал болгож буй шийдэл нь батлагдсан бодлого биш**. Ерөнхий менежерийн хариулт, CEO болон холбогдох санхүү, ХН, хууль, техникийн эзний баталгааны дараа хүчин төгөлдөр шийдвэр болно. Батлагдаагүй дүн, хувь, хугацаа, эрхийн хязгаарыг **TBD — Business configuration required** хэвээр хадгална.

## Аудитын товч үр дүн

- Нийт 79 Markdown файл шалгасан.
- 31 файл зөвхөн draft scaffold буюу агуулга нь гүйцээгүй загвар байна.
- 26 файлд TBD тохиргоо байна.
- 20 файлд тусдаа open-decision хэсэг байна.
- Үндсэн бүтээгдэхүүний чиглэл тодорхой боловч эрх мэдэл, өдөр тутмын ажиллагаа, санхүүгийн дүрэм, exception, SLA, өгөгдлийн эзэн, нэвтрүүлэлтийн шалгуур тодорхой бус хэвээр байна.

## Хариултыг хэрхэн бүртгэх вэ

Асуулт бүрт дараах мэдээллийг тэмдэглэнэ:

- **Сонголт:** Санал болгосон шийдлийг зөвшөөрсөн / өөрчилсөн / татгалзсан.
- **Эцсийн шийдвэр:**
- **Шийдвэрийн эзэн:**
- **Хамтран баталсан хүмүүс:**
- **Баталсан огноо:**
- **Хүчин төгөлдөр болох огноо:**
- **Онцгой нөхцөл ба exception:**
- **Нөлөөлөх баримт бичиг болон Linear ажил:**

Priority тайлбар:

- **P0:** холбогдох дизайн, хөгжүүлэлт эхлэхээс өмнө шийдэх.
- **P1:** pilot эхлэхээс өмнө шийдэх.
- **P2:** pilot өгөгдөл дээр тулгуурлан нарийвчлах боломжтой.

## 1. Байгууллага, хамрах хүрээ, эрх мэдэл

| ID | Priority | Ерөнхий менежерээс асуух асуулт | Санал болгож буй эхний шийдэл | Хамтран батлах |
| --- | --- | --- | --- | --- |
| GMQ-001 | P0 | Дөрвөн салбарын албан ёсны нэр, код, цагийн бүс, хуулийн этгээд болон cost center-ийн хамаарал яг ямар вэ? | Нэг компанийн дор тохиргоогоор нэмэгддэг дөрвөн Club Branch ашиглаж, салбар бүрт тогтвортой код, timezone, cost center, идэвхтэй огноо хадгалах. Хуулийн бүтэц өөр бол Company mapping-ийг тусад нь батлах. | CEO, Ерөнхий нягтлан |
| GMQ-002 | P0 | Эхний хувилбарт заавал орох болон дараагийн үе шатанд хойшлуулах боломжийг юу гэж батлах вэ? | Phase 1-д хэрэглэгч, ажилтан, ирц, тооцоо, захиалга, check-in, CallPro discovery; Phase 2-т realtime request, task, messaging; Phase 3-т membership/point; Phase 4-т KPI, reward, finance production readiness гэсэн одоогийн roadmap-ийг суурь болгох. | CEO, Техникийн эзэн |
| GMQ-003 | P0 | Ерөнхий менежер ямар шийдвэрийг өөрөө гаргах, ямар шийдвэрийг CEO-д заавал шилжүүлэх вэ? | Delegation matrix баталж, өдөр тутмын cross-branch ажиллагаа, task, exception review-ийг GM-д; санхүүгийн бодлого, цалин/торгууль, termination, өндөр эрсдэлтэй privacy, membership override-ийг CEO эсвэл тусдаа баталгаанд үлдээх. | CEO |
| GMQ-004 | P0 | Sales Manager нь Branch Manager-ээс тусдаа үүрэг үү? Host болон Receptionist нэг үүрэг үү? | Нэг canonical role ашиглаж, шаардлагатай бол role alias эсвэл нэмэлт permission profile үүсгэх. Ижил эрхтэй давхардсан үүрэг шинээр үүсгэхгүй. | CEO, ХН |
| GMQ-005 | P0 | GM, HR, нягтлан, маркетинг, техникийн ажилтан олон салбарын ямар өгөгдлийг харах эрхтэй вэ? | Хугацаатай, зорилготой Access Grant ашиглаж; role, branch, action, field, export бүрээр deny-by-default эрх өгөх. Түр орлон ажиллах эрх автоматаар дуусдаг байх. | CEO, ХН, Хуульч |
| GMQ-006 | P1 | Ямар тохиргоо компанийн нэгдсэн, ямар тохиргоо салбар тус бүрийнх байх вэ? | Компанийн default policy-оос салбар inheritance хийх; зөвхөн батлагдсан үнэ, privilege eligibility, notification, operational setting-д effective-dated branch override зөвшөөрөх. | CEO, Ерөнхий нягтлан |

## 2. Харилцагч, захиалга, check-in, өрөө ба үйлчилгээ

| ID | Priority | Ерөнхий менежерээс асуух асуулт | Санал болгож буй эхний шийдэл | Хамтран батлах |
| --- | --- | --- | --- | --- |
| GMQ-010 | P0 | Харилцагч бүртгэхэд заавал, сонголттой, хориглох талбарууд юу вэ? Нас эсвэл ID шалгах шаардлага бий юу? | Эхний бүртгэлд нэр/display name, normalized утас, үйлчилгээний зөвшөөрөл; маркетингийн consent-ийг тусдаа авах. ID/насны мэдээллийг зөвхөн хууль, бодлого шаардсан тохиолдолд хамгийн бага хэмжээгээр хадгалах. | CEO, Reception, Хуульч |
| GMQ-011 | P0 | Нэг утас олон хүн ашиглах, duplicate profile үүсэх, customer merge хийх үед хэн шийдэх вэ? | Утас болон provider ID-аар candidate match гаргах боловч автоматаар merge хийхгүй. Reception санал гаргаж, эрхтэй manager review хийж, өмнөх/шинэ утга болон шалтгааныг audit-д хадгалах. | Reception, Салбарын менежер |
| GMQ-012 | P0 | Үйлчилгээний нөхцөл, маркетингийн consent, сувгийн сонголт, opt-out-ыг хэрхэн салгах вэ? | Үйлчилгээний шаардлагатай зөвшөөрөл болон маркетингийн Viber, Telegram, SMS, email зөвшөөрлийг тусдаа version-оор бүртгэх; opt-out-ыг шууд хүчинтэй болгох. | Маркетинг, Хуульч |
| GMQ-013 | P0 | Reception, Call Operator, Customer Assistant, walk-in захиалга нэг процессоор явах уу? | Нэг Club Reservation record ашиглаж, source, creator, branch, цаг, guest count, customer, call/session link-ийг хадгалах. Channel бүр өөр UI-тай боловч lifecycle нэг байна. | Reception, Call Operations |
| GMQ-014 | P0 | Check-in-ийг нэг харилцагч, бүх group, эсвэл өрөөгөөр бүртгэх үү? | Group-level Customer Session нээж, үндсэн customer болон optional participants-ийг холбоно. Reservation, check-in, service entry, bill, drop-off цагийг тусдаа хадгална. | Reception, Салбарын менежер |
| GMQ-015 | P0 | Өрөөний capacity, waitlist, confirmed-room hold, no-show дүрэм ямар байх вэ? | Capacity-г room configuration болгох; давхардсан active session-ийг хориглох; waitlist болон hold хугацааг салбар/үйлчилгээний бодлогоор effective-dated тохируулах. | CEO, Салбарын менежерүүд |
| GMQ-016 | P0 | Room QR-г хэн идэвхжүүлж, ямар session-т холбож, хэзээ хаах вэ? | Reception check-in хийхэд богино хугацаатай session token үүсгэж, branch, room, customer session-т bind хийх. Bill, drop-off, checkout эсвэл manager close үед хүчингүй болгох. | Техникийн эзэн, Reception |
| GMQ-017 | P0 | Энтертайнерийн operational availability болон customer-visible төлөвийг хэн өөрчлөх вэ? | Энтертайнер өөрийн readiness-ийг санал болгох; floor/manager operational state-ийг батлах; customer-visible төлөвийг эрхтэй ажилтан тусад нь идэвхжүүлэх. Өөрчлөлт бүр reason, actor, time-тай байна. | Салбарын менежер, Ахлах энтертайнер |
| GMQ-018 | P0 | Customer request-ийн албан ёсны төлөвүүд, татгалзах болон цуцлах шалтгаан юу вэ? | Requested, Confirmed, On the way, Arrived, Completed, Unavailable, Declined, Cancelled, Missed, Escalated гэсэн эхний state set ашиглаж, customer-facing үгийг илүү энгийнээр харуулах. | Салбарын менежерүүд |
| GMQ-019 | P0 | Ойролцоогоор хоёр минутын request target нь SLA, анхааруулга, эсвэл KPI-ийн аль нь вэ? | Эхний pilot-д soft service target болгох. 60 секундэд visual warning, 120 секундэд manager escalation өгөх боловч автоматаар торгохгүй. Pilot-ийн дараа хугацааг тохируулна. | CEO, ХН, Салбарын менежерүүд |
| GMQ-020 | P1 | Realtime эсвэл сүлжээ ажиллахгүй үед request, room, check-in-ийг яаж үргэлжлүүлэх вэ? | Shift-level manual fallback queue/цаасан журнал ашиглаж, system сэрсний дараа эрхтэй хэрэглэгч original time, source, reason-тай backfill хийх. Давхардлыг reconciliation-аар шалгах. | Салбарын менежер, Техникийн эзэн |
| GMQ-021 | P0 | Drop-off-ийн албан ёсны шалтгаан, free-text, follow-up дүрэм юу вэ? | Full capacity, preferred entertainer unavailable, too few options, price concern, wait too long, service mismatch, other гэсэн тохируулгатай ангилал; Other-д тайлбар заавал; manager өдөр бүр trend review хийх. | Салбарын менежерүүд |
| GMQ-022 | P0 | Check-in болсон боловч bill/drop-off байхгүй session хэдийд exception болох, хэн хаах вэ? | Shift дуусах хүртэл unresolved warning; shift close үед Reconciliation Exception үүсгэх; Branch Manager reason/evidence-тай resolve; өндөр дүн эсвэл хугацаа хэтэрсэн exception-ийг GM/Accounting-д escalate хийх. | Нягтлан, Салбарын менежер |
| GMQ-023 | P1 | Салбар дүүрсэн үед өөр салбар санал болгох, customer acceptance, revenue attribution-ыг яаж бүртгэх вэ? | Offered, Accepted, Declined, Receiving reservation гэсэн flow ашиглаж, origin болон receiving branch-ийг хоёуланг хадгалах. Борлуулалтын үндсэн attribution-ыг үйлчилгээ үзүүлсэн салбарт, referral metric-ийг origin салбарт өгөхийг санал болгох. | CEO, Салбарын менежерүүд |
| GMQ-024 | P1 | Operations workstation дээр хамгийн түрүүнд ямар мэдээлэл, alert харагдах ёстой вэ? | Эхний дэлгэцэд room/session, current reservation, request age, available entertainers, unresolved reconciliation-ийг харуулж; customer private data-г drill-down болон permission-ээр хязгаарлах. | Салбарын менежер, Bartender/Floor Operations |
| GMQ-025 | P0 | Compliment, complaint, suggestion-ийг хэдийд хариулах, complaint-ийг verified incident болгох шалгуур юу вэ? | 24 цагт acknowledgement, 3 ажлын өдөрт initial resolution гэсэн pilot target санал болгох. Complaint өөрөө incident биш; evidence, manager review, employee response, appeal боломжтой үед л verified болгох. | CEO, ХН, Хуульч |
| GMQ-026 | P0 | Extra service-ийн албан нэр, төрөл, үнэ, performer capability, bill болон revenue share яаж ажиллах вэ? | Configurable Extra Service catalog ашиглаж, branch price болон entertainer capability-г тусдаа approval-тай болгох. POS bill дээр тусдаа line item; customer-д зөвхөн нэр, тайлбар, үнэ харуулах; internal share-ийг finance policy-д хадгалах. | CEO, Ерөнхий нягтлан |

## 3. CallPro ба Call Operator ажиллагаа

| ID | Priority | Ерөнхий менежерээс асуух асуулт | Санал болгож буй эхний шийдэл | Хамтран батлах |
| --- | --- | --- | --- | --- |
| GMQ-030 | P0 | Call Operator-ийн үндсэн call-purpose ангилал хангалттай юу? Нэмэх эсвэл хасах ангилал байна уу? | Reservation, general inquiry, location, menu/service, entertainer availability, prank/abusive, other гэсэн одоогийн жагсаалтыг configurable болгох; routine reservation-д note шаардахгүй. | Call Operations |
| GMQ-031 | P0 | Operator customer-оос яг ямар мэдээлэл харах болон шинээр үүсгэх эрхтэй вэ? | Masked phone, service name/display identity, membership/VIP service indicator, reservation-relevant note л харуулах; minimum customer record үүсгэх; spend, campaign, full CRM history харуулахгүй. | CEO, Хуульч |
| GMQ-032 | P0 | Missed call-ыг буцааж залгах queue, хариуцах эзэн, хугацаа ямар байх вэ? | Missed calls-ыг callback queue-д автоматаар оруулж, shift owner томилох; configurable response target болон outcome хадгалах. Хугацааг CallPro-ийн бодит data дээр pilot-оор тогтоох. | Call Operations, Салбарын менежер |
| GMQ-033 | P0 | Prank/abusive/block/unblock шийдвэрийг operator шууд хийх үү, manager review шаардах уу? | Operator түр block санал эсвэл богино хугацааны block үүсгэж, reason/evidence заавал оруулах; урт хугацааны block болон unblock-ыг manager review; appeal болон expiry-тэй болгох. | CEO, Хуульч |
| GMQ-034 | P1 | Call recording хадгалах шаардлагатай юу? Хэн сонсох, хэдий хугацаанд хадгалах вэ? | Provider боломж болон хууль ёсны consent батлагдаагүй бол recording импортлохгүй. Шаардлагатай бол purpose-limited access, retention, access audit, deletion policy-г тусад нь батлах. | Хуульч, Техникийн эзэн |

## 4. Энтертайнерийн profile, ranking, орлого, суутгал ба зээл

| ID | Priority | Ерөнхий менежерээс асуух асуулт | Санал болгож буй эхний шийдэл | Хамтран батлах |
| --- | --- | --- | --- | --- |
| GMQ-040 | P0 | Customer-facing profile дээр яг ямар талбар харуулах вэ? | Approved photo, display name, nationality, language, short intro, talent, current rank, customer-visible availability, approved extra service л эхний хувилбарт харуулах. Талбар тус бүрээр publish approval ашиглах. | CEO, Маркетинг, Хуульч |
| GMQ-041 | P0 | Body measurement болон internal matching trait-ийг хэн, ямар зорилгоор ашиглах вэ? | Customer, Call Operator, Bartender-д хэзээ ч харуулахгүй. Зөвхөн тодорхой service-matching purpose-тэй эрхтэй manager/HR ашиглаж, query болон export-ыг audit хийх. Шаардлага нотлогдохгүй бол талбарыг цуглуулахгүй. | ХН, Хуульч |
| GMQ-042 | P0 | Incident-ийн ангилал, severity, нотолгоо, review, appeal дүрэм юу вэ? | Configurable category ба severity ашиглаж, reporter note-оос тусдаа evidence, employee response, reviewer decision, resolved/appealed төлөв хадгалах. Unverified report ranking-д нөлөөлөхгүй. | ХН, Салбарын менежер |
| GMQ-043 | P0 | Ranking-ийн sales, attendance, loyalty, behavior дөрвөн хэмжүүрийн жин, threshold-ийг яаж батлах вэ? | Эхний 2–3 циклд compensation-д нөлөөлөхгүй shadow score ажиллуулж, data quality ба bias-ийг шалгах. Дараа нь CEO/GM effective-dated weight, threshold батлах. | CEO, Ахлах энтертайнер, ХН |
| GMQ-044 | P0 | Repeat-customer loyalty гэж яг юуг тооцох вэ? | Verified reservation эсвэл billed visit-ийг customer-entertainer pair-аар тоолох; cancelled/no-show/duplicate-ийг хасах; нэг customer-ийн хэт их нөлөөг cap хийх; evaluation window-ийг бодлогоор тогтоох. | CEO, CRM owner |
| GMQ-045 | P0 | Ranking review хэдий давтамжтай, promotion/demotion-д ямар grace, minimum evidence хэрэгтэй вэ? | Сар бүр evidence snapshot, улирал тутам formal review санал болгох. Promotion-д minimum complete data; demotion-д дор хаяж хоёр review эсвэл батлагдсан hard gate; appeal хугацаатай байх. | CEO, ХН |
| GMQ-046 | P0 | Diamond-д гурван сарын performance болон есөн шинэ entertainer recruitment үнэхээр заавал байх уу? | Эдгээрийг шууд hard-code хийхгүй. Recruitment-ийг чанар, retention, verified referral-тай тодорхойлж, эхлээд shadow gate байдлаар турших; CEO/GM баталсны дараа policy болгох. | CEO, ХН |
| GMQ-047 | P0 | Rank-ийн эцсийн шийдвэрийг GM, CEO, committee, эсвэл өөр үүрэг батлах уу? | Lead Entertainer/Manager evidence, system recommendation; GM review; Diamond болон exception/override-д CEO approval гэсэн шаталсан хувилбар санал болгох. Нэг хүн propose ба approve хоёуланг хийхгүй. | CEO |
| GMQ-048 | P0 | Bronze 50%, Silver 60%, Gold 70%, Diamond 80% share болон tip, wine commission, spreading tip-ийн санал батлагдах уу? | Одоогийн хувийг production policy болгохоос өмнө margin simulation хийх. Approved rate-ийг branch-scoped, effective-dated policy болгож, finalized settlement-ийг буцааж өөрчлөхгүй. | CEO, Ерөнхий нягтлан |
| GMQ-049 | P0 | Lateness, no-show, missed request болон бусад deduction ямар нотолгоо, approval, appeal шаардах вэ? | Automatic deduction хийхгүй. Source evidence, employee notice, proposer, тусдаа approver, reason, policy version, appeal ба reversal path заавал байх. Missed request-ийг pilot үед зөвхөн service evidence болгох. | ХН, Ерөнхий нягтлан, Хуульч |
| GMQ-050 | P0 | Гурван өдрийн settlement-ийн эхлэх/дуусах цаг, timezone, late transaction, correction cutoff юу вэ? | Branch-local calendar period ашиглаж, period close-оос хойш ирсэн гүйлгээг дараагийн settlement-ийн adjustment болгон оруулах. Retroactive silent edit хийхгүй. | Ерөнхий нягтлан |
| GMQ-051 | P1 | Аль employment type зээл авах эрхтэй, maximum болон repayment ямар байх вэ? | Тус бүрд minimum tenure, reconciled income, outstanding balance, affordability gate тогтоох; fixed formula-аар maximum санал болгох; CEO/finance approval, departure settlement, appeal/reversal-тай байх. | CEO, ХН, Ерөнхий нягтлан |

## 5. CRM, membership, point ба privilege

| ID | Priority | Ерөнхий менежерээс асуух асуулт | Санал болгож буй эхний шийдэл | Хамтран батлах |
| --- | --- | --- | --- | --- |
| GMQ-060 | P0 | Eligible spend-д tax, service charge, discount, complimentary item, refund, cancelled bill, extra service-ээс юу орох вэ? | Final paid, non-refunded, approved eligible net line amount-ыг суурь болгох; tax, void, complimentary, refunded хэсгийг default-аар хасах; category exception-ийг effective-dated policy болгох. | CEO, Ерөнхий нягтлан |
| GMQ-061 | P0 | Таван status-ийн threshold болон олон салбарын spend-ийг нэг status болгох normalization ямар байх вэ? | Нэг company-wide eligible spend total ашиглахыг default болгох. Салбарын үнийн зөрүү их бол батлагдсан normalization factor ашиглах боловч customer-д нэг status л харуулах. | CEO, Ерөнхий нягтлан |
| GMQ-062 | P0 | Anniversary-гаас өмнө higher status хүрвэл шууд upgrade хийх үү? | Upgrade threshold болон minimum history бүрдвэл дараагийн өдөр/тооцооллын циклд upgrade; retention/downgrade-ийг anniversary дээр хийх санал. Fraud/data-quality hold-ыг тусдаа review болгох. | CEO, Маркетинг |
| GMQ-063 | P0 | 30 хоногийн grace, нэг түвшин буурах дүрэм, exception, appeal-ыг хэн шийдэх вэ? | Автомат grace notice; downgrade-г system propose; manual exception-г reason/evidence-тай manager propose, CEO approve; customer review request сувагтай байх. | CEO, Маркетинг |
| GMQ-064 | P0 | Point earn rate, point-to-MNT, expiry, balance limit, redemption болон refund дүрэм ямар байх вэ? | 1–5 хувийн жишээг шууд идэвхжүүлэхгүй. Margin, liability, breakage simulation хийж, controlled pilot rate батлах; immutable ledger, redemption approval, refund reversal, fraud limit ашиглах. | CEO, Ерөнхий нягтлан |
| GMQ-065 | P0 | Transport, free entry, reservation priority, guest, hold/no-show, premium-branch privilege-ийн эцсийн нөхцөл юу вэ? | Privilege бүрийг тусдаа entitlement/quota болгох; branch eligibility, booking notice, guest count, reset, expiry, reversal, no-show нөхцөлийг customer-readable policy болгох. | CEO, Салбарын менежерүүд, Маркетинг |
| GMQ-066 | P0 | 2026 оны 4-р сараас хойших түүх дутуу үед manager nomination-ийг ямар evidence-ээр хийх вэ? | Verified spend summary, branch manager reason, source-completeness flag, proposed status, CEO approval хадгалах. Launch-аас хойш бүх хэрэглэгчийг ижил automatic rule-д оруулах. | CEO, Ерөнхий нягтлан |
| GMQ-067 | P1 | Customer Assistant-ийн launch self-service scope юу вэ? | Эхний release-д own membership/point/privilege view, reservation, room request, feedback, consent; profile edit, redemption, dispute зэрэг өндөр эрсдэлтэй action-д staff review эсвэл step-up verification ашиглах. | CEO, Хуульч |
| GMQ-068 | P1 | High-status member-ийг companions-д ил гаргахгүй theme болон staff indicator яаж ажиллах вэ? | Customer screen-д subtle color/icon; plain text status-ийг зөвхөн member-ийн private view-д; staff view-д service need байгаа үед exact tier харуулах. | Маркетинг, Хуульч |

## 6. Monthly goal, manager KPI, reward, task ба branch health

| ID | Priority | Ерөнхий менежерээс асуух асуулт | Санал болгож буй эхний шийдэл | Хамтран батлах |
| --- | --- | --- | --- | --- |
| GMQ-070 | P0 | CEO target set, manager plan submit, CEO review, plan activation-ийн яг хугацаа юу вэ? | Configurable early-month calendar ашиглаж, target set, plan submit, review SLA, activation cutoff тус бүрийг салгах. Эхний pilot-д сарын 1–5-ны хооронд багтаах боловч hard-code хийхгүй. | CEO |
| GMQ-071 | P0 | Target baseline gross sales, net sales, comparable month, rolling average, эсвэл seasonality-ийн алинд суурилах вэ? | Reconciled net sales-ийг default; previous comparable period болон rolling trend-ийг advisory байдлаар харуулах; CEO final target болон override reason хадгалах. | CEO, Ерөнхий нягтлан |
| GMQ-072 | P0 | Manager KPI-д sales, task, attendance, request, drop-off, complaint, repeat customer-оос аль нь орж, compensation-д нөлөөлөх вэ? | Эхлээд reporting-only scorecard ажиллуулж, data quality батлагдсан manager-influence metrics-ийг л дараа нь compensation-д оруулах. Customer complaint raw count-ыг шууд penalty болгохгүй. | CEO, ХН, Ерөнхий нягтлан |
| GMQ-073 | P0 | 80/70/60/50 хувийн underperformance саналын boundary, salary base, stacking, exception, appeal ямар байх вэ? | Хууль, HR approval хүртэл shadow calculation болгох. Нэг cycle-д давхар deduction stacking хийхгүй; approved base, exception, notice, appeal, reversal-тай policy шаардах. Termination автоматаар хийхгүй. | CEO, ХН, Хуульч |
| GMQ-074 | P0 | Above-target reward-ийг revenue, incremental gross margin, эсвэл өөр сууринаас тооцох уу? Manager/team share-ийг хэн батлах вэ? | Margin хамгаалахын тулд reconciled incremental contribution эсвэл CEO-approved pool ашиглах; manager proposal, CEO review, finance posting, recipient-level audit-тай байх. | CEO, Ерөнхий нягтлан |
| GMQ-075 | P0 | Branch Health Score-д ямар metric, weight, cadence, color, critical alert орох вэ? | Эхний хувилбарт sales attainment, task overdue, request aging, drop-off, reconciliation exception, attendance, feedback гэсэн drill-down scorecard; compensation-д нөлөөлөхгүй; pilot өгөгдлөөр weight/threshold батлах. | CEO |
| GMQ-076 | P1 | Task-ийн final state, acknowledgement, evidence, acceptance, rework, reopen, escalation ямар байх вэ? | Draft, Assigned, Acknowledged, In Progress, Blocked, Submitted, Revision Requested, Accepted, Completed, Reopened төлөв ашиглах; assigner эсвэл delegated reviewer acceptance хийх; reopen reason заавал. | CEO, Салбарын менежерүүд |
| GMQ-077 | P1 | Deadline reminder, overdue escalation, attachment retention, notification spam-ыг яаж удирдах вэ? | Task type бүрээр reminder profile; default 2 өдөр ба 1 өдөр өмнө, due time, нэг overdue reminder, дараа нь manager escalation; critical task-д тусдаа дүрэм; digest ашиглах. | Салбарын менежерүүд |
| GMQ-078 | P1 | Maintenance болон carpenter task-ийн category, urgency, SLA, completion evidence юу вэ? | Safety critical, service blocking, normal, planned гэсэн urgency; photo/note/verification шаардах; safety critical-ийг шууд manager болон security/technical owner-д escalate хийх. | Салбарын менежер, Техникийн эзэн |

## 7. Messaging, AI, өгөгдөл, нэвтрүүлэлт ба үйл ажиллагааны бэлэн байдал

| ID | Priority | Ерөнхий менежерээс асуух асуулт | Санал болгож буй эхний шийдэл | Хамтран батлах |
| --- | --- | --- | --- | --- |
| GMQ-080 | P1 | Direct message-ийн хэнд илгээх хүрээ, attachment, retention, task discussion-тай давхцах дүрэм юу вэ? | Task-related discussion-ийг Task дээр хадгалах; general direct message-ийг hierarchy/branch permission-ээр хязгаарлах; attachment type/size, retention, abuse-report дүрэмтэй байх. | ХН, Хуульч |
| GMQ-081 | P0 | Recipient-anonymous feedback-ийг ямар тохиолдолд ашиглах, true identity-г хэн, ямар шалтгаанаар нээх вэ? | Safety, harassment, misconduct, retaliation concern-д зөвшөөрөх; normal recipient-д sender нуух; CEO эсвэл тусдаа audit authority зөвхөн documented purpose-оор reveal; reveal бүр audit, anti-retaliation review-тай байх. | CEO, ХН, Хуульч |
| GMQ-082 | P1 | PWA notification-ийн default цаг, priority, quiet hours, escalation, digest ямар байх вэ? | Critical service request realtime; task/goal normal notification; noncritical daily digest; branch-local quiet hours; хэрэглэгч mute хийсэн ч legally/operationally mandatory notice-г тусдаа ангилах. | Салбарын менежерүүд |
| GMQ-083 | P0 | CEO, Manager, Entertainer AI assistant ямар data source болон tool ашиглаж болох вэ? | Role тус бүрд allowlist; reconciled/authorized data л ашиглах; answer бүр source period, freshness, missing data харуулах; create/update action-д preview ба human confirmation; rank, pay, penalty, termination, policy approve хийхгүй. | CEO, Техникийн эзэн, Хуульч |
| GMQ-084 | P0 | POS, CallPro, attendance, reservation, bank, E-Barimt өгөгдлөөс аль нь ямар утгын source of truth вэ? | Provider нь raw transaction/fact-ийн source; ERP/Frappe нь classification, approval, policy decision, reconciliation-ийн source. Conflict бүрт exception үүсгэж, source history-г устгахгүй. | Ерөнхий нягтлан, Техникийн эзэн |
| GMQ-085 | P0 | Employee, customer, financial, call, feedback, audit data-г хэдий хугацаанд хадгалж, хэн export/delete хийх вэ? | Data class бүрээр retention schedule батлах; legal hold болон audit evidence-г тусдаа; export purpose, approver, watermark/log; sensitive deletion-ийг workflow болон audit-тай хийх. | CEO, Хуульч, ХН |
| GMQ-086 | P1 | Pilot аль салбарт, ямар user group, хэдий хугацаанд, ямар амжилтын шалгуураар явах вэ? | Нэг төлөөлөх салбарт 4–6 долоо хоногийн pilot; Reception, Call Operator, Manager, Entertainer, Accounting оролцуулах; data completeness, task adoption, request response, reconciliation, settlement accuracy, user feedback гэсэн exit criteria ашиглах. | CEO, Салбарын менежер |
| GMQ-087 | P1 | Training, super-user, support desk, issue escalation, policy owner хэн байх вэ? | Салбар бүрт нэг super-user; company-level product owner/GM; technical support owner; P1/P2/P3 incident severity ба response target; training completion/acknowledgement бүртгэх. | CEO, Техникийн эзэн |
| GMQ-088 | P1 | System outage үед business continuity болон дараа нь backfill/reconciliation-ийг хэн удирдах вэ? | Reception, call, request, settlement бүрт approved manual fallback form; outage start/end log; restore дараа dual-control backfill; duplicate болон amount reconciliation; GM sign-off. | Салбарын менежер, Нягтлан, Техникийн эзэн |
| GMQ-089 | P0 | Бодлого, хувь, threshold, үнэ, privilege, penalty өөрчлөх workflow ямар байх вэ? | Draft, Review, Approved, Active, Superseded төлөв; owner, approver, effective date, branch scope, previous/new value, reason, notification, rollback/adjustment plan; finalized history-г дахин бичихгүй. | CEO, Ерөнхий нягтлан |
| GMQ-090 | P1 | Production release-ийг хэн зөвшөөрөх, rollback, support, acceptance evidence ямар байх вэ? | Business UAT sign-off-ыг GM, financial sign-off-ыг General Accountant, privacy/security sign-off-ыг холбогдох owner, technical readiness-ийг Technical Owner өгөх; rollback rehearsal, backup restore test, open-critical-issue = 0 гэсэн gate санал болгох. | CEO, Ерөнхий нягтлан, Техникийн эзэн |

## Баримт бичгийн аудитын үед илэрсэн шууд засварын ажил

Дараах зүйлс нь Ерөнхий менежерээс шинэ бодлогын хариулт авах шаардлагагүй, харин аль хэдийн сонгогдсон чиглэлтэй нийцүүлэн баримт бичгийг цэвэрлэх ажил юм:

1. **requirements-reconciliation.md** файлд manager target санал болгодог, гурван өдрийн өмнөх timing, тусдаа cashback гэсэн хүчингүй болсон тайлбар үлдсэн байна.
2. **stakeholder-discovery-questionnaire.md** болон Монгол хувилбарт зарим асуулт cashback гэсэн хуучин нэршил ашиглаж байна.
3. **process-32-benefit-cashback.bpmn** болон бусад хуучин BPMN урсгалыг нэг point ledger, anniversary review, privilege entitlement загварт шинэчлэх шаардлагатай.
4. 31 scaffold файлын owner, approved source, due date, completion criteria тодорхойгүй байна.
5. Project Status, Glossary, Source Priority, Assumptions, Policy Register, Current-State Architecture, Security, Audit, Data Dictionary, Retention, Test Strategy, Pilot Plan, Release Plan, Operations Runbook зэрэг суурь баримтыг audit болон батлагдсан ярилцлагын хариултаар гүйцээх шаардлагатай.

**Санал болгож буй шийдэл:** дээрх хуучин тайлбаруудыг шууд шинэ бодлого гэж ашиглахгүй; superseded гэж тэмдэглээд, энэ асуулгын батлагдсан хариулт бүрийг canonical requirement, decision register, clarification register, BPMN, test acceptance criteria-д нэг удаа тусгана.

## Ярилцлагын санал болгож буй дараалал

1. P0 байгууллага, эрх мэдэл, customer/service flow.
2. P0 ranking, compensation, membership economics.
3. P0 manager KPI, reward/penalty, privacy, data ownership.
4. P1 task, messaging, PWA, pilot, training, support.
5. Холбогдох CEO, Нягтлан, ХН, Хуульч, Техникийн эзний хамтарсан баталгаа.
6. Decision Register болон [Оролцогч талуудын тодруулгын бүртгэл](stakeholder-clarification-register-mn.md)-д батлагдсан хариултыг шилжүүлэх.

## Холбогдох баримт бичиг

- [Knowledge-Base Gap Analysis](knowledge-base-gap-analysis.md)
- [Functional Requirements](functional-requirements.md)
- [Business Process Catalog](business-processes.md)
- [Stakeholder Clarification Register — MN](stakeholder-clarification-register-mn.md)
- [Role Permission Matrix](03-roles/ROLE_PERMISSION_MATRIX.md)
- [Data and Domain Model](data-model.md)
- [Delivery Roadmap](roadmap.md)
