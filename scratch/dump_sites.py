import cloudscraper
import os

scraper = cloudscraper.create_scraper(browser={'browser': 'chrome', 'platform': 'windows', 'mobile': False})

urls = {
    "manhwaweb": "https://manhwaweb.com/manhwa/trastornos-del-estado-de-animo_1775546801308",
    "capibara": "https://capibaratraductor.com/senshimanga/manga/dandadan",
    "mangasnosekai": "https://mangasnosekai.com/manga/a-a-amigos-de-la-i-i-infancia/"
}

os.makedirs("scratch/dumps", exist_ok=True)

for name, url in urls.items():
    try:
        print(f"Fetching {name}...")
        res = scraper.get(url, timeout=15)
        with open(f"scratch/dumps/{name}.html", "w", encoding="utf-8") as f:
            f.write(res.text)
        print(f"Status {name}: {res.status_code}")
    except Exception as e:
        print(f"Error {name}: {e}")
