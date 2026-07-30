from DrissionPage import ChromiumPage, ChromiumOptions
import json
import re

co = ChromiumOptions()
co.set_argument('--headless')
page = ChromiumPage(co)

# Intercept network requests
page.listen.start('capibaratraductor.com')

url = "https://capibaratraductor.com/senshimanga/manga/dandadan"
print("Loading page...")
page.get(url)
page.wait.load_start()

print("Checking DOM for JSON data...")
html = page.html
if "__NEXT_DATA__" in html:
    print("Found NEXT_DATA!")
    
# Let's see if there is any window variable with chapters
script_tags = page.eles("t:script")
for s in script_tags:
    text = s.text
    if text and "chapters" in text.lower():
        print("Found script with 'chapters':")
        print(text[:200])

print("Waiting for network requests...")
page.wait(2)
for packet in page.listen.steps():
    if "api" in packet.request.url or "graphql" in packet.request.url or "chapter" in packet.request.url:
        print(f"API Call: {packet.request.url}")

page.quit()
