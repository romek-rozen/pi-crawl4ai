# AGENTS.md — crawl4ai extension

Ten katalog zawiera rozszerzenie pi dla Crawl4AI. Pracuj tu ostrożnie: to nie jest osobna aplikacja, tylko plugin ładowany przez pi.

## Cel

- crawl4ai = narzędzie do crawlownia stron WWW dla pi
- cache Crawl4AI ma być projektowy: `./.crawl4ai/`
- pełne wyniki crawlów zapisujemy do `./.crawl4ai/outputs/<domain>/<format>/`
- w odpowiedzi inline pokazujemy tylko ścieżkę do pliku; jeśli trzeba, używa się `read`

## Najważniejsze zasady

1. **Nie zapisuj outputów do kodu wtyczki.**
   - kod w `/.pi/extensions/crawl4ai/`
   - dane robocze i wyniki w `/.crawl4ai/`
2. **Cache i outputy są oddzielone.**
   - cache/robots/db → `./.crawl4ai/`
   - full crawl output → `./.crawl4ai/outputs/`
3. **Nie pokazuj pełnych wyników inline.**
   - agent ma dostać tylko path
   - jeśli chce treść, niech użyje `read`
4. **`output_format=json` wymaga ekstrakcji.**
   - potrzebne jest `json_extract` albo `schema_path`
   - bez tego zwróć czytelny błąd zamiast uruchamiać crawl
5. **`cache_mode` domyślnie aktywny.**
   - ustawiamy `cache_mode=enabled`
   - `bypass_cache: true` tylko gdy użytkownik tego chce
6. **Zachowaj kompatybilność z pi.**
   - edytuj ostrożnie `tool.ts`, `resolve.ts`, `args.ts`
   - po zmianach sprawdzaj, czy extension dalej się ładuje po `/reload`

## Konwencje outputu

Docelowy path dla jednego crawl:

`./.crawl4ai/outputs/{nazwa-domeny}/{format}/{YYYY-MM-DD-HH-mm}-{url-slug}.{ext}`

Przykład:

`./.crawl4ai/outputs/ibb.media/markdown-fit/2026-04-23-00-15-home.md`

### Normalizacja

- `www.ibb.media` → `ibb.media`
- path i query URL-a muszą być zamienione na bezpieczny slug
- unikaj znaków specjalnych w nazwach plików

## Przy edycji plików

- `tool.ts` — główna logika wykonania, walidacja inputu, zapis outputu
- `resolve.ts` — ścieżki, slugowanie, output path helpers
- `args.ts` — mapowanie parametrów na flagi CLI
- `commands.ts` — komendy użytkownika
- `README.md` — zawsze aktualizuj, jeśli zmieniasz zachowanie

## Checklista po zmianach

- [ ] czy `json` bez `json_extract/schema_path` zwraca czytelny błąd?
- [ ] czy output zapisuje się do `./.crawl4ai/outputs/`?
- [ ] czy nie ma już `/tmp` jako domyślnego miejsca na full output?
- [ ] czy `resolve.ts` ma poprawną normalizację URL path (`/+/g`)?
- [ ] czy po zmianach pi ładuje extension bez błędów po `/reload`?

## Szybka walidacja

Jeśli masz dostęp do TypeScript:

```bash
tsc -v
node -e "..."
```

Jeśli nie, sprawdź składnię przez szybki transpile lub po prostu przeładuj pi i odpal crawl testowy.

## Notatka operacyjna

Gdy musisz zmienić zachowanie dla usera, preferuj:
- krótki, jasny komunikat błędu
- brak zgadywania
- zapis wyniku do pliku zamiast zalewania TUI
