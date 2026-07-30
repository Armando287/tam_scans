from bs4 import BeautifulSoup
import re

with open("scratch/dumps/capibara.html", "r", encoding="utf-8") as f:
    html = f.read()

# Let's search the raw HTML for chapter numbers like "241"
for match in re.finditer(r'.{0,50}241.{0,50}', html):
    print("Match 241:", match.group(0))

for match in re.finditer(r'.{0,50}242.{0,50}', html):
    print("Match 242:", match.group(0))

print("\n--- Let's look for NEXT_DATA or API ---")
for match in re.finditer(r'api/.*?chapters?', html):
    print("API Match:", match.group(0))

soup = BeautifulSoup(html, "html.parser")
print(f"Total a tags: {len(soup.find_all('a'))}")
