import cloudscraper
import time

scraper = cloudscraper.create_scraper()
img_url = "https://storage2.zonatmo.org/chapters/1010946/1.webp"

print("Downloading image...")
try:
    img_res = scraper.get(img_url, timeout=10)
    print("Status:", img_res.status_code)
    print("Length:", len(img_res.content))
except Exception as e:
    print("Error:", e)
