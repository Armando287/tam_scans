import requests

url1 = "https://storage.zonatmo.org:8091/chapters/976388/d9fbf02cab15824f225c252b6a294138.jpg"
url2 = "https://storage.zonatmo.org/chapters/976388/d9fbf02cab15824f225c252b6a294138.jpg"

print("Testing port 8091...")
try:
    r = requests.head(url1, timeout=5)
    print("Port 8091 OK:", r.status_code)
except Exception as e:
    print("Port 8091 Failed:", e)

print("Testing port 443...")
try:
    r = requests.head(url2, timeout=5)
    print("Port 443 OK:", r.status_code)
except Exception as e:
    print("Port 443 Failed:", e)
