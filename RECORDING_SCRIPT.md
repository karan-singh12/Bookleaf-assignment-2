# Screen recording script (about 4 to 5 minutes)

Talk normally. These are notes, not lines to read out. Have the n8n workflow open in one tab and the Bubble app in another. The badge results are for 3 Nov 2026.

---

## 0:00 to 0:30, Intro

Show the Bubble Data tab, then the n8n canvas.

> "Hi, I'm Karan. This is my submission for the royalty dashboard assignment. The app is in Bubble, and n8n handles the AI email. I'll show the author side, then the admin side, then send a summary and look at n8n."
>
> "The data is 10 authors, 18 books and 12 payouts. Users link to an Author, books link to an author, and payouts link to both an author and a book. There's a Notification Log table for every send."

## 0:30 to 1:30, Author portal

Log in as `priya.sharma@email.com`. Go to the `dashboard` page.

> "This is Priya. She sees only her 2 books. The cards at the top show 19,908 earned, 16,338 paid and 3,570 pending."
>
> "The badges are red Overdue. Every payout in the data is from 2025, and it's November 2026, so anyone with pending money is more than 90 days past their last payout. The badge depends on today's date."
>
> "Privacy is set in Bubble's privacy rules. Authors see their own author, books and payouts. They can't see notification logs. If I go to /admin as Priya, I get sent back to the login page."

Try `/admin` to show the redirect. Log out.

## 1:30 to 2:30, Admin portal

Log in as `diya.chatterjee@email.com`. Open `admin`.

> "Now I'm Diya, the admin. This is the author list with totals, filters and search. Nine authors show Overdue in red. Only Farhan shows Fully paid, because he has nothing pending."
>
> "On the free plan the badges take a few seconds, so they show the default color first and then switch."
>
> "At the bottom is the global notification log. There's also the bulk send button, which I'll come back to."

Briefly use a filter or the search.

## 2:30 to 3:30, Single send

Click an author (Priya), which opens `author_detail`.

> "This is a separate page for one author: info, cards, books, payout history, and her notification log."
>
> "I click Generate & Send Royalty Summary. The button changes to Generating... and a log row appears as Processing."

Wait for the row to turn Success.

> "It's now Success, and the email subject is in the log. Bubble waits for n8n's answer and writes it into the log in the same workflow. There's no callback."
>
> "If I click again now, nothing new is sent. Bubble checks for a Processing log from the last 2 minutes first, and n8n also rejects the same author within 120 seconds. When I tested that, n8n rejected both extra requests and they were logged as Failed with 'Duplicate request ignored'."

## 3:30 to 4:30, n8n

Switch to n8n. Open the latest execution.

> "Here's the execution. The webhook uses Header Auth with an x-api-key header. A wrong key gets a 403."
>
> "Then a Code node checks the payload and the duplicate rule. Build prompt does the totals and works out the next payout date. Then Gemini, with temperature 0.4 and JSON output. The Gemini node retries 3 times, and if it still fails it goes to Respond: Failed."
>
> "Parse AI output checks the JSON, and then Respond: Success sends the subject and body back to Bubble. Every path ends in a Respond node."
>
> "The email node is built, but it's deactivated. I didn't set up SMTP, so emails aren't actually sent. The subject and body are saved in the log."

## 4:30 to 5:00, Bulk send and wrap-up

Back on `admin`, click the bulk send button, then let it run for a few seconds.

> "Bulk send puts every author with a pending royalty into a queue, and sends one every 5 seconds when nothing is Processing. The page shows how many are left. When I ran it, 8 authors went through Gemini about 15 to 18 seconds apart. Priya was skipped as a duplicate because I'd just tested her, and Farhan wasn't queued."
>
> "The README has the schema, the privacy rules, the integration and the problems I hit along the way, like the Gemini model returning 404 and the header names not matching. Thanks for watching."
