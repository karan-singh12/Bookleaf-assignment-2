# BookLeaf Author Royalty Dashboard & Notification System

Technical take-home assignment 2, Full-Stack Developer position (Bubble + n8n + AI)
**Author:** Karan Singh

---

## Links

- **Bubble app:** https://karan637844.bubbleapps.io/version-test
- **Test author login:** `priya.sharma@email.com` / `Test@1234`
- **Test admin login:** `diya.chatterjee@email.com` / `Test@1234`
- **n8n workflow export:** `./n8n/n8n_workflow.json`
- **Screen recording:** https://drive.google.com/file/d/13Cv9vdKKv2dGZJBDIekzseyW5EkvFskj/view?usp=sharing

The app is on Bubble's free plan, using the `version-test` URL. It can be slow to load.

## Folder layout

```text
README.md                  this file
PROMPTS.md                 the AI prompt, as built in n8n
TEST_PLAN_EDGE_CASES.md    test scenarios and results
RECORDING_SCRIPT.md        notes for the screen recording
n8n/n8n_workflow.json      workflow export
data/bookleaf-sample-data.json   the provided dataset
scripts/convert_data.js    turns the dataset into authors.csv and books.csv
scripts/convert_data.py    same thing in Python
```

Run either script from anywhere. It reads `data/bookleaf-sample-data.json` and writes the CSVs to `data/bubble_csv/`.

---

## 1. Database design

I split the sample data into Bubble data types: User, Author, Book, Payout and Notification Log. The data loaded is 10 authors, 18 books and 12 payouts.

```text
User ---------------- Author ----------------< Book
 | email                | author_id             | book_id
 | role (Role)          | name, email, phone    | author (Author)
 | author (Author)      | city, joined_date     | title, isbn, genre
                        | user (User)           | status (text)
                        |                       | publication_date, mrp
                        |                       | author_royalty_per_copy
                        |                       | total_copies_sold
                        |                       | total_royalty_earned
                        |                       | royalty_paid
                        |                       | royalty_pending
                        |                       | last_royalty_payout_date
                        |                       | print_partner
                        |                       | available_on (list of text)
                        |
                        +----< Payout: author, book, amount, payout_date
                        +----< Notification Log: author, status, triggered_by (User),
                                 triggered_at, completed_at, email_subject,
                                 email_body, error_message
```

| Data type | Fields |
| :--- | :--- |
| User | email (built-in), role (option set Role), author (Author) |
| Author | author_id, name, email, phone, city, joined_date, user (User, optional reverse link) |
| Book | book_id, author, title, isbn, genre, status (text), publication_date, mrp, author_royalty_per_copy, total_copies_sold, total_royalty_earned, royalty_paid, royalty_pending, last_royalty_payout_date, print_partner, available_on (list of texts) |
| Payout | author, book, amount, payout_date |
| Notification Log | author, status (option set Notification Status), triggered_by (User), triggered_at, completed_at, email_subject, email_body, error_message |

There are only two option sets: Role (author, admin) and Notification Status (Processing, Success, Failed). Book status, print partner and platforms are plain text fields, because they come straight from the dataset.

Why I structured it this way:

- **User and Author are separate.** User is Bubble's login record. Author is the business record from the dataset. The Author rows existed before anyone signed up, so the User links to an Author (`User.author`) when they create an account. `Author.user` is an optional link back.
- **Books hold the royalty totals.** The dataset gives earned, paid and pending per book, so I stored them on Book as given. I did not add cached totals on Author. The author totals are calculated in Bubble from the author's books.
- **Payout is its own table.** It has 12 records, each tied to an author and a book. The author detail page uses it for payout history.
- **Notification Log is the record of every send.** It stores the subject, body and any error, so each attempt can be checked later.

### Sign-up and roles

A user signs up on the `index` page with an email that already exists on an Author record. The sign-up workflow sets role = author and links `User.author` to that Author. If no Author has that email, the page shows "This email is not registered as a BookLeaf author" and logs the user out. Admin is set by hand in the Data tab (role = admin).

### Pages

- `index`: login and create account.
- `dashboard`: the author's own page. Totals, book list and a badge per book.
- `admin`: author list with filters and search, the bulk send button, and the global notification log.
- `author_detail`: one author. Info, totals cards, books, payout history, that author's notification log, and the "Generate & Send Royalty Summary" button. This is a separate page, not a popup.

### Badge rules

