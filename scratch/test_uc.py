import subprocess
import sys

try:
    import undetected_chromedriver as uc
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "undetected-chromedriver", "selenium"])
    import undetected_chromedriver as uc

options = uc.ChromeOptions()
options.headless = True
driver = uc.Chrome(options=options)

driver.get("https://mangasnosekai.com/manga/a-a-amigos-de-la-i-i-infancia/")
print(driver.title)
driver.quit()
