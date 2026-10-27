// Static site build. Usage: node build.mjs            -> dist/ (clean URLs, for a real server)
//                        node build.mjs --preview   -> dist-preview/ (links end in index.html, opens from any folder)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const preview = process.argv.includes('--preview');
const out = path.join(root, preview ? 'dist-preview' : 'dist');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const site = JSON.parse(read('site.json'));
const nets = JSON.parse(read('data/networks.json'));
const byId = Object.fromEntries(nets.map((n) => [n.id, n]));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dateLabel = (iso) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const slugify = (t) => t.toLowerCase().replace(/<[^>]+>/g, '').replace(/&amp;/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const checked = dateLabel(site.updated);

// ---------- pages ----------
const pages = [{ slug: '', title: 'Best Publisher Ad Networks in 2026', h1: '', type: 'home' }];
for (const f of fs.readdirSync(path.join(root, 'content')).sort()) {
  const raw = read('content/' + f);
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('bad front matter: ' + f);
  pages.push({ ...JSON.parse(m[1]), body: m[2] });
}
const pageBySlug = Object.fromEntries(pages.map((p) => [p.slug, p]));
const sub = (s) => s.replace(/\{\{site\.name\}\}/g, site.name).replace(/\{\{site\.email\}\}/g, site.email);

// ---------- links ----------
const link = (from, to) => (from ? '../' : './') + (to ? to + '/' : '') + (preview ? 'index.html' : '');
const asset = (from, f) => (from ? '../' : './') + 'assets/' + f;
const ext = () => 'target="_blank" rel="noopener"';
const extPlain = 'target="_blank" rel="noopener"';

// ---------- network blocks ----------
const hasCta = (slug) => slug === '' || slug === 'best-ad-networks-for-mobile-apps';
function netsec(id, level, slug) {
  const n = byId[id];
  if (!n) throw new Error('unknown network ' + id);
  const first = n.group === 'apps' ? 'Platforms' : 'Entry requirements';
  const sources = n.sources.map((s) => `<a href="${s.url}" ${extPlain}>${esc(s.label)} ↗</a>`).join('');
  const cta = n.partner && hasCta(slug)
    ? `<a class="btn btn-ink" href="${n.url}" ${ext(n)}>${esc(n.cta)} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2EE6A6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>`
    : '';
  return `<section class="net" id="${n.id}">
<h${level} class="nh">${esc(n.name)}</h${level}>
<p class="best">Best for: ${esc(n.bestFor)}</p>
<p class="sum">${esc(n.summary)}</p>
<dl class="facts"><div><dt>${first}</dt><dd>${esc(n.entry)}</dd></div><div><dt>Ad formats</dt><dd>${esc(n.formats)}</dd></div><div><dt>Payouts</dt><dd>${esc(n.payouts)}</dd></div></dl>
<p class="verdict"><strong>Verdict.</strong> ${esc(n.verdict)}</p>
<p class="net-links"><span>Sources:</span>${sources}</p>${cta ? `\n${cta}` : ''}
</section>`;
}
function table(kind, slug) {
  const ids = kind === 'apps' ? ['yango', 'yandex', 'admob', 'levelplay', 'appodeal'] : ['adsense', 'adsterra', 'infolinks', 'monumetric', 'ezoic'];
  const first = kind === 'apps' ? 'Platforms' : 'Entry requirements';
  const rows = ids.map((id) => {
    const n = byId[id];
    const name = `<a href="${n.url}" ${ext(n)}>${esc(n.name)}</a>`;
    return `<tr><td>${name}</td><td>${esc(n.entry)}</td><td>${esc(n.formats)}</td><td>${esc(n.payouts)}</td></tr>`;
  }).join('\n');
  return `<div class="tablewrap"><table>
<thead><tr><th>Network</th><th>${first}</th><th>Ad formats</th><th>Payouts</th></tr></thead>
<tbody>
${rows}
</tbody></table></div>`;
}
function rowsFor(group) {
  return nets.filter((n) => n.group === group).map((n) => {
    const first = group === 'apps' ? 'Platforms' : 'Entry requirements';
    return `<div class="row lift reveal">
<div class="row-name"><span class="n">${esc(n.name)}</span><a href="${n.url}" ${ext(n)}>Official page ↗</a></div>
<div class="cell"><div class="l">${first}</div><div class="v">${esc(n.entry)}</div></div>
<div class="cell"><div class="l">Ad formats</div><div class="v">${esc(n.formats)}</div></div>
<div class="cell"><div class="l">Payouts</div><div class="v">${esc(n.payouts)}</div></div>
</div>`;
  }).join('\n');
}

// ---------- shared chrome ----------
const logoMark = '<span class="logo-mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B1220" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 18 L10 11 L14 15 L20 6"/><path d="M15 6 H20 V11"/></svg></span>';
function header(slug) {
  const items = [
    ['Compare', link(slug, '') + '#compare', ''],
    ['Mobile apps', link(slug, 'best-ad-networks-for-mobile-apps'), 'best-ad-networks-for-mobile-apps'],
    ['Methodology', link(slug, 'methodology'), 'methodology'],
    ['About', link(slug, 'about'), 'about'],
  ];
  const nav = items.map(([t, h, s]) => `<a href="${h}"${s && s === slug ? ' aria-current="page"' : ''}>${t}</a>`).join('');
  return `<header class="site-header"><a class="logo" href="${link(slug, '')}">${logoMark}${esc(site.name)}</a><nav class="nav" aria-label="Main">${nav}</nav></header>`;
}
const skipLink = '<a class="skip" href="#main">Skip to content</a>\n';
function footer(slug) {
  const items = [['Methodology', 'methodology'], ['About', 'about'], ['Contact', 'contact'], ['Privacy', 'privacy'], ['Disclosure', 'disclosure']];
  return `<footer class="site-footer"><div class="container">
<div class="footer-row"><div class="about"><strong>${esc(site.name)}</strong>Comparison of publisher ad networks for the US market. Figures come from official network pages and are dated ${checked}. The site has a commercial connection with Yango Ads and Yandex Advertising Network; see the <a href="${link(slug, 'disclosure')}" style="color:#fff">disclosure page</a>.</div>
<nav class="footer-nav" aria-label="Footer">${items.map(([t, s]) => `<a href="${link(slug, s)}">${t}</a>`).join('')}</nav></div>
<div class="copy">© ${site.year} ${esc(site.name)}. All rights reserved.</div></div></footer>`;
}
function head({ slug, title, description, jsonld }) {
  const canon = site.url.replace(/\/$/, '') + '/' + (slug ? slug + '/' : '');
  const full = slug ? `${title} | ${site.name}` : title;
  return `<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canon}">
<meta name="robots" content="index, follow">
<meta property="og:type" content="${slug ? 'article' : 'website'}">
<meta property="og:site_name" content="${esc(site.name)}">
<meta property="og:title" content="${esc(full)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canon}">
<meta name="twitter:card" content="summary">
<link rel="icon" href="${asset(slug, 'favicon.svg')}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${asset(slug, 'style.css')}">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head>`;
}
function faqBlock(faq) {
  return faq.map((f) => `<details><summary>${esc(f.q)}</summary><div class="a"><p>${esc(f.a)}</p></div></details>`).join('\n');
}
const faqLd = (faq) => ({ '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) });

// ---------- ad network animation (SVG, self-animating) ----------
function adflow() {
  const A = '#2EE6A6';
  const an = (attr, vals, dur, begin, extra = '') => `<animate attributeName="${attr}" values="${vals}" ${extra} dur="${dur}" begin="${begin}" repeatCount="indefinite"/>`;
  let s = '<svg viewBox="0 0 720 340" role="img" aria-labelledby="adflow-t" style="width:100%;height:auto;display:block"><title id="adflow-t">How a publisher ad network connects advertisers with websites and apps</title>';
  s += '<g stroke="#2B3A5E" stroke-width="2" stroke-dasharray="6 8" fill="none"><path d="M150 68 L296 170"/><path d="M150 170 L296 170"/><path d="M150 272 L296 170"/><path d="M424 170 L570 98"/><path d="M424 170 L570 242"/></g>';
  s += '<g fill="#16213A" stroke="#263556" stroke-width="1.5"><rect x="20" y="40" width="130" height="56" rx="14"/><rect x="20" y="142" width="130" height="56" rx="14"/><rect x="20" y="244" width="130" height="56" rx="14"/><rect x="570" y="66" width="130" height="64" rx="14"/><rect x="570" y="210" width="130" height="64" rx="14"/></g>';
  s += '<g font-family="DM Sans, sans-serif" font-size="15" font-weight="700" fill="#E4E9F5" text-anchor="middle"><text x="85" y="73">Advertisers</text><text x="85" y="175">DSP bidders</text><text x="85" y="277">Brand campaigns</text><text x="635" y="94">Website</text><text x="635" y="238">Mobile app</text></g>';
  s += '<g font-family="DM Sans, sans-serif" font-size="12" fill="#A9B4CC" text-anchor="middle"><text x="635" y="114">ad tag</text><text x="635" y="258">SDK</text></g>';
  for (const b of ['0s', '1.4s']) s += `<circle cx="360" cy="170" r="64" fill="none" stroke="${A}" stroke-width="2" opacity="0">${an('r', '64;112', '2.8s', b)}${an('opacity', '0.6;0', '2.8s', b)}</circle>`;
  s += '<circle cx="360" cy="170" r="64" fill="#3A5BFF"/><text x="360" y="176" font-family="Bricolage Grotesque, sans-serif" font-size="19" font-weight="800" fill="#FFFFFF" text-anchor="middle">Ad network</text>';
  s += '<circle cx="360" cy="170" r="84" fill="none" stroke="#3A4A6B" stroke-width="1.5" stroke-dasharray="3 9"><animateTransform attributeName="transform" type="rotate" from="0 360 170" to="360 360 170" dur="26s" repeatCount="indefinite"/></circle>';
  s += `<circle cx="444" cy="170" r="5" fill="${A}"><animateTransform attributeName="transform" type="rotate" from="0 360 170" to="360 360 170" dur="7s" repeatCount="indefinite"/></circle>`;
  for (const [y, b] of [[66, '0.64s'], [210, '1.14s']]) s += `<rect x="570" y="${y}" width="130" height="64" rx="14" fill="none" stroke="${A}" stroke-width="2.5" opacity="0">${an('opacity', '0;0.95;0;0', '2.6s', b, 'keyTimes="0;0.1;0.45;1"')}</rect>`;
  const pk = [['M150 68 L296 170', A, '0s'], ['M150 170 L296 170', A, '0.5s'], ['M150 272 L296 170', A, '1s'], ['M424 170 L570 98', '#7C95FF', '1.3s'], ['M424 170 L570 242', '#7C95FF', '1.8s']];
  for (const [p, c, b] of pk) s += `<circle cx="0" cy="0" r="6" fill="${c}" opacity="0"><animateMotion path="${p}" dur="2.6s" begin="${b}" repeatCount="indefinite" calcMode="linear"/>${an('opacity', '0;1;1;0', '2.6s', b, 'keyTimes="0;0.15;0.85;1"')}</circle>`;
  s += '<g font-family="DM Sans, sans-serif" font-size="12" font-weight="700" letter-spacing="1" fill="#8E9AB5" text-anchor="middle"><text x="85" y="328">DEMAND</text><text x="360" y="328">MATCHING</text><text x="635" y="328">SUPPLY</text></g></svg>';
  return s;
}

// ---------- home ----------
const homeFaq = [
  { q: 'What is a publisher ad network?', a: 'A publisher ad network connects ad space with advertisers and pays the publisher a share of the revenue. Sites add a tag, apps add an SDK, and the network fills the slots.' },
  { q: 'Which ad network is best for a new website?', a: "Google AdSense is the safest first choice, since it states no traffic minimum and asks only for original content, an adult publisher, and access to the site's HTML. Adsterra also states no minimum, with payout thresholds from $5." },
  { q: 'Which ad network has the lowest payout threshold?', a: 'According to their official pages, Adsterra starts lowest at $5 through Paxum or WM, followed by Monumetric at $10, Ezoic at $20, and Infolinks at $50 through PayPal, eCheck, or ACH.' },
  { q: 'Which ad network is best for mobile apps?', a: 'No single network wins for every app. Yango Ads and Yandex Advertising Network offer one SDK across Android, iOS, Unity, Flutter, and React Native, Google AdMob is the baseline with mediation and bidding, and Unity LevelPlay fits Unity games.' },
  { q: 'Can a site or app run more than one ad network?', a: 'Mediation exists for that. Google AdMob and Unity LevelPlay both describe it, and Appodeal ships a mediation SDK. Each network sets its own policy, so the terms need a read before networks share the same pages.' },
  { q: 'How current are these figures?', a: `All figures were checked on official network pages on ${checked}. Ezoic changed its requirements in 2026, so any figure should be confirmed on the network's own page before applying.` },
];
const arrow = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B1220" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
function home() {
  const y = byId.yango, d = byId.yandex;
  const payRows = [
    ['Adsterra', 'From $5 (Paxum, WM); $25 (PayPal, local banks); $1,000 (wire)', 'Twice a month'],
    ['Monumetric', '$10', 'Net 60; paid in the first 10 business days'],
    ['Ezoic', '$20', 'Monthly from the 27th; Net 30 default'],
    ['Infolinks', '$50 (PayPal, eCheck, ACH); $100 (wire)', 'Monthly, within 45 days after month end'],
    ['Google AdSense', '$100', 'Between the 21st and 26th of the month'],
    ['Google AdMob', '$100 (€70, £60)', 'Not stated on the pages checked'],
    ['Appodeal', '$100 (PayPal, ACH); $300 (crypto); $1,000 (wire)', 'Net 45, monthly'],
    ['Yango Ads Ad Network', '$150 or €100', 'Monthly, in USD'],
    ['Yandex Advertising Network', '$150 or €100 (3,000 rubles for Russian residents)', 'Depends on the country of partnership'],
    ['Unity LevelPlay', 'Not published on the pages checked', 'Not published on the pages checked'],
  ].map(([a, b, c]) => `<tr><td>${a}</td><td>${b}</td><td>${c}</td></tr>`).join('\n');
  const marquee = nets.map((n) => `<span>${esc(n.short || n.name)}<i></i></span>`).join('');
  const body = `<section class="hero"><div class="container">
${header('')}
<div class="hero-row">
<div class="hero-text">
<div class="pill in1"><span class="dot"></span>Figures checked ${checked} · US market</div>
<h1 class="in2">Best <em>Publisher Ad Networks</em> in 2026: compared by traffic, format and payout</h1>
<p class="lead in3">The best publisher ad network depends on traffic and platform, not on a single winner. Ten networks, two groups, a clear verdict for each, and every figure traced to an official page.</p>
<div class="hero-actions in4"><a class="btn btn-mint" href="#compare">Compare the networks ${arrow}</a><a class="btn btn-line" href="#apps">Networks for apps</a></div>
</div>
<div class="hero-card in3"><div class="panel"><h2>One tag or SDK, many advertisers</h2><p class="sub">How a publisher ad network fills ad slots</p>${adflow()}</div></div>
</div></div></section>
<main id="main">
<section class="section"><div class="container">
<div class="eyebrow">The short answer</div>
<h2 class="h2 reveal">Which ad network fits which publisher</h2>
<p class="intro">The right network is the one whose entry rules a site or app already meets and whose payout threshold its revenue can reach. These are the five verdicts that follow from the stated terms.</p>
<div class="cards">
<a class="card lift reveal" href="#adsense"><span class="k">New site, little traffic</span><span class="t">Google AdSense</span><p>No traffic minimum and a short checklist. Adsterra states no minimum either, with a lower payout threshold.</p></a>
<a class="card lift reveal" href="#adsterra"><span class="k">Lowest payout threshold</span><span class="t">Adsterra</span><p>Payouts from $5 through Paxum or WM, paid twice a month.</p></a>
<a class="card lift reveal" href="#monumetric"><span class="k">Blog with 10K–80K pageviews</span><span class="t">Monumetric Propel</span><p>Built for WordPress and Blogger sites with at least half of traffic from the US, UK, Canada, or Australia.</p></a>
<a class="card lift reveal" href="#ezoic"><span class="k">Large site, 250K+ monthly users</span><span class="t">Ezoic</span><p>The network for audiences that are already large. Smaller sites are pointed to Incubator.</p></a>
<a class="card card-blue lift reveal" href="#apps"><span class="k">Mobile app</span><span class="t">Yango Ads · Yandex Advertising Network</span><p>One SDK for Android, iOS, Unity, Flutter, and React Native, each with a $150 or €100 payout threshold.</p></a>
</div></div></section>

<section class="section" id="what"><div class="container">
<div class="eyebrow">Basics</div>
<h2 class="h2 reveal">What a publisher ad network does</h2>
<p class="intro">A publisher ad network sells the ad space of websites and apps to advertisers and pays the publisher a share of the revenue. A site adds a tag, an app adds an SDK, and the network fills the slots. Three things separate one network from another: who it accepts, which formats it sells, and how it pays. Those three points drive every verdict on this page.</p>
</div></section>

<section class="section" id="compare"><div class="container">
<div class="section-head"><div><div class="eyebrow">Comparison</div><h2 class="h2 reveal">Entry, formats and payouts side by side</h2></div>
<div class="tabs" role="group" aria-label="Network group"><button class="tab" type="button" data-tab="sites" aria-pressed="true">For websites</button><button class="tab" type="button" data-tab="apps" aria-pressed="false">For mobile apps</button></div></div>
<div data-group="sites"><div class="rows">${rowsFor('sites')}</div></div>
<div data-group="apps"><div class="rows">${rowsFor('apps')}</div></div>
<p class="note">Ezoic's requirements changed in 2026, so they need a recheck before applying. Networks left out for lack of official data are listed on the <a href="${link('', 'methodology')}">methodology page</a>.</p>
</div></section>

<section class="section" id="websites"><div class="container">
<div class="eyebrow">Websites</div>
<h2 class="h2 reveal">Best ad networks for websites</h2>
<p class="intro">Five networks cover the full range, from no traffic minimum to 250,000 monthly users, and they are ordered here from easiest entry to hardest. For a pick by traffic level, see the guide to <a href="${link('', 'ad-networks-for-bloggers')}">ad networks for bloggers</a> and the list of <a href="${link('', 'adsense-alternatives')}">AdSense alternatives</a>.</p>
${['adsense', 'adsterra', 'infolinks', 'monumetric', 'ezoic'].map((id) => netsec(id, 3, '')).join('\n')}
</div></section>

<section class="band" id="apps"><div class="container">
<div class="eyebrow">Mobile apps</div>
<h2 class="h2 reveal">Best ad networks for mobile apps</h2>
<p class="intro">Five networks ship an SDK for in-app ads. The two featured below come first, followed by the established alternatives. The full side-by-side is on the page for <a href="${link('', 'best-ad-networks-for-mobile-apps')}" style="color:#fff">ad networks for mobile apps</a>.</p>
<div class="feat">
<article class="lift reveal"><div class="meta"><span>Android · iOS · Unity · React Native · Flutter</span></div>
<h3>${esc(y.name)}</h3><p>Formats cover interstitial, rewarded, banner, native, app open, and feed. Payouts are automatic and monthly in USD.</p>
<div class="stats"><div class="stat"><b>70+</b><span>DSPs in one SDK, per Yango Ads</span></div><div class="stat"><b>600K+</b><span>unique advertisers, per Yango Ads</span></div><div class="stat"><b>$150</b><span>or €100 payout threshold</span></div></div>
<p class="vline"><strong>Verdict.</strong> ${esc(y.verdict)}</p>
<a class="btn btn-ink" href="${y.url}" ${ext(y)}>${esc(y.cta)} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2EE6A6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></article>
<article class="lift reveal"><div class="meta"><span>Android · iOS · Unity · Flutter · React Native</span></div>
<h3>${esc(d.name)}</h3><p>Formats include interstitial, rewarded, and banner ads. The app must be published in the App Store or Google Play.</p>
<div class="stats"><div class="stat"><b>$150</b><span>or €100 payout threshold</span></div><div class="stat"><b>USD · EUR</b><span>or rubles, by partner country</span></div><div class="stat"><b>GDPR</b><span>consent form help from experts</span></div></div>
<p class="vline"><strong>Verdict.</strong> ${esc(d.verdict)}</p>
<a class="btn btn-ink" href="${d.url}" ${ext(d)}>${esc(d.cta)} <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2EE6A6" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></article>
</div>
${['admob', 'levelplay', 'appodeal'].map((id) => netsec(id, 3, '')).join('\n')}
<p class="disc">Disclosure: this site has a commercial connection with Yango Ads and Yandex Advertising Network. See the <a href="${link('', 'disclosure')}">disclosure page</a>.</p>
</div></section>

<section class="section" id="payouts"><div class="container">
<div class="eyebrow">Payouts</div>
<h2 class="h2 reveal">How and when ad networks pay</h2>
<p class="intro">Sorted from the lowest stated threshold. A threshold is the balance a network holds before it pays, so it matters most for small sites and new apps. Adsterra is the cheapest to reach, AdSense, AdMob, and Appodeal share the $100 mark, and Yango Ads and Yandex Advertising Network sit at $150 or €100.</p>
<div class="tablewrap"><table><thead><tr><th>Network</th><th>Payout threshold</th><th>Schedule</th></tr></thead><tbody>
${payRows}
</tbody></table></div>
</div></section>

<section class="section" id="choose"><div class="container">
<div class="eyebrow">Choosing</div>
<h2 class="h2 reveal">How to choose a publisher ad network</h2>
<div class="dark3">
<div class="lift reveal"><div class="big">1</div><h3>Start with eligibility</h3><p>Traffic, platform, and audience decide which networks will accept a site or app. Anything outside the entry rules is out.</p></div>
<div class="lift reveal"><div class="big">2</div><h3>Match formats to the layout</h3><p>The network's ad formats have to fit the page layout or the app's placements, or the integration will fight the product.</p></div>
<div class="lift reveal"><div class="big">3</div><h3>Check the payout against revenue</h3><p>The threshold and schedule should fit the revenue expected each month, because earnings below the threshold wait.</p></div>
</div></div></section>

<section class="section" id="vs"><div class="container">
<div class="eyebrow">Terms</div>
<h2 class="h2 reveal">Ad network, ad exchange and SSP</h2>
<div class="cards">
<div class="card"><span class="t">Ad network</span><p>Packages ad space from many publishers and sells it to advertisers. The publisher integrates one tag or SDK.</p></div>
<div class="card"><span class="t">Ad exchange</span><p>An auction marketplace where buyers bid for impressions in real time.</p></div>
<div class="card"><span class="t">SSP</span><p>Publisher-side software that offers inventory to exchanges and demand sources and runs the auction.</p></div>
</div></div></section>

<section class="section" id="method"><div class="container">
<div class="eyebrow">Methodology</div>
<h2 class="h2 reveal">How a network gets on this list</h2>
<div class="dark3">
<div class="lift reveal"><div class="big">01</div><h3>Entry requirements</h3><p>Traffic minimums for sites and supported platforms for apps, taken from the network's own pages.</p></div>
<div class="lift reveal"><div class="big">02</div><h3>Ad formats</h3><p>Only formats the network names itself, with nothing inferred from third-party reviews.</p></div>
<div class="lift reveal"><div class="big">03</div><h3>Payout terms</h3><p>Threshold, schedule and methods. A network needs at least two of the three to be listed.</p></div>
</div>
<p class="note">Full rules, sources, and the networks left out: <a href="${link('', 'methodology')}">methodology</a>.</p>
</div></section>

<section class="section" id="faq"><div class="container">
<div class="eyebrow" style="text-align:center">FAQ</div>
<h2 class="h2 reveal" style="text-align:center;margin-inline:auto">Questions publishers ask</h2>
<div class="faq">${faqBlock(homeFaq)}</div>
</div></section>

<div class="marquee" aria-hidden="true"><div class="track">${marquee}${marquee}</div></div>
</main>`;
  const desc = 'The best publisher ad network depends on traffic and platform. Ten networks for sites and apps, with verdicts and official entry, format, and payout terms.';
  const ld = { '@context': 'https://schema.org', '@graph': [{ '@type': 'WebSite', name: site.name, url: site.url }, faqLd(homeFaq)] };
  return head({ slug: '', title: 'Best Publisher Ad Networks in 2026: Verdicts for Sites and Apps', description: desc, jsonld: ld }) + `\n<body>\n${skipLink}${body}\n${footer('')}\n<script src="${asset('', 'site.js')}" defer></script>\n</body>\n</html>\n`;
}

// ---------- inner template (one for every inner page) ----------
function expand(p) {
  let b = sub(p.body);
  b = b.replace(/\{\{a:([a-z0-9-]*)\|([^}]+)\}\}/g, (_, s0, t) => {
    const s = s0 === 'home' ? '' : s0;
    if (s !== '' && !pageBySlug[s]) throw new Error(`${p.slug}: link to unknown page "${s}"`);
    return `<a href="${link(p.slug, s)}">${t}</a>`;
  });
  b = b.replace(/\{\{netsec:([a-z]+):(\d)\}\}/g, (_, id, lv) => netsec(id, Number(lv), p.slug));
  b = b.replace(/\{\{table:([a-z-]+)\}\}/g, (_, k) => table(k === 'apps' ? 'apps' : 'sites', p.slug));
  return b;
}
function inner(p) {
  let body = expand(p);
  body = body.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, t) => `<h2 id="${slugify(t)}">${t}</h2>`);
  if (p.faq && p.faq.length) body += `\n<h2 id="faq">Frequently asked questions</h2>\n<div class="faq" style="margin-top:20px;max-width:none">${faqBlock(p.faq)}</div>`;
  const toc = [...body.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>|<section class="net" id="([^"]+)">\s*<h2 class="nh">([\s\S]*?)<\/h2>/g)].map((m) => [m[1] || m[3], (m[2] || m[4]).replace(/<span class="badge">[\s\S]*?<\/span>/g, '').replace(/<[^>]+>/g, '').trim()]);
  const related = (p.related || []).map((s) => pageBySlug[s]).filter(Boolean);
  const h1 = sub(p.h1);
  const lead = sub(p.lead);
  const crumbs = `<ol class="crumbs"><li><a href="${link(p.slug, '')}">Home</a></li><li aria-current="page">${esc(sub(p.title))}</li></ol>`;
  const aside = `<aside class="aside"><div class="box"><h2>On this page</h2><ul>${toc.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}</ul></div><div class="box"><h2>Related</h2><ul>${related.map((r) => `<li><a href="${link(p.slug, r.slug)}">${esc(sub(r.h1))}</a></li>`).join('')}</ul></div></aside>`;
  const rel = `<section class="related"><div class="container"><h2>Keep reading</h2><div class="cards">${related.map((r) => `<a class="card lift reveal" href="${link(p.slug, r.slug)}"><span class="t">${esc(sub(r.h1))}</span><p>${esc(sub(r.description))}</p></a>`).join('')}</div></div></section>`;
  const meta = p.type === 'guide' ? `<div class="meta"><span class="pill">Figures checked ${checked}</span><span class="pill">Official sources linked</span></div>` : `<div class="meta"><span class="pill">Updated ${checked}</span></div>`;
  const crumbLd = { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: site.url }, { '@type': 'ListItem', position: 2, name: sub(p.title), item: site.url.replace(/\/$/, '') + '/' + p.slug + '/' }] };
  const graph = [crumbLd];
  if (p.type === 'guide') graph.push({ '@type': 'Article', headline: h1, description: sub(p.description), dateModified: site.updated, author: { '@type': 'Organization', name: site.name }, publisher: { '@type': 'Organization', name: site.name } });
  if (p.faq && p.faq.length) graph.push(faqLd(p.faq));
  const html = head({ slug: p.slug, title: sub(p.title), description: sub(p.description), jsonld: { '@context': 'https://schema.org', '@graph': graph } }) + `
<body>
${skipLink}<div class="inner-head"><div class="container">
${header(p.slug)}
${crumbs}
<h1>${esc(h1)}</h1>
<p class="lead">${lead}</p>
${meta}
</div></div>
<main id="main"><div class="container"><div class="inner-body"><article class="prose">
${body}
</article>
${aside}</div></div>
${rel}</main>
${footer(p.slug)}
</body>
</html>
`;
  return html;
}

// ---------- write ----------
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'assets'), { recursive: true });
for (const f of fs.readdirSync(path.join(root, 'assets'))) fs.copyFileSync(path.join(root, 'assets', f), path.join(out, 'assets', f));
for (const p of pages) {
  const html = p.type === 'home' ? home() : inner(p);
  const dir = p.slug ? path.join(out, p.slug) : out;
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}
const base = site.url.replace(/\/$/, '');
fs.writeFileSync(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `<url><loc>${base}/${p.slug ? p.slug + '/' : ''}</loc><lastmod>${site.updated}</lastmod></url>`).join('\n')}\n</urlset>\n`);
fs.writeFileSync(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
fs.writeFileSync(path.join(out, '404.html'), head({ slug: '', title: 'Page not found', description: 'Page not found', jsonld: {} }).replace('<meta name="robots" content="index, follow">', '<meta name="robots" content="noindex">') + `\n<body>${skipLink}<div class="container">${header('')}</div><main id="main"><div class="container" style="padding-block:96px"><h1 class="h2">Page not found</h1><p><a href="${link('', '')}">Back to the comparison</a></p></div></main>${footer('')}</body></html>\n`);
console.log(`built ${pages.length} pages -> ${path.relative(root, out)}`);
