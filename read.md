Annony — Anonymous Q&A Forum

Overview

annony is a small static Anonymous Q&A Forum built with plain HTML/CSS/JS. It stores posts, comments, scores and per-browser vote state in localStorage so it works offline and without a server (single-browser demo).

Files

- `index.html` — main page
- `styles.css` — styling and theme (Reddit-like colors)
- `script.js` — app logic (posts, comments, votes, search, highlights)

Features

- Create posts with title, description and tags
- Nested comments and replies
- Per-post and per-comment upvote/downvote (one vote per browser)
- Client-side search with highlighted matches
- Persistent data in `localStorage` (survives reload on same browser)

How to run locally

- Double-click `index.html` or open it in your browser. Works for most testing.

Deployment (static hosts)

This is a static site.

Limitations

- Data is stored in the browser's `localStorage`: posts and votes are local to the browser/device. Users on other devices or browsers will not share data.
- `localStorage` can be cleared by users or the browser.
- Per-user uniqueness is enforced only per-browser (not secure for production).