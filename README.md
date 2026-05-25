# Liecinieks

Vizuāla lietotāja saskarnes (UI) testēšanas sistēma, kas izmanto pielāgotu
YOLO datorredzes modeli, nevis DOM selektorus, lai apgalvotu, ka konkrēti
UI elementi ir vai nav redzami uz lapas.

Sistēma sastāv no diviem komponentiem:

- **Liecinieks lietotne** — Electron + React + Playwright ierakstītājs, kas
  uztver lietotāja mijiedarbības mērķa mājaslapā un eksportē tās kā
  neatkarīgus Playwright testu failus.
- **Playwright izpildlaiks** — eksportētie testi izpildes laikā uzņem
  ekrānuzņēmumus, palaiž Python YOLO inferenci un salīdzina detekcijas ar
  scenārija pārbaudēm.

Demonstrācijas mājaslapa: <https://practicesoftwaretesting.com> — brīvi
pieejama e-komercijas demo lapa. Apmācītais modelis atpazīst 80 unikālus UI
marķējumus uz šīs mājaslapas (skat. `yolo-training/yolo-training-data/data.yaml`).

## Repozitorija struktūra

```
.
├── app/                              Lietotnes pirmkods un dokumentācija
│   ├── app/                          Electron + Vite + React + TypeScript projekts
│   └── README.md                     Lietotnes apraksts un palaišana
│
├── yolo-training/                    YOLO apmācības dati
│   └── yolo-training-data/           Marķēti attēli un to anotācijas
│
├── yolo-results/                     Apmācītie modeļi un izvērtēšanas rezultāti
│   ├── runs/YOLOv12s/weights/best.pt Labākais modelis (mAP50-95 ≈ 0.94)
│   ├── runs/YOLOv8s/, YOLOv11s/, …   Salīdzinājuma modeļi
│   ├── labels.csv                    Marķējumu CSV (class_id, class_name)
│   ├── model_comparison.csv          Modeļu salīdzinājuma tabula
│   └── figures/                      Grafiki
│
├── tests/playwright-suite/           Ar roku rakstīts Playwright testu komplekts
│   ├── 01-…spec.ts … 20-…spec.ts     20 testi, kas pārklāj 50+ marķējumus
│   ├── liecinieks-runtime.ts         YOLO izpildlaiks (identisks eksportētajam)
│   ├── liecinieks-inference.py       Python YOLO inferences skripts + anotācija
│   └── README.md                     Komplekta apraksts
│
├── tests/playwright-suite-generated/ Lietotnes codegen tieši izveidots komplekts
│                                     (baitu identisks ierakstītāja eksportam)
│
├── scripts/
│   └── generate-test-suite.ts        Ģenerē augšminēto komplektu, izsaucot
│                                     lietotnes faktisko codegen.ts
│
└── for-yolo-demo/                    Video, kurā YOLO analizē katru kadru
    ├── output.mp4                    Pilnās izšķirtspējas anotētais video
    ├── output-compressed.mp4         7 MB demonstrācijas versija
    └── annotate_video.py             Video apstrādes skripts
```

## Kā tas strādā

Klasiska Playwright testēšana paļaujas uz DOM selektoriem (`page.locator('.button-class')`),
kas pārtrūkst pie jebkurām markup izmaiņām. Liecinieks vietā balstās uz to,
kā elements *izskatās* — apmācīts YOLO modelis atpazīst UI elementu klases
(pogu, ievades lauku, marķētu paneli) tieši no ekrānuzņēmuma, un tests
apgalvo, ka šī klase ir vai nav redzama paredzētajā vietā.

Eksportēta testa anatomija:

```ts
test("Pieteikties ar nederīgiem datiem", async ({ page }, testInfo) => {
  await page.goto("https://example.com/login", { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => undefined);

  await page.locator('[data-test="email"]').first().fill("nederigs@example.invalid");
  await page.locator('input[type="password"]').first().fill("nepareiza-parole");
  await page.locator('[data-test="login-submit"]').first().click();
  await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => undefined);

  await yoloAssertVisible(page, testInfo, {
    weights: WEIGHTS,
    labels: LABELS,
    label: "login_invalid_creds_err",
    verifyLocation: false,
    expectedBbox: { x: 0, y: 0, w: 0, h: 0 },
    iouThreshold: 0.5,
    negate: false,
  });
});
```

`yoloAssertVisible` uzņem ekrānuzņēmumu, palaiž `liecinieks-inference.py`
caur Python subprocess, saņem JSON ar visām detekcijām un pārbauda, vai
prasītais marķējums ir vai nav atrasts. Ja `verifyLocation: true`, papildus
pārbauda, vai detekcijas bbox pārklājas ar paredzēto `expectedBbox` (IoU
salīdzinājums ar slieksni 0.5).

## Mijiedarbības modelis (ierakstītājā)

- **Labais klikšķis** uz jebkura elementa atver marķējumu izvēlētāju —
  izvēlies marķējumu, un tas kļūst par "aktīvo" līdz sesijas beigām.
- **Tur Shift** — pie kursora parādās maza pile ar aktīvā marķējuma nosaukumu.
- **Shift + kreisais klikšķis** — ieraksta redzamības pārbaudi ar aktīvo
  marķējumu šim elementam.
