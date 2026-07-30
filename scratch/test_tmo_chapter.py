from DrissionPage import ChromiumPage, ChromiumOptions
import time
from bs4 import BeautifulSoup

co = ChromiumOptions()
co.set_argument('--headless')
page = ChromiumPage(co)

url = "https://zonatmo.org/view_uploads/1187422" # A random upload link from TMO (or we can find one)

# Let's get the manga page first to get a valid chapter link
page.get("https://zonatmo.org/library/manga/9521/dandadan")
time.sleep(2)
html = page.html
soup = BeautifulSoup(html, 'html.parser')
chaps = soup.select("a[href*='view_uploads']")
if chaps:
    chap_url = chaps[0].get("href")
    print("Found chapter URL:", chap_url)
    
    page.get(chap_url)
    time.sleep(3)
    
    # Did it redirect?
    print("Current URL:", page.url)
    
    # Are there images?
    imgs = page.eles("tag:img")
    print(f"Total images on page: {len(imgs)}")
    for img in imgs[:10]:
        print(img.attr('src') or img.attr('data-src'))
        
    # Check for cascade redirect
    if "paginated" in page.url:
        print("Redirected to paginated, switching to cascade...")
        page.get(page.url.replace("paginated", "cascade"))
        time.sleep(3)
        imgs = page.eles("tag:img")
        print(f"Total images on cascade: {len(imgs)}")

page.quit()
