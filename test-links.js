const cheerio = require("cheerio");
const fs = require("fs");

fetch("https://zonatmo.org/library/manga/30537/mairimashita-iruma-kun")
  .then(r => r.text())
  .then(html => {
    const $ = cheerio.load(html);
    const links = [];
    $("a").each((i, el) => {
        const href = $(el).attr("href");
        if (href && href.includes("view_uploads")) {
           links.push(href);
        }
    });
    console.log("View upload links:", links.length);
    console.log(links.slice(0, 5));
  });
