from DrissionPage import ChromiumPage, ChromiumOptions
from bs4 import BeautifulSoup
import time

co = ChromiumOptions()
co.set_argument('--headless')
page = ChromiumPage(co)

url = "https://capibaratraductor.com/senshimanga/manga/dandadan"
print(f"Fetching {url}")
page.get(url)
time.sleep(3)
html = page.html

soup = BeautifulSoup(html, 'html.parser')

chapters_found = []
# Broad search for testing
for a in soup.find_all("a", href=True):
    href = a['href']
    if 'dandadan' in href and 'chapter' in href:
        print(f"Found RAW link: {a.text.strip()} -> {href}")
        chapters_found.append({"title": a.text.strip(), "url": href})

print(f"\nSelector check:")
for el in soup.select("li.wp-manga-chapter a, .chapter-item a, .chapters-list a, .eph-num a"):
    print(f"Found via selector: {el.text.strip()} -> {el.get('href')}")
    
page.quit()
