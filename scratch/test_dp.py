import subprocess
import sys

try:
    from DrissionPage import ChromiumPage
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "DrissionPage"])
    from DrissionPage import ChromiumPage

page = ChromiumPage()
page.get("https://mangasnosekai.com/manga/a-a-amigos-de-la-i-i-infancia/")
print(page.title)

page.get("https://manhwaweb.com/manhwa/trastornos-del-estado-de-animo_1775546801308")
page.wait.load_start()
print(page.title)
print(len(page.eles("t:a")))
page.quit()
