import re
import json

with open("scratch/dumps/capibara.html", "r", encoding="utf-8") as f:
    html = f.read()

# Buscamos un patron en el JSON
# En Next.js app router suele verse asi: "number":[0,241] o algo asi
# Mejor busquemos todas las menciones de capítulos.
chapters = []
# It looks like: "id":[0,43410],"number":[0,241],"title":[0,"El cortejo"]
# Sometimes just {"id":43410, "number":241, "title":"..."}

# Let's extract all instances of something resembling a chapter number
# Actually, if we look at the HTML, the URL is /senshimanga/manga/dandadan/chapters/241
# Are those URLs inside the script tag?
urls = re.findall(r'\\"/senshimanga/manga/dandadan/chapters/(\d+(\.\d+)?)\\"', html)
if not urls:
    urls = re.findall(r'"/senshimanga/manga/dandadan/chapters/(\d+(\.\d+)?)"', html)
if not urls:
    # Just look for the chapter IDs or numbers in the huge JSON string
    pass
    
print("URLs found via regex:", set([u[0] for u in urls]))

# Can we parse the JSON?
# Find <script> tags
from bs4 import BeautifulSoup
soup = BeautifulSoup(html, 'html.parser')
for s in soup.find_all('script'):
    if s.string and ('dandadan' in s.string or 'chapters' in s.string):
        text = s.string
        print("Found script containing chapters data! Length:", len(text))
        
        # We can extract chapter numbers
        numbers = re.findall(r'\\"number\\":\[0,(\d+(\.\d+)?)\]', text)
        if not numbers:
             numbers = re.findall(r'"number":\[0,(\d+(\.\d+)?)\]', text)
        if not numbers:
             numbers = re.findall(r'"number":(\d+(\.\d+)?)', text)
        
        print("Numbers found in this script:", len(set([n[0] for n in numbers])))
