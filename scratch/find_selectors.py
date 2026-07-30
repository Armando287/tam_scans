import json
from bs4 import BeautifulSoup

def analyze_dump(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        html = f.read()
    
    soup = BeautifulSoup(html, 'html.parser')
    print(f"\n--- Analyzing {file_path} ---")
    
    # Check title
    title_el = soup.select_one("h1.element-title, .post-title h1, .infox h1, h1[itemprop='name'], .series-title, h1, .entry-title")
    print(f"Title: {title_el.text.strip() if title_el else 'NOT FOUND'}")
    
    # Check chapters
    chap_links = soup.select("ul.upload-list li a, .chapters-list li a, .chapter-list li a, .wp-manga-chapter a, #chapterlist li a, .eph-num a, .list-group-item a, .epcurlast")
    if not chap_links:
        chap_links = soup.select("a[href*='chapter'], a[href*='capitulo']")
    print(f"Chapters found: {len(chap_links)}")
    for a in chap_links[:3]:
        print(f" - {a.text.strip()} -> {a.get('href')}")

analyze_dump("scratch/dumps/manhwaweb.html")
analyze_dump("scratch/dumps/capibara.html")
