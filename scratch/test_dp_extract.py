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

unique = set()

def extract_current():
    html = page.html
    soup = BeautifulSoup(html, 'html.parser')
    for c in soup.select("a[href*='/chapters/']"):
        unique.add(c.get('href'))

extract_current()

tabs = page.eles('tag:button')
for t in tabs:
    text = t.text
    if text and re.match(r'^\d+-\d+$', text.strip()):
        print("Clicking tab:", text)
        try:
            t.click(by_js=True)
            time.sleep(0.5)
            extract_current()
        except:
            pass

print(f"Total unique chapters found: {len(unique)}")
page.quit()
