# Liecinieks

Vizuāla lietotāja saskarnes (UI) testēšanas sistēma, kas izmanto pielāgotu
YOLO datorredzes modeli, nevis DOM selektorus, lai apgalvotu, ka konkrēti
UI elementi ir vai nav redzami uz lapas.

Sistēma sastāv no diviem komponentiem:

- **Liecinieks lietotne**, Electron + React + Playwright ierakstītājs, kas
  uztver lietotāja mijiedarbības mērķa mājaslapā un eksportē tās kā
  neatkarīgus Playwright testu failus.
- **Playwright izpildlaiks**, eksportētie testi izpildes laikā uzņem
  ekrānuzņēmumus, palaiž Python YOLO inferenci un salīdzina detekcijas
  ar scenārija pārbaudēm.

Demonstrācijas mājaslapa: <https://practicesoftwaretesting.com>, brīvi
pieejama e-komercijas demo lapa. Apmācītais modelis atpazīst 80 unikālus UI
marķējumus (skat. `yolo-data/data.yaml`).

## Kā tas strādā

Klasiska Playwright testēšana paļaujas uz DOM selektoriem
(`page.locator('.button-class')`), kas pārtrūkst pie jebkurām markup
izmaiņām. Liecinieks vietā balstās uz to, kā elements *izskatās* -
apmācīts YOLO modelis atpazīst UI elementu klases tieši no ekrānuzņēmuma,
un tests apgalvo, ka šī klase ir vai nav redzama paredzētajā vietā.

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
prasītais marķējums ir vai nav atrasts. Ja `verifyLocation: true`,
papildus pārbauda, vai detekcijas bbox pārklājas ar paredzēto
`expectedBbox` (IoU salīdzinājums ar slieksni 0.5).

## Mijiedarbības modelis (ierakstītājā)

- **Labais klikšķis** uz jebkura elementa atver marķējumu izvēlētāju -
  izvēlies marķējumu, un tas kļūst par "aktīvo" līdz sesijas beigām.
- **Tur Shift**, pie kursora parādās maza pile ar aktīvā marķējuma
  nosaukumu.
- **Shift + kreisais klikšķis**, ieraksta redzamības pārbaudi ar aktīvo
  marķējumu šim elementam.
- **Vienkāršs kreisais klikšķis**, normāla lapas mijiedarbība, ierakstīta
  kā navigācijas solis (ievades laukos atver teksta dialogu).

## Repozitorija struktūra

```
.
├── src/                              Liecinieks lietotnes pirmkods
│   ├── main.ts                       Electron ieejas punkts
│   ├── preload.ts                    contextBridge virsma
│   ├── renderer.tsx                  React ieejas punkts
│   ├── types.ts                      Kopīgie tipi (Step, Scenario, …)
│   ├── ipc-channels.ts               IPC kanāla konstantes
│   ├── main-modules/                 Main-procesa moduļi
│   │   ├── playwright-host.ts        Playwright dzīves cikls
│   │   ├── overlay.ts                JS, kas ievadīts mērķa lapā
│   │   ├── scenarios.ts              Scenāriju JSON I/O
│   │   ├── codegen.ts                Playwright eksportētājs
│   │   └── labels.ts                 CSV marķējumu lasītājs
│   └── renderer/                     React UI komponentes
│
├── scripts/
│   ├── dev.mjs                       Manuāls dev palaidējs
│   ├── generate-test-suite.ts        Ģenerē tests/playwright-suite-generated/
│   └── *.py                          YOLO modeļu analīzes utilītas
│
├── tests/playwright-suite/           Ar roku rakstīts Playwright komplekts
│   ├── 01-… spec.ts … 20-…spec.ts    20 testi
│   ├── liecinieks-runtime.ts         YOLO izpildlaiks
│   ├── liecinieks-inference.py       Python YOLO inferences skripts
│   └── README.md                     Komplekta apraksts
│
├── yolo-data/                        Mazie YOLO artefakti (CSV, YAML)
│   ├── labels.csv                    80 marķējumu CSV
│   ├── data.yaml                     Datu kopas konfigurācija
│   ├── model_comparison.csv          Modeļu salīdzinājums
│   └── test_results.csv              Apmācības rezultāti
│
├── forge.config.ts, vite.*.config.ts, tsconfig.json, package.json
└── index.html
```

