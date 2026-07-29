const cheerio = require("cheerio");

fetch("https://zonatmo.org/view_uploads/1006476")
  .then(r => r.text())
  .then(html => {
    const $ = cheerio.load(html);
    
    // Check for images in the DOM
    const imgs = [];
    $("img").each((i, el) => {
        const src = $(el).attr("src") || $(el).attr("data-src");
        if (src && !src.includes("avatar")) imgs.push(src);
    });
    console.log("Images found in DOM:", imgs.length);
    if (imgs.length > 0) console.log(imgs.slice(0, 3));
    
    // Check for inline JS arrays (if cascade is built via JS)
    const scripts = [];
    $("script").each((i, el) => {
        const content = $(el).html();
        if (content && content.includes("http")) {
            scripts.push(content.substring(0, 200));
        }
    });
    console.log("Scripts containing http:", scripts.length);
  });
