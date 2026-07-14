
# NTFL Network — Milestone 5

Final polish release for the NTFL site.

## What is included
- Dark modern layout with polished glass cards
- Dropdown navigation on desktop and mobile
- Live ticker strip across all pages
- Seasonal homepage, standings, schedule, rankings, news, awards, history, rules, teams, game center
- Commissioner dashboard with Supabase login
- Editable teams, coaches, records, games, rankings, settings
- Backup export/import/reset tools
- 404 page

## Notes
- The site reads from Supabase when the commissioner is logged in.
- Browser storage is still used as a local fallback for quick testing.
- Upload buckets should still exist in Supabase: team-logos, homepage-images, news-images, rankings-images.

## Deploy
1. Upload the folder to GitHub.
2. Turn on GitHub Pages.
3. Sign in on `commissioner.html` with your Supabase Auth account.
4. Edit the site from the dashboard.
