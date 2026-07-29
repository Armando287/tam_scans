const cheerio = require("cheerio");

fetch("https://zonatmo.org/library/manga/30537/mairimashita-iruma-kun")
  .then(r => r.text())
  .then(html => {
    const $ = cheerio.load(html);
    console.log("=== DEBUG ===");
    console.log($("h1.element-title").parent().html());
    console.log("---");
    console.log($("h5.text-truncate").parent().html());
    console.log("---");
    console.log($(".element-description").html());
  });
