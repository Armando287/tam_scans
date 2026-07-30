import customtkinter as ctk
from tkinter import messagebox
import cloudscraper
from bs4 import BeautifulSoup
import requests
import json
import os
from dotenv import load_dotenv
import threading
import concurrent.futures
import time
import subprocess
import sys

try:
    from DrissionPage import ChromiumPage, ChromiumOptions
except ImportError:
    print("Instalando DrissionPage...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "DrissionPage"])
    from DrissionPage import ChromiumPage, ChromiumOptions

# Load environment variables to get Supabase credentials
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_ANON_KEY = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")

class TMOScraperApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        
        self.title("Tam Scans - Importador de TMO (Python GUI)")
        self.geometry("900x700")
        
        # State
        self.session_token = None
        self.manga_data = None
        self.base_url = "http://localhost:3000"
        self.mangas_list = [] # List of dicts: {"id": "...", "title": "..."}
        
        # Layout Config
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)
        
        self.create_sidebar()
        self.create_main_frame()
        
    def create_sidebar(self):
        self.sidebar_frame = ctk.CTkFrame(self, width=250, corner_radius=0)
        self.sidebar_frame.grid(row=0, column=0, sticky="nsew")
        self.sidebar_frame.grid_rowconfigure(5, weight=1)
        
        self.logo_label = ctk.CTkLabel(self.sidebar_frame, text="Tam Scans Admin", font=ctk.CTkFont(size=20, weight="bold"))
        self.logo_label.grid(row=0, column=0, padx=20, pady=(20, 10))
        
        # Login Section
        self.login_label = ctk.CTkLabel(self.sidebar_frame, text="Iniciar Sesión", font=ctk.CTkFont(size=14, weight="bold"))
        self.login_label.grid(row=1, column=0, padx=20, pady=10)
        
        self.email_entry = ctk.CTkEntry(self.sidebar_frame, placeholder_text="Correo")
        self.email_entry.grid(row=2, column=0, padx=20, pady=5, sticky="ew")
        
        self.password_entry = ctk.CTkEntry(self.sidebar_frame, placeholder_text="Contraseña", show="*")
        self.password_entry.grid(row=3, column=0, padx=20, pady=5, sticky="ew")
        
        self.login_btn = ctk.CTkButton(self.sidebar_frame, text="Conectar", command=self.login)
        self.login_btn.grid(row=4, column=0, padx=20, pady=10, sticky="ew")
        
        self.status_label = ctk.CTkLabel(self.sidebar_frame, text="Estado: No conectado", text_color="gray")
        self.status_label.grid(row=5, column=0, padx=20, pady=10, sticky="n")
        
        # Settings
        self.api_url_label = ctk.CTkLabel(self.sidebar_frame, text="URL del Sitio Web:")
        self.api_url_label.grid(row=6, column=0, padx=20, pady=(10, 0), sticky="w")
        self.api_url_entry = ctk.CTkEntry(self.sidebar_frame, placeholder_text="http://localhost:3000")
        self.api_url_entry.insert(0, self.base_url)
        self.api_url_entry.grid(row=7, column=0, padx=20, pady=5, sticky="ew")

    def create_main_frame(self):
        self.main_frame = ctk.CTkFrame(self, corner_radius=10)
        self.main_frame.grid(row=0, column=1, padx=20, pady=20, sticky="nsew")
        self.main_frame.grid_columnconfigure(0, weight=1)
        self.main_frame.grid_rowconfigure(3, weight=1)
        
        # Scraper Section
        self.url_label = ctk.CTkLabel(self.main_frame, text="Importar Manga (TMO, YupManga, etc.)", font=ctk.CTkFont(size=18, weight="bold"))
        self.url_label.grid(row=0, column=0, padx=20, pady=(20, 5), sticky="w")
        
        self.manga_select_label = ctk.CTkLabel(self.main_frame, text="1. Selecciona el Manga de tu BD (o deja 'Crear Manga Nuevo'):")
        self.manga_select_label.grid(row=1, column=0, padx=20, pady=5, sticky="w")
        
        self.manga_select = ctk.CTkComboBox(self.main_frame, values=["[ Crear Manga Nuevo ]"], width=400)
        self.manga_select.grid(row=2, column=0, padx=20, pady=5, sticky="w")
        
        self.url_entry_label = ctk.CTkLabel(self.main_frame, text="2. Pega la URL del Manga:")
        self.url_entry_label.grid(row=3, column=0, padx=20, pady=5, sticky="w")
        
        self.url_entry = ctk.CTkEntry(self.main_frame, placeholder_text="Ej: https://mangasnosekai.com/manga/...", width=600)
        self.url_entry.grid(row=4, column=0, padx=20, pady=5, sticky="w")
        
        self.analyze_btn = ctk.CTkButton(self.main_frame, text="Analizar Manga", command=self.analyze_manga)
        self.analyze_btn.grid(row=5, column=0, padx=20, pady=10, sticky="w")
        
        # Details & Log Section
        self.tabview = ctk.CTkTabview(self.main_frame)
        self.tabview.grid(row=6, column=0, padx=20, pady=10, sticky="nsew")
        
        self.tabview.add("Información")
        self.tabview.add("Progreso (Log)")
        
        # Info Tab
        self.info_text = ctk.CTkTextbox(self.tabview.tab("Información"), state="disabled")
        self.info_text.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Log Tab
        self.log_text = ctk.CTkTextbox(self.tabview.tab("Progreso (Log)"), state="disabled")
        self.log_text.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Action Buttons
        self.action_frame = ctk.CTkFrame(self.main_frame, fg_color="transparent")
        self.action_frame.grid(row=7, column=0, padx=20, pady=20, sticky="e")
        
        self.upload_btn = ctk.CTkButton(self.action_frame, text="Subir Todo a BD", command=self.start_upload, state="disabled", fg_color="green", hover_color="darkgreen")
        self.upload_btn.pack(side="right")
        
        self.progress_bar = ctk.CTkProgressBar(self.main_frame)
        self.progress_bar.grid(row=8, column=0, padx=20, pady=(0, 20), sticky="ew")
        self.progress_bar.set(0)

    def log(self, message):
        self.log_text.configure(state="normal")
        self.log_text.insert("end", message + "\n")
        self.log_text.see("end")
        self.log_text.configure(state="disabled")

    def login(self):
        email = self.email_entry.get().strip()
        password = self.password_entry.get().strip()
        self.base_url = self.api_url_entry.get().strip()
        
        if not email or not password:
            messagebox.showerror("Error", "Debes ingresar correo y contraseña")
            return
            
        if not SUPABASE_URL or not SUPABASE_ANON_KEY:
            messagebox.showerror("Error", "No se encontraron las credenciales de Supabase en .env.local")
            return
            
        self.login_btn.configure(state="disabled", text="Conectando...")
        
        def _do_login():
            try:
                auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
                res = requests.post(auth_url, headers={
                    "apikey": SUPABASE_ANON_KEY,
                    "Content-Type": "application/json"
                }, json={
                    "email": email,
                    "password": password
                })
                
                data = res.json()
                if res.ok and "access_token" in data:
                    self.session_token = data["access_token"]
                    self.status_label.configure(text="Estado: Conectado ✅", text_color="green")
                    self.log("✅ Sesión iniciada correctamente (Supabase Auth).")
                    
                    # Fetch manga list
                    self.log("Obteniendo lista de mangas de la BD...")
                    mangas_res = requests.get(f"{self.base_url}/api/admin?action=mangas", headers={"Authorization": f"Bearer {self.session_token}"})
                    if mangas_res.ok:
                        self.mangas_list = mangas_res.json().get("mangas", [])
                        options = ["[ Crear Manga Nuevo ]"] + [m["title"] for m in self.mangas_list]
                        
                        def update_combo(opts=options):
                            self.manga_select.configure(values=opts)
                            self.manga_select.set(opts[0])
                            
                        self.after(0, update_combo)
                        
                        self.log(f"✅ {len(self.mangas_list)} mangas cargados en el selector.")
                    else:
                        self.log("⚠️ No se pudo obtener la lista de mangas.")
                        
                else:
                    err_msg = data.get("error_description", data.get("msg", "Error de credenciales"))
                    self.status_label.configure(text="Estado: Error ❌", text_color="red")
                    self.log(f"❌ Error al iniciar sesión: {err_msg}")
                    messagebox.showerror("Error", err_msg)
                    
            except Exception as e:
                self.log(f"❌ Error de red: {e}")
                self.status_label.configure(text="Estado: Error ❌", text_color="red")
                
            finally:
                self.login_btn.configure(state="normal", text="Conectar")
                
        threading.Thread(target=_do_login, daemon=True).start()

    def analyze_manga(self):
        url = self.url_entry.get().strip()
        if not url:
            messagebox.showerror("Error", "Ingresa una URL válida")
            return
            
        self.analyze_btn.configure(state="disabled", text="Analizando...")
        self.manga_data = None
        self.upload_btn.configure(state="disabled")
        self.progress_bar.set(0)
        self.log(f"[*] Obteniendo info de: {url}")
        
        def _do_scrape():
            page = None
            try:
                import cloudscraper
                from bs4 import BeautifulSoup
                
                scraper = cloudscraper.create_scraper()
                res = scraper.get(url, timeout=15)
                
                # Check if it failed or needs JS rendering
                use_dp = False
                if not res.ok:
                    self.log(f"⚠️ Fallo inicial ({res.status_code}). Intentando con modo avanzado...")
                    use_dp = True
                else:
                    soup = BeautifulSoup(res.text, 'html.parser')
                    test_chaps = soup.select("ul.upload-list li, .list-group-item, .wp-manga-chapter, .chapter-list li, .chapters-list li, .eph-num, .chapter-item, a[href*='/chapters/']")
                    if ("__NEXT_DATA__" in res.text or 'id="__next"' in res.text or "react" in res.text.lower()):
                        self.log(f"⚠️ Página dinámica detectada. Usando modo avanzado...")
                        use_dp = True
                    elif not test_chaps:
                        self.log(f"⚠️ No se encontraron capítulos. Intentando con modo avanzado...")
                        use_dp = True

                html = ""
                if use_dp:
                    co = ChromiumOptions()
                    co.set_argument('--headless')
                    co.set_argument('--no-sandbox')
                    co.set_argument('--disable-gpu')
                    page = ChromiumPage(co)
                    page.get(url)
                    time.sleep(3)
                    page.scroll.to_bottom()
                    time.sleep(1)
                    
                    
                    html = page.html
                else:
                    html = res.text
                    
                soup = BeautifulSoup(html, 'html.parser')
                
                # Title
                title_el = None
                for sel in ["h1.element-title", ".post-title h1", ".infox h1", "h1[itemprop='name']", ".series-title", ".entry-title"]:
                    title_el = soup.select_one(sel)
                    if title_el: break
                
                if not title_el:
                    for h1 in soup.select("h1"):
                        if h1.text.strip().lower() not in ["manga", "manhwa", "manhua", "comic", "novela", "doujinshi"]:
                            title_el = h1
                            break

                title = title_el.text.strip() if title_el else "Título Desconocido"
                
                # Description
                desc_el = soup.select_one("#manga-synopsis, .element-description, .summary__content, .entry-content, .desc, .description")
                description = desc_el.text.strip() if desc_el else ""
                
                # Author
                authors = []
                for a in soup.select("a[href*='author'], a[href*='filter_by=author'], .author-content a, .imptdt:contains('Author') a"):
                    authors.append(a.text.strip())
                author = ", ".join(authors) if authors else "Desconocido"
                
                # Cover
                cover_el = soup.select_one("img.book-thumbnail, .book-thumbnail img, .summary_image img, .thumb img, .series-cover img, .summary-image img, img.wp-post-image, .img-fluid")
                cover_url = cover_el.get("src") or cover_el.get("data-src") if cover_el else ""
                
                # Genres
                genres = [g.text.strip() for g in soup.select("a.badge-primary[href*='genders'], .genres-content a, .mgen a, .tags a, .genres a, a[href*='genre']")]
                
                # Chapters
                chapters_found = []
                
                def _extract_chaps(html_source):
                    s = BeautifulSoup(html_source, 'html.parser')
                    for el in s.select("ul.upload-list li, .list-group-item, .chapters-list li, .chapter-list li, .wp-manga-chapter, #chapterlist li, .eph-num, .chap-list li, .chapter-item, a[href*='/chapters/'], a[href*='capitulo'], a[href*='/chapter/']"):
                        a_tag = el if el.name == "a" else el.select_one("a")
                        if a_tag:
                            c_title = a_tag.text.strip()
                            c_url = a_tag.get("href")
                            
                            if not c_title:
                                c_title = ' '.join([t.strip() for t in a_tag.strings if t.strip()])
                            if not c_title and c_url:
                                m = re.search(r'(\d+(\.\d+)?)', c_url.split('/')[-1])
                                c_title = f"Capítulo {m.group(1)}" if m else "Capítulo Desconocido"
                                
                            if c_title and c_url:
                                if c_url.startswith("/"):
                                    from urllib.parse import urljoin
                                    c_url = urljoin(url, c_url)
                                if c_url.startswith("http") and not any(c['url'] == c_url for c in chapters_found):
                                    if not any(x in c_title.lower() for x in ["siguiente", "anterior", "next", "prev"]):
                                        chapters_found.append({"title": c_title, "url": c_url})

                # Initial extraction
                _extract_chaps(html)
                
                # If we used DrissionPage, also click tabs and extract iteratively
                if use_dp:
                    try:
                        tabs = page.eles('xpath://*[contains(text(), "-")]')
                        for t in tabs:
                            if re.match(r'\d+-\d+', t.text):
                                t.click(by_js=True)
                                time.sleep(1) # Wait for React render
                                _extract_chaps(page.html)
                    except: pass
                                    
                if not chapters_found:
                    for a_tag in soup.select("a[href*='view_uploads']"):
                        c_url = a_tag.get("href")
                        container = a_tag.find_parent("li")
                        if container:
                            num_el = container.select_one('.chapter-number')
                            c_title = num_el.text.strip() if num_el else None
                            if not c_title:
                                trunc_el = container.select_one('h4, .text-truncate')
                                c_title = trunc_el.text.strip() if trunc_el else None
                            c_title = c_title.split('\n')[0].strip() if c_title else "Capítulo"
                            if c_url and not any(c['url'] == c_url for c in chapters_found):
                                chapters_found.append({"title": c_title, "url": c_url})
                
                chapters_found.reverse()
                
                self.manga_data = {
                    "title": title,
                    "description": description,
                    "author": author,
                    "coverUrl": cover_url,
                    "genres": list(set(genres)),
                    "chapters": chapters_found
                }
                
                info_str = f"📚 Título: {title}\n✍️ Autor: {author}\n🏷️ Géneros: {', '.join(self.manga_data['genres'])}\n📖 Capítulos encontrados: {len(chapters_found)}\n"
                
                self.info_text.configure(state="normal")
                self.info_text.delete("1.0", "end")
                self.info_text.insert("end", info_str)
                self.info_text.configure(state="disabled")
                
                self.log(f"✅ ¡Extraídos {len(chapters_found)} capítulos de {title}!")
                self.upload_btn.configure(state="normal")
                self.tabview.set("Información")
                
            except Exception as e:
                self.log(f"❌ Error al raspar: {e}")
                messagebox.showerror("Error", f"Fallo al raspar: {e}")
            finally:
                if page:
                    page.quit()
                self.analyze_btn.configure(state="normal", text="Analizar Manga")
                
        threading.Thread(target=_do_scrape, daemon=True).start()

    def start_upload(self):
        if not self.session_token:
            messagebox.showerror("Error", "Primero debes Iniciar Sesión para subir a la Base de Datos")
            return
            
        if not self.manga_data or not self.manga_data["chapters"]:
            return
            
        self.upload_btn.configure(state="disabled")
        self.analyze_btn.configure(state="disabled")
        self.tabview.set("Progreso (Log)")
        self.log(f"\n🚀 INICIANDO SUBIDA A LA BASE DE DATOS...")
        
        def _do_upload():
            page = None
            try:
                headers = {
                    "Authorization": f"Bearer {self.session_token}",
                    "Content-Type": "application/json"
                }
                
                # 1. Obtenemos Manga Seleccionado
                selected_title = self.manga_select.get()
                manga_id = None
                existing_chapters = []
                
                if selected_title != "[ Crear Manga Nuevo ]":
                    manga_obj = next((m for m in self.mangas_list if m["title"] == selected_title), None)
                    if manga_obj:
                        manga_id = manga_obj["id"]
                        self.log(f"[1] Manga seleccionado de la BD: {selected_title}")
                        
                        chap_res = requests.get(f"{self.base_url}/api/admin?action=manga-chapters&mangaId={manga_id}", headers=headers)
                        if chap_res.ok:
                            existing_chapters = chap_res.json().get("existingChapters", [])
                else:
                    self.log("[1] Creando Nuevo Manga...")
                    manga_payload = {
                        "action": "create-manga",
                        "data": {
                            "title": self.manga_data["title"],
                            "description": self.manga_data["description"],
                            "author": self.manga_data["author"],
                            "coverUrl": self.manga_data["coverUrl"],
                            "genres": self.manga_data["genres"],
                            "status": "ongoing"
                        }
                    }
                    res = requests.post(f"{self.base_url}/api/admin", headers=headers, json=manga_payload)
                    manga_id = res.json().get("id")
                
                # Set of successfully uploaded chapters (prevents duplicate versions of the same chapter)
                successful_chapters = set(float(c) for c in existing_chapters)

                # 2. Descargar y Subir capítulos
                chapters = self.manga_data["chapters"]
                import cloudscraper
                scraper = cloudscraper.create_scraper()
                
                total_chapters = len(chapters)
                login_time = time.time()
                for i, chap in enumerate(chapters):
                    if time.time() - login_time > 3000: # 50 minutes
                        self.log("⏳ Renovando sesión para evitar expiración de token...")
                        auth_url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
                        email = self.email_entry.get().strip()
                        password = self.password_entry.get().strip()
                        try:
                            token_res = requests.post(auth_url, headers={"apikey": SUPABASE_ANON_KEY}, json={"email": email, "password": password})
                            if token_res.ok:
                                self.session_token = token_res.json().get("access_token")
                                headers["Authorization"] = f"Bearer {self.session_token}"
                                login_time = time.time()
                                self.log("✅ Sesión renovada con éxito.")
                            else:
                                self.log(f"⚠️ Fallo al renovar sesión: {token_res.text}")
                        except Exception as e:
                            self.log(f"⚠️ Excepción al renovar sesión: {e}")
                            
                    try:
                        self.progress_bar.set((i) / total_chapters)
                        import re
                        match = re.search(r"(\d+(\.\d+)?)", chap['title'])
                        chapter_number = match.group(1) if match else str(i+1)
                        
                        if float(chapter_number) in successful_chapters:
                            self.log(f"⏭️ Capítulo {chapter_number} ya subido. Saltando versión duplicada...")
                            continue
                            
                        self.log(f"[*] Analizando {chap['title']}")
                        
                        use_dp = False
                        try:
                            chapter_res = scraper.get(chap['url'], timeout=15)
                            if not chapter_res.ok:
                                use_dp = True
                            else:
                                chap_soup = BeautifulSoup(chapter_res.text, 'html.parser')
                                img_tags = chap_soup.select("#viewer-container img, .viewer-page img, .reading-content img, #readerarea img, .page-break img, .img-responsive, .vung-doc img, img.reader-image")
                                if not img_tags:
                                    use_dp = True
                        except:
                            use_dp = True
                            
                        images = []
                        if use_dp:
                            self.log(f"   -> Usando modo avanzado para extraer imágenes...")
                            co = ChromiumOptions()
                            co.set_argument('--headless')
                            co.set_argument('--no-sandbox')
                            co.set_argument('--disable-gpu')
                            page = ChromiumPage(co)
                            page.get(chap['url'])
                            time.sleep(2)
                            page.scroll.to_bottom()
                            time.sleep(1)
                            img_tags = page.eles("css:#viewer-container img, .viewer-page img, .reading-content img, #readerarea img, .page-break img, .vung-doc img, img.reader-image")
                            images = [img.attr("src") or img.attr("data-src") or img.attr("data-lazy-src") for img in img_tags if img.attr("src") or img.attr("data-src") or img.attr("data-lazy-src")]
                            page.quit()
                        else:
                            images = [img.get("data-src") or img.get("data-lazy-src") or img.get("src") for img in img_tags if img.get("src") or img.get("data-src") or img.get("data-lazy-src")]
                        
                        # Filter out logos and fix blocked ports (TMO sometimes uses :8091 which is blocked by ISPs)
                        import re
                        images = [re.sub(r':\d+/', '/', src) if src else None for src in images]
                        images = [src for src in images if src and src.startswith("http") and "logo" not in src.lower()]
                        
                        if not images:
                            self.log(f"⚠️ No se encontraron imágenes en {chap['title']}")
                            continue
                            
                        self.log(f"   -> Encontradas {len(images)} imágenes.")
                        
                        uploaded_pages = [None] * len(images)
                        
                        def _upload_image(idx, img_url):
                            retries = 3
                            last_error = ""
                            import urllib.parse
                            parsed = urllib.parse.urlparse(img_url)
                            import os
                            ext = os.path.splitext(parsed.path)[1].lower().replace(".", "")
                            if not ext or ext not in ["jpg", "jpeg", "png", "webp", "avif", "gif"]:
                                ext = "jpg"
                            temp_file = f"temp_chapter_{chapter_number}_page_{idx}.{ext}"

                            for attempt in range(retries):
                                try:
                                    img_res = scraper.get(img_url, timeout=30)
                                    if not img_res.ok:
                                        time.sleep(2)
                                        continue
                                        
                                    with open(temp_file, 'wb') as f:
                                        f.write(img_res.content)
                                            
                                    auth_header = {"Authorization": headers["Authorization"]}
                                    with open(temp_file, 'rb') as f:
                                        mime_type = f"image/{ext}" if ext != "jpg" else "image/jpeg"
                                        if ext == "avif": mime_type = "image/avif"
                                        files = {'file': (f"page_{idx}.{ext}", f, mime_type)}
                                        data = {
                                            "mangaId": manga_id,
                                            "chapterNumber": chapter_number,
                                            "pageIndex": str(idx),
                                            "fileType": "images"
                                        }
                                        
                                        up_res = requests.post(
                                            f"{self.base_url}/api/upload",
                                            headers=auth_header,
                                            files=files,
                                            data=data,
                                            timeout=60
                                        )
                                        
                                    try: os.remove(temp_file)
                                    except: pass
                                    
                                    if up_res.ok:
                                        uploaded_pages[idx] = up_res.json().get("url")
                                        return True
                                    else:
                                        last_error = f"Server error {up_res.status_code}: {up_res.text}"
                                except Exception as e:
                                    last_error = str(e)
                                    time.sleep(2)
                                    try: os.remove(temp_file)
                                    except: pass
                            
                            self.log(f"   ❌ Fallo definitivo en imagen {idx+1} tras {retries} intentos: {last_error}")
                            return False

                        import concurrent.futures
                        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                            futures = [executor.submit(_upload_image, j, img_url) for j, img_url in enumerate(images)]
                            concurrent.futures.wait(futures)
                        
                        uploaded_pages = [p for p in uploaded_pages if p is not None]
                        
                        if len(uploaded_pages) != len(images):
                            self.log(f"⚠️ {chap['title']} tiene imágenes corruptas o caídas. Saltando al siguiente episodio...")
                            continue
                        
                        if uploaded_pages:
                            requests.post(
                                f"{self.base_url}/api/admin",
                                headers=headers,
                                json={
                                    "action": "create-chapter",
                                    "data": {
                                        "manga_id": manga_id,
                                        "title": chap['title'],
                                        "number": float(chapter_number),
                                        "pages": uploaded_pages
                                    }
                                }
                            )
                            successful_chapters.add(float(chapter_number))
                            self.log(f"✅ {chap['title']} importado.")
                    except Exception as e:
                        self.log(f"⚠️ Error inesperado en {chap['title']}, saltando al siguiente: {e}")
                        continue
                            
                self.progress_bar.set(1.0)
                self.log("\n🎉 ¡PROCESO DE IMPORTACIÓN MASIVA FINALIZADO! 🎉")
                messagebox.showinfo("Éxito", "Todos los capítulos han sido subidos a la base de datos.")
                
            except Exception as e:
                self.log(f"❌ ERROR FATAL: {e}")
                messagebox.showerror("Error", str(e))
            finally:
                if 'page' in locals() and page:
                    page.quit()
                self.upload_btn.configure(state="normal")
                self.analyze_btn.configure(state="normal")
                
        threading.Thread(target=_do_upload, daemon=True).start()


if __name__ == "__main__":
    app = TMOScraperApp()
    app.mainloop()
