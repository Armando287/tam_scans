import re
import time
from DrissionPage import ChromiumPage, ChromiumOptions
from bs4 import BeautifulSoup

co = ChromiumOptions()
co.set_argument('--headless')
page = ChromiumPage(co)

url = "https://capibaratraductor.com/senshimanga/manga/dandadan"
print("Loading...")
page.get(url)
page.wait.load_start()
time.sleep(2)

print("Before click, a tags:", len(page.html))
tabs = page.eles('tag:button')
clicked = 0
for t in tabs:
    text = t.text
    if text and re.match(r'^\d+-\d+$', text.strip()):
        print("Clicking tab:", text)
        try:
            t.click(by_js=True)
            time.sleep(0.5)
            clicked += 1
        except Exception as e:
            print("Failed to click:", e)

print(f"Clicked {clicked} tabs. Wait a bit for react...")
time.sleep(2)

html = page.html
soup = BeautifulSoup(html, 'html.parser')
chapters = soup.select("a[href*='/chapters/']")
print(f"Found {len(chapters)} chapter links!")

unique = set()
for c in chapters:
    unique.add(c.get('href'))
print(f"Unique chapters: {len(unique)}")
page.quit()
