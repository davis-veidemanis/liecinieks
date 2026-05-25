# Liecinieks testu komplekts, practicesoftwaretesting.com

Divdesmit Playwright testi, no kuriem katrs izmēģina citu lietotāja plūsmu
un citu YOLO marķējumu grupu mērķa mājaslapā. Katra pārbaude pamatā palaiž
Python inferenci (`liecinieks-inference.py`) pret YOLOv12s modeli.

Statuss: visi 20 testi sekmīgi izpildās pret dzīvo mājaslapu (~3 min kopumā).

## Ko komplekts pārklāj

| # | Specs | Plūsma | YOLO marķējumu grupas |
|---|---|---|---|
| 01 | `01-homepage-smoke` | Ielādē `/` | logo, navigation_bar, banner, Sidebar, Search, Sort, product-container, product_image/name/price + ritināšana → Footer + negate (PDP / čats / grozs nav) |
| 02 | `02-pdp-visibility` | Klikšķis uz pirmā produkta | product_detail_page, pdp_specifications, pdp_product_description, 3× pdp_*_btn, pdp_item_count, pdp_product_tags + negate |
| 03 | `03-add-to-cart` | Pievieno produktu → groza lapa | cart_stages, cart_item, cart_quantity, cart_price, cart_total, cart_proceed_to_checkout_btn, cart_continue_shopping_btn |
| 04 | `04-cart-empty` | Atver tukšu grozu | Negate cart_item / cart_quantity / cart_price / cart_total + positive navigation_bar + Footer pēc ritināšanas |
| 05 | `05-contact-validation` | Tukšs Send → kļūdas pa laukiem | contact_us_form + 6 lauki + 4 kļūdu reģioni pēc iesniegšanas |
| 06 | `06-login-invalid-creds` | Nederīgi pieteikšanās dati | login_page, login_email, login_password, login_btn + login_invalid_creds_err pēc iesniegšanas |
| 07 | `07-language-switcher` | Lokalizācijas pārslēgs | language_nav + nav_locale_expanded pēc klikšķa |
| 08 | `08-chat-support` | Atver čata logrīku | Negate chat_assistant_open pirms / positive pēc |
| 09 | `09-header-annotations` | Ielādē `/` | documentation_banner (demo lapas anotācijas) |
| 10 | `10-nav-link-presence` | Ielādē `/` | Visas augšējās navigācijas saites: home_nav, categories_nav, contact_nav, sign_in_nav, language_nav |
| 11 | `11-homepage-sidebar` | Ielādē `/` | Sidebar + price_range (filtru sānjoslas reģions) |
| 12 | `12-product-card-co2` | Ielādē `/` | product_co2 (ilgtspējas nozīmīte uz katras kartītes) |
| 13 | `13-sort-expanded` | Izvēlas sort opciju | Sort pirms/pēc + negate sort_expanded |
| 14 | `14-login-with-google` | Ielādē `/auth/login` | login_with_google (OAuth poga) |
| 15 | `15-search-flow` | Ievada vaicājumu + iesniedz | Search, product-container, product_name uz rezultātiem |
| 16 | `16-pdp-related-products` | PDP ritināšana uz apakšu | pdp_related_products karuselis |
| 17 | `17-cart-item-removal` | Pievieno un noņem no groza | cart_product_deleted (tukšais stāvoklis) + negate (cart_item / cart_total / cart_remove_item pazūd) |
| 18 | `18-login-empty-validation` | Tukšs login submit | login_email_err + login_password_err pēc iesniegšanas |
| 19 | `19-forgot-password` | Klikšķis "Forgot Password?" | forgot_password_from + forgot_password_email |
| 20 | `20-pagination` | Sākumlapas ritināšana uz apakšu | page_count paginatora logrīks |

Testi numurēti, bet nav sakārtoti, katrs ir neatkarīgs un izveido savu
pārlūka kontekstu.

## Anotēti ekrānuzņēmumi katrā pārbaudē

Sākot ar dotā komplekta versiju, *katra* pārbaude (pozitīva vai negatīva)
pievieno HTML atskaitei anotētu PNG ar uzzīmētiem YOLO bbox, klases nosaukumu
un confidence vērtību virs katras detekcijas. Tas ļauj atskaitē redzēt tieši
to, ko modelis "redzēja" katrā solī. Krāsas ir stabilas pa klasēm, tas pats
marķējums vienmēr tiks atveidots ar to pašu toni.

Reāllaika izvadē katrai pārbaudei tiek izdrukāta arī viena rinda:
`✓ assert <marķējums> visible, model saw N regions (k× match …)`.

## Priekšnoteikumi

1. **Node 18+** Playwright vajadzībām.
2. **Python 3.10+** ar instalētu `ultralytics` (`pip install ultralytics`).
   Repozitorijas `.venv/bin/python3` jau ir gatavs.
3. **Apmācītie svari** atrodas `yolo-results/runs/YOLOv12s/weights/best.pt`
   un **marķējumu CSV** `yolo-results/labels.csv`. Abi ceļi ir iekodēti
   `liecinieks-config.ts`, rediģējiet to, ja faili pārvietoti.

## Pirmā palaišana

```bash
cd app/tests/playwright-suite
npm install                          # vienreizēji, instalē @playwright/test
npx playwright install chromium      # vienreizēji, lejupielādē Chromium
LIECINIEKS_PYTHON=../../../.venv/bin/python3 \
  npm test
```

`LIECINIEKS_PYTHON` vides mainīgais norāda izpildlaikam, kuru Python lietot
YOLO inferencei. Bez tā izpildlaiks atgriežas pie parastā `python3`, kas
macOS Homebrew Python gadījumā bieži kļūdās PEP 668 dēļ (sistēmā nav
ultralytics).

## Atskaites pārlūkošana

Pēc izpildes HTML atskaite atrodas `playwright-report/`:

```bash
npm run report                # atver atskaiti noklusētajā pārlūkā
```

Katrai pārbaudei tiek pievienots:

- `liecinieks-yolo-view-N-<marķējums>-pass/FAIL.png`, anotēts ekrānuzņēmums
  ar YOLO bbox, klases nosaukumiem un confidence vērtībām.

Neveiksmīgai pārbaudei papildus tiek pievienots:

- `liecinieks-screenshot-N.png`, neapstrādātais ekrānuzņēmums.
- `liecinieks-detections-N.json`, pilna detekciju saraksta un asserta opciju kopija.
