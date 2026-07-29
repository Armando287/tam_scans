const cheerio = require('cheerio');

const url = 'https://zonatmo.org/library/manga/30537/mairimashita-iruma-kun';
fetch(url).then(r => r.text()).then(html => {
  const $ = cheerio.load(html);
  
  const results = [];
  $('a[href*="view_uploads"]').each((i, el) => {
     if(i > 2) return; // just get a few
     
     const href = $(el).attr('href');
     const container = $(el).closest('li.list-group-item, li');
     
     // try to find the chapter name
     const title = container.find('a').first().text().trim() || $(el).text().trim();
     const nameNode = container.find('h4, .text-truncate').text().trim();
     
     results.push({ href, title, nameNode, fullHtml: container.html() });
  });
  
  console.log(JSON.stringify(results, null, 2));
}).catch(console.error);
