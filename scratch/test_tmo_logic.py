import cloudscraper
from bs4 import BeautifulSoup
import json

scraper = cloudscraper.create_scraper(browser={'browser': 'chrome', 'platform': 'windows', 'mobile': False})
res = scraper.get("https://capibaratraductor.com/senshimanga/manga/dandadan")
soup = BeautifulSoup(res.text, 'html.parser')

chapters_found = []
for el in soup.select("ul.upload-list li, .chapters-list li, .chapter-list li, .wp-manga-chapter, #chapterlist li, .eph-num, .list-group-item"):
    a_tag = el.select_one("a")
    if a_tag:
        c_title = a_tag.text.strip()
        c_url = a_tag.get("href")
        print(f"Testing a_tag: {c_title} | {c_url}")
        if c_title and c_url and c_url.startswith("http"):
            chapters_found.append({"title": c_title, "url": c_url})

print(f"Total chapters: {len(chapters_found)}")