- **Vienkāršs kreisais klikšķis** — normāla lapas mijiedarbība, ierakstīta
  kā navigācijas solis (ievades laukos atver teksta dialogu).

## Ātrais starts

### Liecinieks lietotne

```bash
cd app/app
npm install
python3 -m venv ../../.venv
../../.venv/bin/pip install ultralytics      # ~3 minūtes
npm run dev                                  # NEvis npm start
```

Detalizētus palaišanas norādījumus skatīt `app/app/README.md`.

### 20 testu palaišana

```bash
cd tests/playwright-suite
npm install                                  # tikai pirmo reizi
npx playwright install chromium              # tikai pirmo reizi
LIECINIEKS_PYTHON=$(pwd)/../../.venv/bin/python3 npm test
npm run report                               # atver HTML atskaiti
```

Pilna komplekta izpilde aizņem ~3 minūtes. Atskaitē ir anotēti
ekrānuzņēmumi katrai pārbaudei — kvadrātiņi, marķējumi un confidence
vērtības tieši virs mērķa elementiem.

### Lietotnes codegen pārbaude

```bash
node --experimental-strip-types scripts/generate-test-suite.ts

cd tests/playwright-suite-generated
npm install
LIECINIEKS_PYTHON=../../.venv/bin/python3 npm test
```

Tas izveido `tests/playwright-suite-generated/` 17 testus, izsaucot
lietotnes faktisko `codegen.ts`. Izvades faili ir **baitu identiski** tam,
ko ierakstītāja UI rakstītu caur *Export Playwright…*. Šis komplekts kalpo
par eksportētāja darba validāciju.

### Video kadru anotācija

```bash
.venv/bin/python3 for-yolo-demo/annotate_video.py \
  --video ~/Desktop/trimmed.mov \
  --weights yolo-results/runs/YOLOv12s/weights/best.pt \
  --output for-yolo-demo/output.mp4
```

Modelis tiek ielādēts vienreiz; pēc tam katrs ievades video kadrs tiek
apstrādāts un izvades video tiek rakstīts ar uzzīmētiem bbox.

## Galvenie artefakti

| Faila ceļš | Saturs |
|---|---|
| `yolo-results/runs/YOLOv12s/weights/best.pt` | Labākais apmācītais modelis (~6 MB) |
| `yolo-results/labels.csv` | 80 marķējumu CSV — pieprasīts lietotnes ielādei |
| `yolo-results/model_comparison.csv` | Visu 8 apmācīto modeļu salīdzinājums |
| `yolo-training/yolo-training-data/data.yaml` | YOLO datu kopas konfigurācija |
| `app/app/src/main-modules/codegen.ts` | Playwright testu ģenerators |
| `app/app/src/main-modules/overlay.ts` | UI pārklājums, kas tver klikšķus mērķa lapā |

## Pievienotā gaidīšanas loģika (`codegen.ts`)

Lai eksportētie testi būtu uzticami pret SPA mērķa lapām, codegen
automātiski iekļauj divas gaidīšanas:

- Pēc `page.goto`: `await page.waitForLoadState('networkidle')` — gaida SPA
  hidratāciju (Angular/React komponenšu uzlikšanu).
- Pēc katra klikšķa: `await page.waitForLoadState('networkidle', { timeout: 4000 })` —
  gaida XHR atbildes vai navigāciju, ar laika limitu lapām, kas nepārtraukti
  apmainās ar tīklu.

Šī loģika novērš lielāko daļu sākotnējās ielādes un pēc-klikšķa sacensību.
Mijiedarbības iznākumi, kas nav saistīti ar tīklu (CSS pārejas, lēnas
animācijas), joprojām var izrādīties problemātiski — šādiem gadījumiem
nepieciešams bagātināt `Step` shēmu ar `waitAfter` lauku vai ierakstīt īpašus
`wait-for-selector` soļus.

## Modeļa novērtējuma kopsavilkums

| Modelis | test mAP50 | test mAP50-95 | Precision | Recall |
|---|---|---|---|---|
| YOLOv5n | 0.937 | 0.799 | 0.829 | 0.894 |
| YOLOv5s | 0.974 | 0.894 | 0.913 | 0.952 |
| YOLOv8n | 0.969 | 0.858 | 0.865 | 0.937 |
| YOLOv8s | 0.980 | 0.919 | 0.925 | 0.949 |
| YOLOv11n | 0.964 | 0.856 | 0.872 | 0.922 |
| YOLOv11s | 0.975 | 0.915 | 0.907 | 0.962 |
| YOLOv12n | 0.974 | 0.891 | 0.891 | 0.926 |
| **YOLOv12s** | **0.975** | **0.938** | **0.940** | **0.956** |

YOLOv12s ir izvēlēts kā galvenais modelis demonstrācijai.

## Saistītā dokumentācija

- `app/README.md` — projekta kopsavilkums un ātrais starts
- `app/app/README.md` — Liecinieks lietotnes izstrādes norādījumi
- `tests/playwright-suite/README.md` — testu komplekta apraksts un izpildes norādījumi
