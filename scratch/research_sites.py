import cloudscraper
from bs4 import BeautifulSoup
import json

scraper = cloudscraper.create_scraper()

urls = [
    ("yupmanga", "https://www.yupmanga.com/series.php?id=SN5NGK3C9YS6X"),
    ("mangasnosekai", "https://mangasnosekai.com/manga/a-a-amigos-de-la-i-i-infancia/"),
    ("manhwaweb", "https://manhwaweb.com/manhwa/mi-maid-se-parece-a-la-chica-de-mi-clase-que-me-gusta_1785117228763")
]

results = {}

for name, url in urls:
    try:
        res = scraper.get(url)
        soup = BeautifulSoup(res.text, 'html.parser')
        
        # We need to figure out where the chapter links are.
        # Generally they are in <ul> or <div> with classes like 'chapter-list', 'episodes', etc.
        # Let's extract all <a> tags that look like they point to chapters
        links = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            text = a.get_text(strip=True)
            if 'cap' in text.lower() or 'chapter' in text.lower() or 'episode' in text.lower() or 'leer' in text.lower() or 'ch.' in text.lower() or text.replace('.','').isdigit():
                if href not in [l['href'] for l in links]:
                    links.append({"text": text, "href": href})
        
        results[name] = {
            "status": res.status_code,
            "title": soup.title.string if soup.title else None,
            "sample_links": links[:10]  # Just grab the first 10 matching links
        }
    except Exception as e:
        results[name] = {"error": str(e)}

with open('scratch/scrape_research.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)
