import fetch from 'node-fetch';
import fs from 'fs';
import { parseStringPromise } from 'xml2js';
import path from 'path';

const BLOGS = [
  { url: 'http://www.g-taskas.lt/category/kultura-kt/literatura/feed/' },
  { url: 'http://akivarai.popo.lt/category/literatura/feed/' },
  { url: 'https://petras.kudaras.lt/feed.xml' },
  { url: 'http://knygoholike.blogspot.com/feeds/posts/default?alt=rss' },
  // Expired cert:
  // { url: 'http://www.novum.lt/kategorija/knygos/feed' },
  { url: 'https://nosferatuskaito.wordpress.com/feed/' },
  { url: 'http://gerosknygos.pavb.lt/feed/' },
  { url: 'http://lentyna.wordpress.com/feed/' },
  { url: 'http://kaskaityti.wordpress.com/feed/' },
  { url: 'http://madublogas.lt/tag/knygos-2/feed/' },
  { url: 'http://minteles.wordpress.com/category/knygos/feed/' },
  { url: 'http://knygulentyna.wordpress.com/feed/' },
  { url: 'http://www.orikse.lt/feed/' },
  { url: 'http://perskaiciau.wordpress.com/feed/' },
  { url: 'http://adis.lt/index.php/category/skaityti/feed/' },
  { url: 'http://naujosknygos.wordpress.com/feed/' },
  { url: 'http://betelgeuses.blogspot.com/feeds/posts/default?alt=rss' },
  { url: 'http://knyguguru.blogspot.com/feeds/posts/default?alt=rss' },
  { url: 'http://skaitomevaikams.wordpress.com/feed/' },
];

const TEMPLATE = `<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-type" content="text/html; charset=utf-8">
    <meta name="robots" content="noindex">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Skaityta.lt</title>
    <link rel="shortcut icon" type="image/x-icon" href="/images/favicon.ico">
    <link rel="stylesheet" href="/stylesheets/style.css">
    <link rel="alternate" type="application/rss+xml" title="RSS 2.0" href="/rss.xml">
  </head>
  <body>
    <div class="container">
      <a href="/">
        <img src="/images/logo.png">
      </a>
      <div class="buttons">
        <a href="/" class="button">Pagrindinis</a>
        <a href="http://feeds.feedburner.com/Skaityta" class="button">Prenumerata</a>
        <a href="/apie.html" class="button">Apie / Archyvas</a>
      </div>
      <div id="entries">
        {0}
        {1}
      </div>
      <p>Skaityta.lt (&copy;) 2001-2025. Visos teisės saugomos. Platinti puslapyje publikuojamas apžvalgas be skaityta.lt ir/arba autorių sutikimo NEETIŠKA IR NETEISĖTA. Dėl medžiagos panaudojimo rašykite el.paštu <a href="mailto:skaityta@skaityta.lt">skaityta@skaityta.lt</a>.</p>
    </div>
  </body>
</html>`;

const MORE_ENTRIES = '<div id="more" class="box"><a href="{0}">Daugiau įrašų</a></div>';

const ENTRY = `
  <div id="entry2566" class="box">
    <h1><a href="{0}">{1}</a></h1>
    <p>{2}</p>
    <p><em><time datetime="{3}">{4}</time></em></p>
    {5}
    <p class="actions"><a href="{0}">Daugiau</a></p>
  </div>`;

const RSS_TEMPLATE = `<?xml version="1.0" encoding="utf-8" ?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Skaityta</title>
    <link>http://skaityta.lt/</link>
    <description>Skaityta</description>
    <language>lt</language>
    {0}
  </channel>
</rss>`;

const RSS_ITEM_TEMPLATE = `
  <item>
    <title>{0}</title>
    <link>{1}</link>
    <description>{2}</description>
    <dc:creator>{3}</dc:creator>
    <pubDate>{4}</pubDate>
  </item>`;

const htmlEscapeTable = {
  '&': '&amp;',
  '"': '&quot;',
  "'": '&apos;',
  '>': '&gt;',
  '<': '&lt;',
};

