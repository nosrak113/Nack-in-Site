#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync, watchFile, unwatchFile } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import schema from '@jsonresume/schema';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const themePath = path.join(root, 'theme', 'index.cjs');
const help = `JSON Resume commands (Node 22+)

  npm run validate       Validate resume.json against the official JSON Resume schema
  npm run build          Generate the website's res.html (CSS and logo embedded)
  npm run preview        Build and serve at http://127.0.0.1:4000/res.html
  npm run dev            Preview and rebuild/reload when data or theme files change
  npm run pdf            Export output/pdf/Karson-Miller-Resume.pdf
  npm run help           Show this help

Options after --:
  --resume FILE          Read another JSON Resume file
  --out FILE             Output path for build or pdf
  --port NUMBER          Preview port (default: 4000)
  --browser NAME         PDF browser: chrome (default), msedge, or chromium

Examples:
  npm run build -- --out output/resume.html
  npm run dev -- --port 4100
  npm run pdf -- --out output/pdf/resume.pdf

PDF uses installed Google Chrome by default. For Playwright Chromium, run:
  npx playwright install chromium
  npm run pdf -- --browser chromium
`;

function options(args) {
    const result = {};
    for (let i = 0; i < args.length; i++) {
        const key = args[i];
        if (key === '--watch') { result.watch = true; continue; }
        if (!['--resume', '--out', '--port', '--browser'].includes(key)) throw new Error(`Unknown option: ${key}`);
        const value = args[++i];
        if (!value || value.startsWith('--')) throw new Error(`${key} needs a value.`);
        result[key.slice(2)] = value;
    }
    return result;
}

async function loadResume(file) {
    const resume = JSON.parse(await readFile(file, 'utf8'));
    await new Promise((resolve, reject) => schema.validate(resume, (errors, valid) => {
        if (valid) resolve();
        else reject(new Error(`Invalid JSON Resume:\n${errors.map(error => `  ${error.stack}`).join('\n')}`));
    }));
    return resume;
}

function render(resume) {
    delete require.cache[require.resolve(themePath)];
    return require(themePath).render(resume);
}

async function save(file, content) {
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, content);
    console.log(`Wrote ${path.relative(root, file)}`);
}

async function build(file, output) {
    const resume = await loadResume(file);
    const html = render(resume);
    await save(output, html);
    return { resume, html };
}

async function serve(file, opts) {
    const port = Number(opts.port || 4000);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('--port must be an integer between 0 and 65535.');
    const output = path.join(root, 'res.html');
    let current = await build(file, output);
    const clients = new Set();
    const reload = '<script>new EventSource("/__resume/events").onmessage = () => location.reload();</script>';
    const server = createServer((req, res) => {
        const pathname = new URL(req.url, 'http://localhost').pathname;
        if (opts.watch && pathname === '/__resume/events') {
            res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
            res.write(': connected\n\n');
            clients.add(res);
            req.on('close', () => clients.delete(res));
            return;
        }
        res.setHeader('Cache-Control', 'no-store');
        if (pathname === '/' || pathname === '/res.html') {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(opts.watch ? current.html.replace('</body>', `${reload}</body>`) : current.html);
        } else if (pathname === '/resume.json') {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.end(JSON.stringify(current.resume, null, 2));
        } else {
            res.writeHead(404); res.end('Not found');
        }
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, '127.0.0.1', resolve);
    });
    console.log(`Resume: http://127.0.0.1:${server.address().port}/res.html${opts.watch ? ' (watching for changes)' : ''}`);
    const watched = new Set();
    let timer;
    let rebuilding = false;
    let pending = false;
    async function rebuild() {
        if (rebuilding) { pending = true; return; }
        rebuilding = true;
        try {
            current = await build(file, output);
            watchImage();
            for (const client of clients) client.write('data: reload\n\n');
        } catch (error) { console.error(`Rebuild failed; keeping the last valid preview. ${error.message}`); }
        finally {
            rebuilding = false;
            if (pending) { pending = false; await rebuild(); }
        }
    }
    function watch(file) {
        if (watched.has(file)) return;
        watched.add(file);
        watchFile(file, { interval: 300 }, () => {
            clearTimeout(timer);
            timer = setTimeout(rebuild, 100);
        });
    }
    function watchImage() {
        const image = current.resume.basics?.image;
        if (image && !/^(https?:|data:)/i.test(image)) watch(path.resolve(root, image));
    }
    if (opts.watch) {
        for (const f of [file, themePath, path.join(root, 'theme', 'resume.hbs'), path.join(root, 'css', 'res.css')]) watch(f);
        watchImage();
    }
    function close() {
        clearTimeout(timer);
        for (const f of watched) unwatchFile(f);
        for (const client of clients) client.end();
        server.close();
        server.closeAllConnections();
    }
    process.once('SIGINT', close);
    process.once('SIGTERM', close);
}

async function pdf(file, opts) {
    const { chromium } = await import('playwright');
    const channel = opts.browser || 'chrome';
    if (!['chrome', 'msedge', 'chromium'].includes(channel)) throw new Error('--browser must be chrome, msedge, or chromium.');
    // Render the same HTML as build, without changing the committed website output.
    const html = render(await loadResume(file));
    let browser;
    try { browser = await chromium.launch(channel === 'chromium' ? {} : { channel }); }
    catch (error) {
        throw new Error(`Cannot launch ${channel}. Install Chrome, or run "npx playwright install chromium" and "npm run pdf -- --browser chromium".\n${error.message}`);
    }
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle' });
        await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all([...document.images].map(image => image.decode()));
        });
        const output = path.resolve(opts.out || path.join(root, 'output', 'pdf', 'Karson-Miller-Resume.pdf'));
        await mkdir(path.dirname(output), { recursive: true });
        await page.pdf({ path: output, format: 'Letter', preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
        console.log(`Wrote ${path.relative(root, output)}`);
    } finally { await browser.close(); }
}

try {
    const command = process.argv[2] || 'help';
    if (['help', '--help', '-h'].includes(command)) {
        console.log(help);
    } else {
        const opts = options(process.argv.slice(3));
        const file = opts.resume ? path.resolve(opts.resume) : path.join(root, 'resume.json');
        if (!existsSync(file)) throw new Error(`Resume file not found: ${file}`);
        if (command === 'validate') {
            await loadResume(file); console.log(`${path.relative(root, file)} is valid JSON Resume.`);
        } else if (command === 'build') {
            await build(file, opts.out ? path.resolve(opts.out) : path.join(root, 'res.html'));
        } else if (command === 'serve') {
            await serve(file, opts);
        } else if (command === 'pdf') {
            await pdf(file, opts);
        } else { throw new Error(`Unknown command: ${command}\n\n${help}`); }
    }
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
}