Lielie artefakti (modeļa svari ~50 MB, apmācības attēli ~230 MB,
demonstrācijas video) paliek ārpus repozitorija. Svaru ceļš ir
iekodēts `tests/playwright-suite/liecinieks-config.ts`.

## Palaišana

```bash
npm install
python3 -m venv .venv
.venv/bin/pip install ultralytics            # nepieciešams eksportētajiem testiem
npm run dev                                  # NEvis npm start
```

`npm run dev` palaiž `scripts/dev.mjs`, kas pārbūvē `main.ts` + `preload.ts`
caur electron-forge, manuāli startē Vite uz 127.0.0.1:5173, gaida socket
piesaisti un tad palaiž Electron. **Nelieto `npm start`**, `electron-forge
start` ir salauzts šajā vidē (plugin-vite 7.11.1 + Electron 42 macOS
Sequoia iznīcina Vite tūlīt pēc Electron palaišanas; logs paliek tukšs).

Iepakotai būvei: `npm run package` → `out/app-darwin-arm64/Liecinieks.app`.

## Kā lietot

1. **Ielādēt modeli**, izvēlies YOLO `.pt` svaru failu un `yolo-data/labels.csv`
   (vai citu CSV ar `class_id, class_name` kolonnām).
2. **Jauns scenārijs**, iestati nosaukumu, mērķa URL (http(s)) un skata izmēru.
3. **Atvērt pārlūku un sākt ierakstu**, Playwright atver Chromium ar
   ievadītu pārklājuma skriptu.
4. **Veido scenāriju** caur Shift+klikšķa mijiedarbības modeli (skat. augstāk).
5. **Saglabāt scenāriju**, ieraksta JSON `<userData>/scenarios/`.
6. **Eksportēt Playwright testu…**, izvēlies mapi; lietotne ieraksta
   `<scenārijs>.spec.ts`, `liecinieks-runtime.ts` un `liecinieks-inference.py`.

## Palaist testus

```bash
cd tests/playwright-suite
npm install                                  # tikai pirmo reizi
npx playwright install chromium              # tikai pirmo reizi
LIECINIEKS_PYTHON=../../.venv/bin/python3 npm test
npm run report                               # atver HTML atskaiti
```

`LIECINIEKS_PYTHON` vides mainīgais norāda izpildlaikam, kuru Python lietot
YOLO inferencei. macOS šis ir obligāts, jo Homebrew Python ir
externally-managed (PEP 668), sistēmas `pip` nevar globāli instalēt
ultralytics.

Sīkāku informāciju par konkrētiem testiem skat. `tests/playwright-suite/README.md`.

## Pievienotā gaidīšanas loģika (`codegen.ts`)

Lai eksportētie testi būtu uzticami pret SPA mērķa lapām, codegen
automātiski iekļauj divas gaidīšanas:

- Pēc `page.goto`: `await page.waitForLoadState('networkidle')`, gaida
  SPA hidratāciju (Angular/React komponenšu uzlikšanu).
- Pēc katra klikšķa: `await page.waitForLoadState('networkidle', { timeout: 4000 })` -
  gaida XHR atbildes vai navigāciju, ar laika limitu lapām, kas
  nepārtraukti apmainās ar tīklu.

Šī loģika novērš lielāko daļu sākotnējās ielādes un pēc-klikšķa
sacensību. CSS pārejas un animācijas, kas nav saistītas ar tīklu,
joprojām var izrādīties problemātiskas, pilnam robustumam nepieciešams
bagātināt `Step` shēmu ar `waitAfter` lauku vai ierakstīt īpašus
`wait-for-selector` soļus.

## Mērogs

Šobrīd lietotne ir MVP demonstrācijai. Ārpus mēroga (skat. `../notes/app-dizains.md` §10):

- Daudzu skata izmēru atkārtošana no viena ieraksta (katrs ir savs scenārijs).
- Tikai-hover mijiedarbības (piem., izvēlnes, kas atveras tikai hover).
- DOM hibrīda atkāpšanās pārbaudēm (pārbaudes ir tīri vizuālas).
- Cross-browser Playwright izpilde (tikai Chromium).
- CI / mākoņa izvietošana.

## Vides mainīgie

| Mainīgais | Mērķis | Noklusētais |
|---|---|---|
| `LIECINIEKS_PYTHON` | Python interpretators ģenerētajiem testiem `liecinieks-inference.py` palaišanai | `python3` |
| `LIECINIEKS_DEVTOOLS` | Ja iestatīts, atver Electron DevTools palaišanas brīdī | nav iestatīts |
