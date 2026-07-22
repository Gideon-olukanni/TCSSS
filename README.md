# Tomia Community Senior Secondary School — Website

Official website for Tomia Community Senior Secondary School, Alagbado, Alimosho Education District I, Lagos State.

**"Excellence in Learning and Character"**

A fast, static multi-page site with a Firebase-backed admin panel so staff can update news, gallery, leadership, and contact info without touching code.

---

## Pages

| Page | File | Purpose |
|---|---|---|
| Home | `index.html` | Landing page, school overview |
| About | `about.html` | School history, mission, vision |
| Academics | `academics.html` | Subjects, curriculum, programs |
| Student Life | `student-life.html` | Clubs and student activities |
| Leadership | `leadership.html` | Principal's message, executive council, past principals |
| Gallery | `gallery.html` | Photo gallery, filterable by category |
| News | `news.html` | News and announcements |
| Contact | `contact.html` | Contact details and location |
| Admin | `admin.html` | Password-protected dashboard for editing site content |

---

## Tech Stack

- **Frontend:** Static HTML/CSS/JS — no build step, no framework. A shared design system (colors, type, spacing tokens) is defined once in `index.html`'s `<style>` block and reused across pages.
- **Backend:** [Firebase](https://firebase.google.com/) (project: `tomia-web`)
  - **Firestore** — content storage (news, gallery photos, council members, principals, clubs, leadership messages, contact info)
  - **Authentication** — email/password login gating the admin panel
- **Fonts:** Google Fonts (Lora, Work Sans, JetBrains Mono)
- **Analytics:** Google Analytics 4
- **Search:** Google Search Console

---

## Admin Panel

`admin.html` + `admin.js` provide a dashboard for non-technical staff to manage:

- News & announcements
- Executive council members (all prefect roles)
- Principals (past & present)
- Gallery photos, by category
- Clubs
- Leadership messages
- Contact information

Access is restricted to signed-in users via Firebase Authentication. To add an admin user, create one in the Firebase Console under **Authentication → Users**.

---

## Firebase Setup

Configuration lives in `firebase-config.js` and is shared by the public site and the admin dashboard. It's already connected to the `tomia-web` Firebase project — no setup needed unless migrating to a new project, in which case replace the `firebaseConfig` object with your own project's credentials from the Firebase Console (**Project Settings → General → Your apps**).

**Firestore collections used:**
```
news
executiveCouncil
principals
galleryPhotos
clubs
leadershipMessages (single doc: "main")
contactInfo (single doc: "main")
```

---

## Analytics & Search Console

Already wired into every page's `<head>`:

- **Google Analytics 4** — Measurement ID `G-ZZN4HL15KF` (same property linked to the Firebase project)
- **Google Search Console** — verified via HTML meta tag

No further setup needed. Traffic data appears in the [GA4 dashboard](https://analytics.google.com) in real time; Search Console indexing data typically takes a day or two after deployment to populate.

---

## Deployment

This is a static site — any static host works (GitHub Pages, Firebase Hosting, Netlify, etc.). No build step is required; deploy the files as-is.

If deploying to a new domain, re-verify ownership in Search Console for that domain (a new "URL prefix" property may be required if the domain changes).

---

## Project Structure

```
TCSSS-main/
├── index.html            Home page
├── about.html
├── academics.html
├── student-life.html
├── leadership.html
├── gallery.html
├── news.html
├── contact.html
├── admin.html            Admin dashboard (auth-gated)
├── admin.js              Admin dashboard logic (Firestore CRUD)
├── firebase-config.js    Shared Firebase config & SDK imports
├── images/
│   └── logo.png
└── README.md
```
