# Nack resume

The resume's content lives in [`resume.json`](resume.json), using the
[JSON Resume schema](https://github.com/jsonresume/jsonresume.org/tree/master/packages/schema).
The local theme uses a full-width main column for contact information, a professional
summary, skills, education, experience, patents and certifications.
Print uses the same composition on US Letter. Screen layout keeps the live site's
fixed 1024px width, including its column widths and type sizes in narrow windows.

## Setup and commands

Install Node.js 22 or newer, then run `npm ci`.

| Command | Result |
| --- | --- |
| `npm run validate` | Validate the data against the official JSON Resume schema. |
| `npm run build` | Validate and regenerate `res.html`, the site's existing resume page. |
| `npm run dev` | Build, preview, watch edits and reload the browser automatically. |
| `npm run preview` | Build and preview without watching files. |
| `npm run pdf` | Export `output/pdf/Karson-Miller-Resume.pdf` using Google Chrome. |
| `npm run help` | List commands and options. |

The preview opens at <http://127.0.0.1:4000/res.html>. It binds only to the local
computer. Stop it with Ctrl+C. `dev` watches the JSON, template, theme renderer,
stylesheet and local logo. Invalid edits report an error and keep the last valid
preview until corrected. Refresh manually when using `preview` after a restart.

Examples:

```sh
npm run dev -- --port 4100
npm run build -- --out output/resume.html
npm run validate -- --resume /path/to/another-resume.json
npm run pdf -- --out output/pdf/resume.pdf
```

PDF export uses an installed Google Chrome. Microsoft Edge is supported with
`--browser msedge`. Alternatively, install Playwright's Chromium:

```sh
npx playwright install chromium
npm run pdf -- --browser chromium
```

Browser printing also works: open `res.html`, select Letter paper, use the default
100% scale and disable browser headers/footers. The print stylesheet sets the page
size, margins and scale. It keeps headings with following text and allows added
content to continue onto subsequent pages.

## Editing

- **Content:** `resume.json`. Dates use `YYYY-MM` or `YYYY`; omit `endDate` for a
  current job. `basics.summary` supplies the professional summary. A newline in `basics.label` keeps the existing subtitle line break.
- **Markup:** `theme/resume.hbs`, a Handlebars template. Text is escaped automatically.
- **Presentation:** `css/res.css`, shared screen and print styling.
- **Rendering:** `theme/index.cjs`, exporting the standard `render(resume)` theme
  interface. Local images are resolved from this repository's root.
- **Commands:** `scripts/resume.mjs`.

Run `npm run build` after edits and commit the regenerated `res.html` along with the
source files. The site remains static and needs no Node.js at hosting time. The
generated HTML embeds its CSS and logo, so it also opens directly from disk and
can be copied elsewhere. The preview's reload script is never included in this
file. `pdf` reads the sources directly and does not overwrite `res.html`.

## JSON Resume mapping

Contact details use `basics`; skill categories use `skills`; education uses
`education`; all eleven roles, including early career, use `work`. Patents use
`publications` so other JSON Resume themes retain their titles, publishers and
years. No previously hidden accordion content is included.

These small extensions are allowed by the official schema:

| Field | Purpose |
| --- | --- |
| `publications[].reference` | Patent number. |
| `publications[].type` | Identifies a patent publication. |
| `work[].group: "earlyCareer"` | Groups the three early roles under the existing heading. |
| `work[].selfEmployed` | Keeps the self-employment entry's separator. |
| `meta.earlyCareer` | The existing combined early-career location and date range. |
| `meta.labels`, `meta.language`, `meta.appTitle` | Section/contact labels and page metadata. |
| `meta.theme` | Identifies this local theme. |

Other themes can render the standard fields and ignore these extensions. The local
theme can also be called directly after `npm ci`:

```js
const { render } = require('./theme');
const resume = require('./resume.json');
const html = render(resume);
```