| Badge | Rule |
| :--- | :--- |
| Paid up | pending = 0 |
| Pending | pending > 0 and last payout within 90 days |
| Overdue | pending > 0 and either the last payout was over 90 days ago, or never paid and published over 90 days ago |
| In production | status does not contain "Published". This overrides the others. |

On the admin list, an author is Overdue if any book is overdue, else Pending if any book is pending, else Fully paid.

The badges depend on today's date. Every payout in the data is from 2025, so on 3 Nov 2026 every author with pending money shows Overdue. It would look different if I ran it with an earlier date.

---

## 2. Privacy rules

| Data type | Who | Condition | Access |
| :--- | :--- | :--- | :--- |
| Author | Admin | Current User's role is admin | Everything |
| | Own author | This Author's email = Current User's email | All fields |
| Book | Admin | Current User's role is admin | Everything |
| | Owner | This Book's author = Current User's author | All fields |
| Payout | Admin | Current User's role is admin | Everything |
| | Owner | This Payout's author = Current User's author | All fields |
| Notification Log | Admin | Current User's role is admin | Everything |
| | Authors | none | No access |
| User | Self and Admin | | |

Authors cannot see notification logs at all. Non-admins who open `admin` or `author_detail` are sent back to `index`.

I checked this by logging in as Priya. Her dashboard shows only her 2 books, with totals of ₹19,908 earned, ₹16,338 paid and ₹3,570 pending. Opening `/admin` as Priya sends her to the login page.

---

## 3. Bubble and n8n integration

### Flow

```text
Bubble (admin clicks Generate)
  |
  | 1. If this author has a Processing log from the last 2 minutes:
  |    show "A summary for this author is already in progress" and stop
  | 2. Create Notification Log, status = Processing
  | 3. API Connector "BookLeaf n8n" -> generate_royalty_summary
  |      POST https://karansingh.app.n8n.cloud/webhook/bookleaf-royalty-summary
  |      header x-api-key: <secret>
  |      body: log_id, author_id, author_name, author_email, books[]
  v
n8n
  Webhook (Header Auth)
   -> Validate & De-duplicate (Code)
   -> IF valid and not duplicate
        no  -> Respond: rejected (400 invalid, 409 duplicate)
        yes -> Build prompt (Code)
            -> AI: generate email (Gemini, HTTP Request)
                 error -> Respond: Failed
            -> Parse AI output (Code)
            -> IF parsed OK
                 no  -> Respond: Failed
                 yes -> Send email (SMTP, deactivated)
                     -> Respond: Success
  |
  | response: {status, log_id, subject, body, error, completed_at}
  v
Bubble
  4. Update the log: Success or Failed, subject, body, error, completed_at
```

The logic lives in one reusable element, `send_summary` (a custom event with an Author parameter). The single button and the bulk send both use it.

### The response is synchronous

n8n answers the webhook with the final result, and Bubble writes that into the log in the same workflow. There is no callback, no Data API PATCH, and no "reply 200 first, process later" step. I chose this for three reasons:

- n8n does not need a Bubble API token.
- There is one less public endpoint to protect.
- Gemini answers well inside the timeout, so waiting for it is fine.

### Why the full payload goes in the webhook

n8n could read the author and books through Bubble's Data API. I send the data in the webhook instead, because:

- Bubble already has the data with privacy rules applied.
- n8n does not need a Bubble token.
- It is one less network hop that can fail.

The `books` field is a JSON array built in Bubble.

### Security

The webhook uses n8n's built-in Header Auth. Bubble sends a shared secret in the `x-api-key` header, and n8n checks it on the Webhook node. A wrong key gets a 403 from n8n. The secret is stored in the Bubble API Connector and as an n8n credential. It is not in this repo.

The Gemini key is also an n8n credential (Google Gemini(PaLM) Api), so it is not in the workflow JSON.

### Double clicks (idempotency)

There are two layers:

1. **Bubble.** Before sending, `send_summary` checks for a Processing log for the same author from the last 2 minutes. If there is one, it shows the alert and stops. The button shows "Generating..." and is disabled while a Processing log exists.
2. **n8n.** The "Validate & De-duplicate" Code node keeps a timestamp per author in workflow static data. A second request for the same author within 120 seconds gets a 409 and is not sent to Gemini.

Limit: n8n records the timestamp when the request is accepted, not when it succeeds. If the Gemini call then fails, a retry for that author is also rejected until the 2 minutes pass.

### Bulk send

