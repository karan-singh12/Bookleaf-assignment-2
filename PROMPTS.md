# Prompts

This describes the prompt that is actually in the workflow. It is built in the **Build prompt** Code node and sent to Gemini (`gemini-3.8-flash`) by the **AI: generate email (Gemini)** HTTP Request node.

---

## 1. What the Build prompt node does

Bubble sends the author's books as a JSON array. The node works out everything numeric before the model sees it:

- Splits books into published (status starts with "Published") and in production (everything else).
- Adds up total earned, total paid and total pending across the author's books, formatted as ₹ in Indian number style.
- Works out `all_paid_up` (total pending is 0).
- Finds the end of the current quarter and adds 45 days to get `next_payout_expected_by`.
- Builds a `facts` object with the author name, totals, those dates, the published books and the books in production.

The model only writes the email around these facts. It does not do arithmetic.

The Gemini call uses temperature 0.4, JSON output (`responseMimeType: application/json`), `maxOutputTokens` 2048 and a 40 second timeout.

## 2. System prompt

```text
You write royalty summary emails for BookLeaf Publishing, an Indian self-publishing house. Tone: warm, respectful, clear and professional; no hype, no emojis. Use only the facts given; never invent numbers, dates or policies. Amounts are in Indian Rupees exactly as given.
```

## 3. User prompt

```text
Write a royalty summary email for this author. Requirements:
1. Greet the author by first name.
2. For each published book give copies sold, royalty earned, paid and pending.
3. Give a clear breakdown of total earned, total paid and total pending.
4. If total pending is above zero, explain that royalties are calculated quarterly and paid within 45 days of the quarter closing, so the next payout is expected by <next_payout_expected_by>.
5. If everything is paid up, thank them and acknowledge that they are fully up to date.
6. If any books are in production, add a short status line for each.
7. Close warmly as 'Team BookLeaf'.
Return ONLY JSON: {"subject": string, "body": string} where body is plain text with line breaks.

FACTS:
<the facts object as JSON>
```

The `facts` object looks like this:

```json
{
  "author_name": "...",
  "totals": { "earned": "₹...", "paid": "₹...", "pending": "₹..." },
  "all_paid_up": false,
  "current_quarter_ends": "...",
  "next_payout_expected_by": "...",
  "published_books": [
    { "title": "...", "copies_sold": 0, "earned": "₹...", "paid": "₹...", "pending": "₹...", "last_payout": "... or 'no payout yet'" }
  ],
  "books_in_production": [ { "title": "...", "status": "..." } ]
}
```

## 4. What the prompt covers, and what it does not

| Policy point | In the prompt? |
| :--- | :--- |
| Quarterly cycle | Yes |
| 45-day window | Yes |
| Next payout date | Yes, calculated in code |
| In-production books get a status line | Yes |
| Warm, professional tone | Yes |
| Thank the author when all paid up | Yes |
| ₹1,000 minimum payout | No |
| 80/20 split | No |
| Special wording for overdue authors | No. The author is told what is pending and when the next payout is expected. |

The quarterly cycle and 45-day window are my assumption from Assignment 1. The Code node has a comment saying to check them against the Knowledge Base. I have not confirmed this yet.

The next payout date is the end of the **current** quarter plus 45 days. Run on 3 Nov 2026, that is 31 Dec 2026 + 45 days = 14 February 2027. It will change with the date the workflow runs.

## 5. Output handling

The **Parse AI output** node strips code fences if there are any, parses the JSON, and checks that `subject` and `body` exist. If not, it returns `ok: false` and the run goes to **Respond: Failed** with "AI response was not valid JSON with subject and body". On success, n8n returns `{status, log_id, subject, body, error, completed_at}` to Bubble, which saves it on the Notification Log.

## 6. Sample output

These two are examples of what the prompt should produce. They are **sample output, not saved runs**, written to match the prompt and the dataset figures. Real emails will differ in wording. Next payout date assumes the workflow runs on 3 Nov 2026.

### Sample 1: author with a book in production (Sneha Kulkarni)

**Subject:** Your BookLeaf royalty summary

Dear Sneha,

Here is your latest royalty summary.

The Algorithm of Love: 1,567 copies sold. Royalty earned ₹39,175, paid ₹35,000, pending ₹4,175.

Ctrl+Alt+Delete My Ex: 723 copies sold. Royalty earned ₹21,690, paid ₹18,000, pending ₹3,690.

Across your books, you have earned ₹60,865, been paid ₹53,000, and have ₹7,865 pending.

Royalties are calculated quarterly and paid within 45 days of the quarter closing, so your next payout is expected by 14 February 2027.

Your book Midnight in Mysore is currently in Cover Design.

Thank you for writing with us.

Team BookLeaf

### Sample 2: author with no payout yet (Ananya Reddy)

**Subject:** Your BookLeaf royalty summary

Dear Ananya,

Here is your latest royalty summary.

Between Two Temples: 67 copies sold. Royalty earned ₹2,546, paid ₹0, pending ₹2,546. No payout has been made yet.

In total, you have earned ₹2,546, been paid ₹0, and have ₹2,546 pending.

Royalties are calculated quarterly and paid within 45 days of the quarter closing, so your next payout is expected by 14 February 2027.

Thank you for writing with us.

Team BookLeaf