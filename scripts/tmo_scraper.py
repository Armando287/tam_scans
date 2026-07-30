import argparse
import json
import cloudscraper
from bs4 import BeautifulSoup
import sys

def get_scraper():
    # Using cloudscraper to bypass Cloudflare
    return cloudscraper.create_scraper(
        browser={
            'browser': 'chrome',
            'platform': 'windows',
            'desktop': True
        }
    )

def scrape_manga(url):
    scraper = get_scraper()
    print(f"[*] Fetching manga data from: {url}", file=sys.stderr)
    try:
        response = scraper.get(url)
        response.raise_for_status()
    except Exception as e:
        print(f"[!] Error fetching URL: {e}", file=sys.stderr)
        return {"error": str(e)}

    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Title
    title_el = soup.select_one("h1.element-title")
    title = title_el.text.strip() if title_el else "Título Desconocido"
    
    # Cover
    cover_el = soup.select_one("img.book-thumbnail, .book-thumbnail img")
    cover_url = cover_el.get("src", "") if cover_el else ""
    
    # Description
    desc_el = soup.select_one("#manga-synopsis, .element-description")
    description = desc_el.text.strip() if desc_el else ""
    
    # Author
    authors = []
    for a in soup.select("a[href*='filter_by=author']"):
        authors.append(a.text.strip())
    author = ", ".join(authors)
    
    # Genres
    genres = []
    for g in soup.select("a.badge-primary[href*='genders']"):
        genres.append(g.text.strip())
        
    # Chapters
    chapters_found = []
    
    # Method 1: standard lists
    for li in soup.select("ul.upload-list li, .chapters-list li, .chapter-list li"):
        a_tag = li.select_one("a")
        if a_tag:
            c_title = a_tag.text.strip()
            c_url = a_tag.get("href")
            if c_title and c_url:
                chapters_found.append({"title": c_title, "url": c_url})
                
    # Method 2: view_uploads links (if Method 1 failed)
    if not chapters_found:
        for a_tag in soup.select("a[href*='view_uploads']"):
            c_url = a_tag.get("href")
            # Find closest li container
            container = a_tag.find_parent("li")
            if container:
                num_el = container.select_one('.chapter-number')
                c_title = num_el.text.strip() if num_el else None
                
                if not c_title:
                    trunc_el = container.select_one('h4, .text-truncate')
                    c_title = trunc_el.text.strip() if trunc_el else None
                    
                if c_title:
                    c_title = c_title.split('\n')[0].strip()
                else:
                    c_title = "Capítulo"
                    
                if c_url and not any(c['url'] == c_url for c in chapters_found):
                    chapters_found.append({"title": c_title, "url": c_url})
                    
    # Reverse so Chapter 1 is first
    chapters_found.reverse()
    
    return {
        "title": title,
        "coverUrl": cover_url,
        "description": description,
        "author": author,
        "genres": genres,
        "chapters": chapters_found,
        "source": "zonatmo",
        "url": url
    }

def scrape_chapter(url):
    scraper = get_scraper()
    print(f"[*] Fetching chapter images from: {url}", file=sys.stderr)
    try:
        response = scraper.get(url)
        response.raise_for_status()
    except Exception as e:
        print(f"[!] Error fetching URL: {e}", file=sys.stderr)
        return {"error": str(e)}

    soup = BeautifulSoup(response.text, 'html.parser')
    images = []
    
    for img in soup.find_all('img'):
        src = img.get('src') or img.get('data-src')
        if src and 'avatar' not in src and 'storage' in src:
            images.append(src)
            
    return {"images": images}

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ZonaTMO Scraper en Python (Bypass Cloudflare)")
    parser.add_argument("--manga", type=str, help="URL del manga para extraer información y lista de capítulos")
    parser.add_argument("--chapter", type=str, help="URL de un capítulo para extraer las imágenes")
    parser.add_argument("--out", type=str, help="Archivo JSON de salida (opcional). Si no se especifica, imprime en pantalla.")
    
    args = parser.parse_args()
    
    if args.manga:
        data = scrape_manga(args.manga)
    elif args.chapter:
        data = scrape_chapter(args.chapter)
    else:
        print("Debes especificar --manga o --chapter", file=sys.stderr)
        sys.exit(1)
        
    result_json = json.dumps(data, indent=2, ensure_ascii=False)
    
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(result_json)
        print(f"[*] Resultados guardados en {args.out}", file=sys.stderr)
    else:
        print(result_json)
