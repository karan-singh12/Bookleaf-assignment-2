"""
convert_data.py
Converts bookleaf-sample-data.json into Bubble-ready CSV files.
Generates:
  1. authors.csv
  2. books.csv
"""

import json
import csv
import os

input_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/bookleaf-sample-data.json'))
output_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../data/bubble_csv'))

os.makedirs(output_dir, exist_ok=True)

with open(input_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 1. Authors CSV
author_file = os.path.join(output_dir, 'authors.csv')
with open(author_file, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow(['author_id', 'name', 'email', 'phone', 'city', 'joined_date', 'role'])
    for a in data.get('authors', []):
        writer.writerow([
            a.get('author_id', ''),
            a.get('name', ''),
            a.get('email', ''),
            a.get('phone', ''),
            a.get('city', ''),
            a.get('joined_date', ''),
            'author'  # Default role for Bubble auth & privacy rules
        ])

print(f"Exported {len(data.get('authors', []))} authors to {author_file}")

# 2. Books CSV
book_file = os.path.join(output_dir, 'books.csv')
book_count = 0
with open(book_file, 'w', newline='', encoding='utf-8') as f:
    writer = csv.writer(f)
    writer.writerow([
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
    ])
    for a in data.get('authors', []):
        for b in a.get('books', []):
            book_count += 1
            available_str = ", ".join(b.get('available_on', [])) if b.get('available_on') else ""
            writer.writerow([
                b.get('book_id', ''),
                a.get('author_id', ''),
                b.get('title', ''),
                b.get('isbn', ''),
                b.get('genre', ''),
                b.get('status', ''),
                b.get('publication_date') or '',
                b.get('mrp') if b.get('mrp') is not None else '',
                b.get('author_royalty_per_copy') if b.get('author_royalty_per_copy') is not None else '',
                b.get('total_copies_sold', 0),
                b.get('total_royalty_earned', 0),
                b.get('royalty_paid', 0),
                b.get('royalty_pending', 0),
                b.get('last_royalty_payout_date') or '',
                b.get('print_partner') or '',
                available_str
            ])

print(f"Exported {book_count} books to {book_file}")
