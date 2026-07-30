from bs4 import BeautifulSoup

with open("scratch/dumps/capibara.html", "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), 'html.parser')

print("All links:")
for a in soup.find_all("a", href=True):
    href = a['href']
    if 'dandadan' in href and ('cap' in href or 'chapter' in href or '-' in href):
        print(href)
