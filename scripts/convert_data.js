/**
 * convert_data.js
 * Converts bookleaf-sample-data.json into Bubble-ready CSV files.
 * Generates:
 *  1. authors.csv (for Bubble 'Author' or 'User' data type)
 *  2. books.csv (for Bubble 'Book' data type, with foreign key author_id)
 */

const fs = require('fs');
const path = require('path');

const inputPath = path.resolve(__dirname, '../data/bookleaf-sample-data.json');
const outputDir = path.resolve(__dirname, '../data/bubble_csv');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const rawData = fs.readFileSync(inputPath, 'utf8');
const data = JSON.parse(rawData);

// Helper to escape CSV fields
function escapeCsv(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// 1. Authors CSV
const authorHeaders = [
  'author_id',
  'name',
  'email',
  'phone',
  'city',
  'joined_date',
  'role'
];

const authorRows = data.authors.map(a => [
  escapeCsv(a.author_id),
  escapeCsv(a.name),
  escapeCsv(a.email),
  escapeCsv(a.phone),
  escapeCsv(a.city),
  escapeCsv(a.joined_date),
  escapeCsv('author') // Role for Bubble auth / privacy
]);

const authorsCsvContent = [authorHeaders.join(','), ...authorRows.map(r => r.join(','))].join('\n');
fs.writeFileSync(path.join(outputDir, 'authors.csv'), authorsCsvContent, 'utf8');
console.log(`Exported ${authorRows.length} authors to ${path.join(outputDir, 'authors.csv')}`);

// 2. Books CSV
const bookHeaders = [
  'book_id',
  'author_id',
  'title',
  'isbn',
  'genre',
  'status',
  'publication_date',
  'mrp',
  'author_royalty_per_copy',
  'total_copies_sold',
  'total_royalty_earned',
  'royalty_paid',
  'royalty_pending',
  'last_royalty_payout_date',
  'print_partner',
  'available_on'
];

const bookRows = [];
for (const a of data.authors) {
  for (const b of a.books) {
    bookRows.push([
      escapeCsv(b.book_id),
      escapeCsv(a.author_id), // foreign key reference
      escapeCsv(b.title),
      escapeCsv(b.isbn),
      escapeCsv(b.genre),
      escapeCsv(b.status),
      escapeCsv(b.publication_date),
      escapeCsv(b.mrp !== null ? b.mrp : ''),
      escapeCsv(b.author_royalty_per_copy !== null ? b.author_royalty_per_copy : ''),
      escapeCsv(b.total_copies_sold),
      escapeCsv(b.total_royalty_earned),
      escapeCsv(b.royalty_paid),
      escapeCsv(b.royalty_pending),
      escapeCsv(b.last_royalty_payout_date),
      escapeCsv(b.print_partner || ''),
      escapeCsv(b.available_on ? b.available_on.join(', ') : '') // Bubble accepts comma-separated lists for text lists
    ]);
  }
}

const booksCsvContent = [bookHeaders.join(','), ...bookRows.map(r => r.join(','))].join('\n');
fs.writeFileSync(path.join(outputDir, 'books.csv'), booksCsvContent, 'utf8');
console.log(`Exported ${bookRows.length} books to ${path.join(outputDir, 'books.csv')}`);

