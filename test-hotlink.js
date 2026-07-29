fetch('https://zonatmo.org/library/manga/30537/mairimashita-iruma-kun')
  .then(r => r.text())
  .then(html => {
    const img = html.match(/<img[^>]+src="([^"]+)"/i);
    if (img) {
      console.log('Found image:', img[1]);
      fetch(img[1], { headers: { 'Referer': 'https://tam-scan.vercel.app/' } })
        .then(res => console.log('Hotlink test:', res.status))
        .catch(e => console.log('Hotlink error', e.message));
    } else {
      console.log('No image found');
    }
  })
  .catch(console.error);
