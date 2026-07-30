import cloudscraper
from bs4 import BeautifulSoup

scraper = cloudscraper.create_scraper()
url = "https://zonatmo.org/view_uploads/1010946"
res = scraper.get(url)
soup = BeautifulSoup(res.text, 'html.parser')
imgs = soup.find_all("img")
print(f"Total img tags: {len(imgs)}")
for img in imgs[:10]:
    print("SRC:", img.get("src") or img.get("data-src"))
    print("Class:", img.get("class"))