function htmlEscape(text) {
  return text.replace(/[&"'<>]/g, (char) => htmlEscapeTable[char]);
}

const MIN_ENTRY_DATE = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).getTime() / 1000;

async function processBlog(url, entriesData) {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/32.0.1700.102 Safari/537.36',
  };

  try {
    const response = await fetch(url, { headers });
    if (!response.ok) {
      if (![500, 502, 503, 504].includes(response.status)) {
        console.log(`URL: ${url}, Status: ${response.status}`);
      }
      return;
    }

    const text = await response.text();
    const result = await parseStringPromise(text);

    const items = result.rss.channel[0].item;
    for (const item of items) {
      let title = item.title ? item.title[0] : 'Be pavadinimo';
      let creator = 'Anonymous';
      if (item['dc:creator']) {
        creator = item['dc:creator'][0];
      } else if (item.author) {
        creator = item.author[0].match(/\(([^)]+)\)/)[1];
      } else if (result.rss.channel[0]['lj:journal']) {
        creator = result.rss.channel[0]['lj:journal'][0];
      }

      let textContent = item.description ? item.description[0] : item.summary[0];
      let link = item.link[0];
      let pubDate =
        new Date(item.pubDate[0].replace('+0000', '').replace('GMT', '').replace('+0200', '')).getTime() / 1000;

      link = link.replace('https://', 'http://');

      if (pubDate > MIN_ENTRY_DATE) {
        if (entriesData.entries[link]) {
          if (!entriesData.entries[link].archived) {
            entriesData.entries[link] = {
              creator,
              title,
              date: pubDate,
              url: link,
              text: textContent,
              archived: false,
            };
          }
        } else {
          entriesData.entries[link] = {
            creator,
            title,
            date: pubDate,
            url: link,
            text: textContent,
            archived: false,
          };
        }
      }
    }
  } catch (error) {
    console.error(`Problem with ${url}`, error);
  }
}

async function main() {
  const data_path = process.env['DATA_PATH'];
  const public_path = path.join(data_path, 'public');

  const data = JSON.parse(fs.readFileSync(path.join(data_path, 'entries.json'), 'utf-8'));

  for (const blog of BLOGS) {
    console.log(`Processing ${blog.url}`);
    await processBlog(blog.url, data);
  }

  const freshEntries = [];
  for (const url in data.entries) {
    const entry = data.entries[url];
    if (!entry.archived) {
      freshEntries.push(entry);
    } else if (entry.date < MIN_ENTRY_DATE) {
      delete data.entries[url];
    }
  }

  const sortedEntries = freshEntries.sort((a, b) => a.date - b.date);

  let lastEntries = [];
  let previous = data.previous;
  let entriesHtml = '';
  let entriesRss = '';

  for (let idx = 0; idx < sortedEntries.length; idx++) {
    const entry = sortedEntries[idx];
    if (lastEntries.length === 10 && sortedEntries.length - idx > 10) {
      let moreHtml = previous ? MORE_ENTRIES.replace('{0}', previous) : '';
      let html = TEMPLATE.replace('{0}', entriesHtml).replace('{1}', moreHtml);

      const filename = `${lastEntries[lastEntries.length - 1][1]}.html`;
      fs.writeFileSync(path.join(public_path, filename), html, 'utf-8');

      for (const [url, date] of lastEntries) {
        if (date < MIN_ENTRY_DATE) {
          delete data.entries[url];
        } else {
          data.entries[url].archived = true;
        }
      }

      previous = filename;
      lastEntries = [];
      entriesHtml = '';
      entriesRss = '';
    }

    lastEntries.push([entry.url, entry.date]);

    const date = new Date(entry.date * 1000);
    entriesHtml =
      ENTRY.replace('{0}', htmlEscape(entry.url || ''))
        .replace('{0}', htmlEscape(entry.url || ''))
        .replace('{1}', htmlEscape(entry.title || ''))
        .replace('{2}', htmlEscape(entry.creator || ''))
        .replace('{3}', date.toISOString())
        .replace('{4}', date.toISOString().split('T')[0])
        .replace('{5}', entry.text || '') + entriesHtml;

    entriesRss =
      RSS_ITEM_TEMPLATE.replace('{0}', htmlEscape(entry.title || ''))
        .replace('{1}', htmlEscape(entry.url || ''))
        .replace('{2}', htmlEscape(entry.text || ''))
        .replace('{3}', htmlEscape(entry.creator || ''))
        .replace('{4}', date.toUTCString()) + entriesRss;
  }

  let moreHtml = previous ? MORE_ENTRIES.replace('{0}', previous) : '';
  let html = TEMPLATE.replace('{0}', entriesHtml).replace('{1}', moreHtml);
  fs.writeFileSync(path.join(public_path, 'index.html'), html, 'utf-8');

  let rss = RSS_TEMPLATE.replace('{0}', entriesRss);
  fs.writeFileSync(path.join(public_path, 'rss.xml'), rss, 'utf-8');

  data.previous = previous;
  fs.writeFileSync(path.join(data_path, 'entries.json'), JSON.stringify(data, null, 4), 'utf-8');
}

main();
