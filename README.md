# SP CET Portal (working prototype)

A static website that gives schools one shared hub for four resource areas:

1. CET Handbook
2. Full Qualification programmes and short courses, by school
3. Best practices, by CET archetype and school
4. A collaboration space for partnership opportunities, capability requests, resources and CET events

> **Prototype:** the records shown are demonstration content, not verified SP course or policy information. Review and replace them with approved information before wider use. Do not add personal data or restricted information.

No React, Node.js, npm or build step is used: it is plain HTML, CSS and JavaScript, so it works on GitHub Pages as-is.

## Files

| Path | Purpose |
| --- | --- |
| `index.html` | Portal home page (wording and layout) |
| `styles.css` | Look and feel. SP red/charcoal colours are at the top (`:root`) |
| `app.js` | Loads `data/content.json`, search, filters and the post form |
| `data/content.json` | **All cards** (handbook, courses, practices, opportunities) |
| `handbook/index.html` | CET Handbook landing page |
| `applications/` | Course document application and approval prototype (`index.html`, `applications.js`) |
| `data/applications.json` | Required documents, schools, course types and example applications |
| `assets/` | Images and icons (`favicon.svg`) |

## Updating content (no programming needed)

### Cards on the home page
Open `data/content.json` and edit the `items` list. Each record looks like this:

```json
{
  "id": "crs-003",
  "type": "course",
  "tag": "Short Course",
  "title": "Course title",
  "desc": "One or two sentences.",
  "owner": "School name",
  "meta": "Short course",
  "link": "optional/page.html"
}
```

- `type` must be one of `handbook`, `course`, `practice`, `opportunity`.
- Copy a whole record (from `{` to `}`), keep a comma between records, and keep the quotation marks.
- `link` is optional (relative page or `https://` address).
- Check your edit at <https://jsonlint.com> before saving. A mistake shows an error message on the page instead of the cards.

### Handbook page
Edit `handbook/index.html`. Comments at the top explain how to add a topic or link a document (put files in the `handbook/` folder).

### Wording and colours
Headings and text are in `index.html`; colours are in `styles.css`.

## Course document applications and approvals
`applications/index.html` is a working **prototype** of the workflow: a school submits a course application with its documents, an approver starts a review and then approves, returns it for changes (with a comment) or rejects it, and the school can resubmit. Every step is recorded in the application's history.

- Edit required documents, schools, course types and example applications in `data/applications.json`.
- Statuses: Submitted → Under review → Approved / Returned for changes / Rejected (returned applications can be resubmitted).
- Approval is blocked while a required document is missing; returning or rejecting needs a comment.
- **Limits of the prototype:** records are saved only in the visitor's browser; files are *not* uploaded (only file names are recorded); there is no login, so the "Viewing as" switch is a demonstration and not access control. A real process needs an approved back-end with SP sign-in, secure file storage and audit logging. Do not enter personal or restricted information.

## Post form
"Post opportunity" posts are saved **only in the visitor's own browser** (localStorage). They are not shared between users or sent to any SP system. A shared, moderated collaboration space would need an approved back-end service.

## Preview locally
Browsers block loading `data/content.json` when `index.html` is opened by double-clicking. Use any simple web server, for example:

```sh
python3 -m http.server 8000
```
then open <http://localhost:8000>.

## Publishing on GitHub Pages
1. Edit files on GitHub (pencil icon) or upload them, and commit to a branch.
2. Open a pull request and have the content owner review it.
3. After merging to `main`: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, choose `main` and `/ (root)`, then Save.
4. The site appears at `https://<owner>.github.io/<repo>/` within a few minutes.

All links are relative, so the site works under the repository sub-path.