The "Send summaries to all authors with pending royalties" button fills a page state `bulk_queue` with the authors who have any book with royalty_pending > 0. A "Do every 5 seconds" event sends the first author in the queue when nothing is Processing, then removes that author from the queue. The page shows "Sending summaries: N remaining". Authors go through one at a time, so n8n and Gemini are never hit in parallel.

---

## 4. Prompt strategy

The prompt is built in the "Build prompt" Code node. Full details are in [PROMPTS.md](PROMPTS.md). In short:

- Bubble sends the raw book rows. The Code node does the sums (total earned, paid, pending), splits published books from books in production, and works out the next payout date. The model gets these as facts and does not do any arithmetic.
- The system prompt sets the tone and tells the model to use only the given facts and not invent numbers, dates or policies.
- The user prompt lists seven requirements: greet by first name, per-book figures, totals, next payout date if anything is pending, thanks if all paid up, a status line for books in production, and a "Team BookLeaf" sign-off.
- Gemini is asked for JSON (`{"subject", "body"}`) at temperature 0.4. A Code node parses it and fails the run if the JSON is missing a subject or body.

The payout rule in the prompt (calculated quarterly, paid within 45 days of the quarter closing) is an assumption I wrote in the code. I still need to check it against the Assignment 1 Knowledge Base. The prompt does not include the 80/20 split or the ₹1,000 threshold.

---

## 5. Error handling

**In n8n**

- The Gemini call retries up to 3 times, 2 seconds apart, with a 40 second timeout. The node is set to "continue (using error output)", so after the retries a failure goes to "Respond: Failed" and not to a dead end.
- If Gemini answers but the JSON is unusable, "Parsed OK?" sends it to "Respond: Failed".
- Bad payloads (missing author_id, log_id, or `books` not an array) and duplicates go to "Respond: rejected" with 400 or 409.
- Every path ends in a Respond node, so Bubble always gets an answer.
- The SMTP node is set to continue on error, but it is deactivated (see limits).

**In Bubble**

"Include errors in response and allow workflow actions to continue" is on for the API call. If n8n is down or times out, the workflow still runs, the log becomes Failed with the error, and the button does not spin forever.

---

## 6. Challenges and learning

1. **Gemini model was gone.** `gemini-2.5-flash` started returning 404 ("no longer available to new users"). I switched the HTTP Request URL to `gemini-3.8-flash`.
2. **Header names did not match.** Bubble sent `X-BookLeaf-Secret`, but n8n's Header Auth expected `x-api-key`. Calls failed until I made them the same.
3. **API Connector initialize returned 400.** The error was "books must be an array", because the test values were empty. I added sample values so the initialize call sends a real array.
4. **No visible sign-up.** The Create account button was white text with a white border on a white card, so it looked like there was no sign-up option. I fixed the colors.
5. **Users made in the Data tab cannot log in.** They have no password. Accounts have to be created through Create account, and then I set the admin role by hand.
6. **Slow badges on the free plan.** The admin badges take a few seconds to calculate, so they briefly show the default color before switching to the right one.

<!-- TODO (Karan): the old README had a note about importing the CSV (author links coming in as text). I could not confirm it from the build, so I removed it. Add a line here about how the data was actually imported, if you want it. -->

---

## 7. What I tested (3 Nov 2026)

- **Author privacy:** Priya's dashboard shows only her 2 books. Opening `/admin` as Priya sends her to the login page.
- **Single send:** Generate for Priya worked. Gemini wrote the email and the log showed Success.
- **Double click:** I clicked again within 2 minutes. n8n rejected both extra requests, and they were logged as Failed with "Duplicate request ignored: a summary for this author was triggered in the last 2 minutes". No second email. This is the n8n-side de-dupe working.
- **Bulk send:** 8 authors went through Gemini one after another, about 15 to 18 seconds apart. Priya was skipped as a duplicate because I had just tested her. Farhan was not queued because he has nothing pending.
- **Badges:** every author with pending money shows Overdue (Priya, Rohit, Ananya, Vikram, Meera, Arjun, Sneha, Kavita, Diya). Only Farhan shows Fully paid.

The full list is in [TEST_PLAN_EDGE_CASES.md](TEST_PLAN_EDGE_CASES.md).

---

## 8. Known limits

- The SMTP node is built but deactivated. Emails are not sent. The generated subject and body are saved in the Notification Log instead.
- The app is on Bubble's free plan, so pages and badges are slow.
- A failed run still blocks a retry for the same author for 2 minutes (see Double clicks).
- n8n's duplicate check uses workflow static data, so it is a simple in-memory style check and not a database.
