# Liecinieks

Vizuāla lietotāja saskarnes (UI) testēšanas sistēma, kas izmanto pielāgotu
YOLO datorredzes modeli, nevis DOM selektorus, lai apgalvotu, ka konkrēti
UI elementi ir vai nav redzami uz lapas.

Sistēma sastāv no diviem komponentiem:

- **Liecinieks lietotne** Electron + React + Playwright ierakstītājs, kas
  uztver lietotāja mijiedarbības mērķa mājaslapā un eksportē tās kā
  neatkarīgus Playwright testu failus.
- **Playwright izpildlaiks** eksportētie testi izpildes laikā uzņem
  ekrānuzņēmumus, palaiž Python YOLO inferenci un salīdzina detekcijas ar
  scenārija pārbaudēm.

Demonstrācijas mājaslapa: <https://practicesoftwaretesting.com> brīvi
pieejama e-komercijas demo lapa. Apmācītais modelis atpazīst 80 unikālus UI
marķējumus uz šīs mājaslapas (skat. `yolo-training/yolo-training-data/data.yaml`).


## Quick start

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
