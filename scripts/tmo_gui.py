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
        self.url_label = ctk.CTkLabel(self.main_frame, text="Importar desde ZonaTMO", font=ctk.CTkFont(size=18, weight="bold"))
        self.url_label.grid(row=0, column=0, padx=20, pady=(20, 5), sticky="w")
        
        self.manga_select_label = ctk.CTkLabel(self.main_frame, text="1. Selecciona el Manga de tu BD (o deja 'Crear Manga Nuevo'):")
        self.manga_select_label.grid(row=1, column=0, padx=20, pady=5, sticky="w")
        
        self.manga_select = ctk.CTkComboBox(self.main_frame, values=["[ Crear Manga Nuevo ]"], width=400)
        self.manga_select.grid(row=2, column=0, padx=20, pady=5, sticky="w")
        
        self.url_entry_label = ctk.CTkLabel(self.main_frame, text="2. Pega la URL de ZonaTMO:")
        self.url_entry_label.grid(row=3, column=0, padx=20, pady=5, sticky="w")
        
        self.url_entry = ctk.CTkEntry(self.main_frame, placeholder_text="Ej: https://zonatmo.org/library/manga/...", width=600)
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
        if not url or "zonatmo" not in url:
            messagebox.showerror("Error", "Ingresa una URL válida de ZonaTMO")
            return
            
        self.analyze_btn.configure(state="disabled", text="Analizando...")
        self.manga_data = None
        self.upload_btn.configure(state="disabled")
        self.progress_bar.set(0)
        self.log(f"[*] Obteniendo info de: {url}")
        
        def _do_scrape():
            try:
                scraper = cloudscraper.create_scraper()
                res = scraper.get(url)
                res.raise_for_status()
                
                soup = BeautifulSoup(res.text, 'html.parser')
                
                # Title
                title_el = soup.select_one("h1.element-title")
                title = title_el.text.strip() if title_el else "Título Desconocido"
                
                # Description
                desc_el = soup.select_one("#manga-synopsis, .element-description")
                description = desc_el.text.strip() if desc_el else ""
                
                # Author
                authors = []
                for a in soup.select("a[href*='filter_by=author']"):
                    authors.append(a.text.strip())
                author = ", ".join(authors)
                
                # Cover
                cover_el = soup.select_one("img.book-thumbnail, .book-thumbnail img")
                cover_url = cover_el.get("src", "") if cover_el else ""
                
                # Genres
                genres = [g.text.strip() for g in soup.select("a.badge-primary[href*='genders']")]
                
                # Chapters
                chapters_found = []
                
                for li in soup.select("ul.upload-list li, .chapters-list li, .chapter-list li"):
                    a_tag = li.select_one("a")
                    if a_tag:
                        c_title = a_tag.text.strip()
                        c_url = a_tag.get("href")
                        if c_title and c_url:
                            chapters_found.append({"title": c_title, "url": c_url})
                            
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
                                
                chapters_found.reverse() # Order Ascending
                
                self.manga_data = {
                    "title": title,
                    "description": description,
                    "author": author,
                    "coverUrl": cover_url,
                    "genres": genres,
                    "chapters": chapters_found
                }
                
                info_str = f"📚 Título: {title}\n"
                info_str += f"✍️ Autor: {author}\n"
                info_str += f"🏷️ Géneros: {', '.join(genres)}\n"
                info_str += f"📖 Capítulos encontrados: {len(chapters_found)}\n\n"
                info_str += f"📄 Sinopsis:\n{description[:300]}..."
                
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
                    # Find manga ID
                    manga_obj = next((m for m in self.mangas_list if m["title"] == selected_title), None)
                    if manga_obj:
                        manga_id = manga_obj["id"]
                        self.log(f"[1] Manga seleccionado de la BD: {selected_title} (ID: {manga_id})")
                        
                        # Fetch existing chapters for this manga
                        self.log(f"-> Verificando qué capítulos ya están subidos...")
                        chap_res = requests.get(f"{self.base_url}/api/admin?action=manga-chapters&mangaId={manga_id}", headers=headers)
                        if chap_res.ok:
                            existing_chapters = chap_res.json().get("existingChapters", [])
                            self.log(f"-> {len(existing_chapters)} capítulos encontrados en la BD para omitir.")
                        else:
                            self.log("⚠️ Fallo al obtener capítulos existentes. Puede que se intenten subir duplicados.")
                            
                        # Opcional: Actualizar datos del manga
                        update_payload = {
                            "action": "update-manga",
                            "id": manga_id,
                            "data": {
                                "description": self.manga_data["description"],
                                "author": self.manga_data["author"],
                                "coverUrl": self.manga_data["coverUrl"],
                                "genres": self.manga_data["genres"]
                            }
                        }
                        requests.post(f"{self.base_url}/api/admin", headers=headers, json=update_payload)
                else:
                    # Crear nuevo manga
                    self.log("[1] Creando Nuevo Manga en la Base de Datos...")
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
                    if not res.ok:
                        raise Exception(f"Fallo al crear manga: {res.text}")
                    manga_id = res.json().get("id")
                    self.log(f"✅ Manga creado con ID: {manga_id}")
                
                # 2. Descargar y Subir capítulos
                chapters = self.manga_data["chapters"]
                scraper = cloudscraper.create_scraper()
                total_chapters = len(chapters)
                
                for i, chap in enumerate(chapters):
                    self.progress_bar.set((i) / total_chapters)
                    
                    # Extract chapter number
                    import re
                    match = re.search(r"(\d+(\.\d+)?)", chap['title'])
                    chapter_number = match.group(1) if match else str(i+1)
                    
                    # Verificamos si ya existe el capítulo
                    if float(chapter_number) in existing_chapters:
                        self.log(f"⏩ Omitiendo {chap['title']}, ya está subido.")
                        continue
                        
                    self.log(f"[*] Analizando {chap['title']} ({i+1}/{total_chapters})")
                    
                    # Fetch images
                    chap_res = scraper.get(chap['url'])
                    chap_soup = BeautifulSoup(chap_res.text, 'html.parser')
                    
                    images = []
                    for img in chap_soup.find_all('img'):
                        src = img.get('src') or img.get('data-src')
                        if src and 'avatar' not in src and 'storage' in src:
                            images.append(src)
                            
                    if not images:
                        self.log(f"⚠️ No se encontraron imágenes en {chap['title']}")
                        continue
                        
                    self.log(f"   -> Encontradas {len(images)} imágenes. Subiéndolas a Storage...")
                    
                    # Upload images concurrently
                    uploaded_pages = [None] * len(images)
                    
                    def _upload_image(idx, url):
                        retries = 3
                        ext = "jpg"
                        if ".png" in url.lower(): ext = "png"
                        elif ".webp" in url.lower(): ext = "webp"
                        temp_file = f"temp_chapter_{chapter_number}_page_{idx}.{ext}"

                        for attempt in range(retries):
                            try:
                                # 1. Download locally
                                img_res = scraper.get(url, stream=True, timeout=30)
                                if not img_res.ok:
                                    self.log(f"   ⚠️ Fallo descarga img {idx+1} (Intento {attempt+1})")
                                    time.sleep(2)
                                    continue
                                    
                                with open(temp_file, 'wb') as f:
                                    for chunk in img_res.iter_content(chunk_size=8192):
                                        f.write(chunk)
                                        
                                # 2. Upload to server
                                auth_header = {"Authorization": headers["Authorization"]}
                                with open(temp_file, 'rb') as f:
                                    mime_type = f"image/{ext}" if ext != "jpg" else "image/jpeg"
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
                                    
                                # 3. Cleanup
                                try:
                                    os.remove(temp_file)
                                except: pass
                                
                                if up_res.ok:
                                    uploaded_pages[idx] = up_res.json().get("url")
                                    return True
                                else:
                                    self.log(f"   ⚠️ Reintentando img {idx+1} (Intento {attempt+1}): {up_res.text}")
                                    time.sleep(2)
                            except Exception as e:
                                self.log(f"   ⚠️ Reintentando img {idx+1} tras error: {e}")
                                time.sleep(2)
                                try:
                                    if os.path.exists(temp_file):
                                        os.remove(temp_file)
                                except: pass
                        
                        self.log(f"   ❌ Fallo definitivo subiendo imagen {idx+1}")
                        return False

                    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
                        futures = [executor.submit(_upload_image, j, img_url) for j, img_url in enumerate(images)]
                        concurrent.futures.wait(futures)
                    
                    # Remove any Nones if there were complete failures
                    uploaded_pages = [p for p in uploaded_pages if p is not None]
                    
                    if uploaded_pages:
                        self.log(f"   -> Guardando {chap['title']} en la Base de Datos...")
                        create_res = requests.post(
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
                        if create_res.ok:
                            self.log(f"✅ {chap['title']} importado.")
                        else:
                            self.log(f"❌ Fallo guardando capítulo: {create_res.text}")
                            
                self.progress_bar.set(1.0)
                self.log("\n🎉 ¡PROCESO DE IMPORTACIÓN MASIVA FINALIZADO! 🎉")
                messagebox.showinfo("Éxito", "Todos los capítulos han sido subidos a la base de datos.")
                
            except Exception as e:
                self.log(f"❌ Error en la subida: {e}")
                messagebox.showerror("Error", f"Se detuvo la subida: {e}")
            finally:
                self.upload_btn.configure(state="normal")
                self.analyze_btn.configure(state="normal")
                
        threading.Thread(target=_do_upload, daemon=True).start()


if __name__ == "__main__":
    app = TMOScraperApp()
    app.mainloop()
