# Test Plan and Results

Data: 10 authors, 18 books, 12 payouts. Tested on **3 Nov 2026**. The badge results below depend on today's date, because every payout in the data is from 2025.

Logins: author `priya.sharma@email.com`, admin `diya.chatterjee@email.com` (password `Test@1234`).

---

## 1. Badge check per author

Every payout date is from 2025, so every author with pending money shows Overdue (red) on 3 Nov 2026.

| Author | Books | Total earned | Total paid | Total pending | Expected admin badge | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Priya Sharma | 2 | ₹19,908 | ₹16,338 | ₹3,570 | Overdue | One book paid up, one pending |
| Rohit Kapoor | 2 | ₹84,024 | ₹71,000 | ₹13,024 | Overdue | Highest sales |
| Ananya Reddy | 1 | ₹2,546 | ₹0 | ₹2,546 | Overdue | Never paid |
| Vikram Joshi | 2 | ₹15,195 | ₹11,845 | ₹3,350 | Overdue | One book paid up, one pending |
| Meera Nair | 2 | ₹25,295 | ₹22,240 | ₹3,055 | Overdue | One book paid up, one pending |
| Arjun Malhotra | 1 | ₹2,464 | ₹0 | ₹2,464 | Overdue | Never paid |
| Sneha Kulkarni | 3 | ₹60,865 | ₹53,000 | ₹7,865 | Overdue | One book in production (In production badge) |
| Farhan Sheikh | 1 | ₹3,120 | ₹3,120 | ₹0 | Fully paid | Only author with nothing pending |
| Kavita Deshmukh | 2 | ₹850 | ₹0 | ₹850 | Overdue | One book in production |
| Diya Chatterjee | 2 | ₹29,115 | ₹25,000 | ₹4,115 | Overdue | |

On the admin page, the Overdue filter should list 9 authors, and Fully paid should list only Farhan. Earlier versions of these docs expected some Pending (yellow) badges and an Overdue list of only Ananya and Arjun. That was wrong for this date.

The totals in this table match `data/bookleaf-sample-data.json`.

---

## 2. Test scenarios and results

| # | Scenario | Steps | Expected | Result |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Author sees only own data | Log in as Priya. Open `dashboard`. | Only her 2 books. Totals ₹19,908 / ₹16,338 / ₹3,570. | Pass. Only her 2 books, totals matched. |
| 2 | Non-admin blocked from admin | As Priya, open `/admin`. | Sent back to `index`. | Pass. Sent to the login page. |
| 3 | Admin list and badges | Log in as Diya. Open `admin`. | 10 authors. 9 show Overdue (red), Farhan shows Fully paid. | Pass. Badges are red Overdue for the 9 authors and Fully paid for Farhan. They take a few seconds to load and show the default color first. |
| 4 | Filters and search | On `admin`, filter by city, filter by payout status, search by name. | List narrows correctly. Overdue filter shows 9 authors. | Not recorded yet. |
| 5 | Single send | Open `author_detail` for Priya. Click Generate & Send Royalty Summary. | Log row is created as Processing, button shows "Generating...", then log becomes Success with subject and body. | Pass. Gemini wrote the email and the log showed Success. |
| 6 | Double click | Click Generate again for Priya within 2 minutes. | No second email. Extra requests are rejected. | Pass. n8n rejected both extra requests. They were logged as Failed with "Duplicate request ignored: a summary for this author was triggered in the last 2 minutes". |
| 7 | Bulk send | On `admin`, click Send summaries to all authors with pending royalties. | One author at a time, about 5 seconds between checks. Farhan not queued. Page shows "Sending summaries: N remaining". | Pass. 8 authors went through Gemini one after another, about 15 to 18 seconds apart. Priya was skipped as a duplicate because I had just tested her. Farhan was not queued. |
| 8 | Wrong API key | Call the webhook with a wrong `x-api-key` (for example from a REST client). | n8n rejects with 403. | Not recorded yet. |
| 9 | Bad payload | Send a request with `books` empty or not an array. | 400 from "Respond: rejected", log becomes Failed with "Invalid payload". | Not recorded yet. The first API Connector initialize hit this (400, "books must be an array") before I added sample values. |
| 10 | Gemini fault injection | In n8n, set an invalid model name in the HTTP Request URL, or use an invalid Gemini key. Trigger a summary. | After 3 tries, the run goes to "Respond: Failed". Bubble marks the log Failed with the error. No endless spinner. | Not recorded yet. In real use, `gemini-2.5-flash` returned 404, which is this same failure type. |
| 11 | n8n down or slow | Deactivate the workflow, trigger a summary. | Bubble keeps going (errors are included in the response), log becomes Failed, button re-enables. | Not recorded yet. |
| 12 | Sign-up with unknown email | On `index`, create an account with an email that is not on an Author record. | Message "This email is not registered as a BookLeaf author", user logged out. | Not recorded yet. |
| 13 | SMTP | Activate the SMTP node and send. | Email arrives. | Not tested. The SMTP node is deactivated. |

TODO (Karan): fill in the "Not recorded yet" rows if you test them before submitting, or leave them as they are.

---

## 3. Notes

- Notification statuses are Processing, Success and Failed. There is no "In Progress".
- The webhook auth failure is a 403 from n8n, not a 401.
- There is no callback. n8n returns the result in the webhook response, and Bubble updates the log in the same workflow.
- The email subject shows in the notification log. There is no "View Email Draft" button.
