import requests
from bs4 import BeautifulSoup

res = requests.get('https://capibaratraductor.com/dnfansub/manga/one-piece')
soup = BeautifulSoup(res.text, 'html.parser')

desc = soup.select_one('meta[name="description"]')
if desc:
    print("Description Meta:", desc.get('content'))

genres = soup.select('a[href*="/genres/"]')
print("Genres Meta:", [g.text for g in genres])

# Looking for description inside the page body
p_tags = soup.select('p')
for p in p_tags:
    text = p.text.strip()
    if len(text) > 50:
        print("Possible description:", text[:100], "...")
        break
