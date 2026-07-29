const cheerio = require("cheerio");
const fs = require("fs");

fetch("https://zonatmo.org/library/manga/30537/mairimashita-iruma-kun")
  .then(r => r.text())
  .then(html => {
    fs.writeFileSync("zonatmo-test.html", html);
    console.log("Written");
  });
