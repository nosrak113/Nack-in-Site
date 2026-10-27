const fs = require('node:fs');
const path = require('node:path');
const Handlebars = require('handlebars').create();

Handlebars.registerHelper('join', (values, separator) => (values || []).join(separator));

function dateLabel(date, yearOnly = false) {
    if (!date) return '';
    const [year, month] = date.split('-');
    return month && !yearOnly ? `${month.padStart(2, '0')}/${year}` : year;
}

function dateRange(item, present, separator = ' – ', yearOnly = false) {
    if (!item.startDate && !item.endDate) return '';
    return [dateLabel(item.startDate, yearOnly), dateLabel(item.endDate, yearOnly) || present].filter(Boolean).join(separator);
}

function safeUrl(url) {
    if (!url) return '';
    return /^https?:\/\//i.test(url) ? url : '';
}

// The standard JSON Resume theme interface: render(resume) -> HTML string.
exports.render = function render(resume) {
    const meta = resume.meta || {};
    const basics = resume.basics || {};
    const labels = {
        skills: 'Technical Skills', publications: 'Patents', education: 'Education', work: 'Experience',
        certificates: 'Certifications', earlyCareer: 'Early Career', present: 'Present', phone: 'Phone:', email: 'Email:', website: 'Website:', location: 'Location:',
        ...meta.labels,
    };
    const work = resume.work || [];
    const location = basics.location || {};
    const website = safeUrl(basics.url);
    const template = Handlebars.compile(fs.readFileSync(path.join(__dirname, 'resume.hbs'), 'utf8'));
    return template({
        ...resume,
        basics,
        labels,
        language: meta.language || 'en',
        appTitle: meta.appTitle || basics.name,
        css: fs.readFileSync(path.join(__dirname, '..', 'css', 'res.css'), 'utf8'),
        website,
        websiteLabel: website.replace(/^https?:\/\//, '').replace(/\/$/, ''),
        phoneLink: (basics.phone || '').replace(/[^+\d]/g, ''),
        locationLine: [location.city, location.region].filter(Boolean).join(', '),
        work: work.filter(item => item.group !== 'earlyCareer').map(item => ({ ...item, dates: dateRange(item, labels.present) })),
        earlyWork: work.filter(item => item.group === 'earlyCareer').map(item => ({ ...item, dates: dateRange(item, labels.present, ' – ', true) })),
        publications: (resume.publications || []).map(item => ({ ...item, releaseDate: dateLabel(item.releaseDate, true) })),
        certificates: (resume.certificates || []).map(item => ({ ...item, issued: dateLabel(item.date, true) })),
        earlyCareer: { ...meta.earlyCareer, dates: dateRange(meta.earlyCareer || {}, labels.present, ' – ', true) },
    }).replace(/[\t ]+\n/g, '\n');
};
