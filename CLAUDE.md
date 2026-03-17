# CauseListPro

## Project Overview
CauseListPro is a SaaS that sends daily court cause list alerts to Indian advocates (lawyers) via email. It scrapes 5 Hyderabad/Telangana court websites every evening, matches cases against registered advocates, and emails them tomorrow's hearing details.

## Tech Stack
- Backend: Python 3.11+ / FastAPI — deployed to Railway
- Database: Supabase (PostgreSQL)
- Frontend: Next.js 14 / TypeScript / Tailwind CSS — deployed to Vercel
- Email: Resend API
- Captcha solving: 2Captcha API (for district courts only)

## Two Scraper Types
1. TSHC High Court: POST causelist.tshc.gov.in/advocateCodeWiseView — NO captcha, uses 5-digit CIS code, verify=False for SSL
2. District Courts (4 courts): POST {domain}/wp-admin/admin-ajax.php — requires Securimage captcha, uses Bar Council barcode

## 5 Target Courts
1. TSHC High Court (causelist.tshc.gov.in) — custom API, no captcha
2. Ranga Reddy District Court (rangareddy.dcourts.gov.in) — eCourts WordPress
3. City Civil Court Hyderabad (hccc.dcourts.gov.in) — eCourts WordPress
4. Metropolitan Sessions Court (hmsj.dcourts.gov.in) — eCourts WordPress
5. Medchal-Malkajgiri (medchalmalkajgiri.dcourts.gov.in) — eCourts WordPress

## Critical Rules
- TSHC date format: DD-MM-YYYY
- District courts date format: MM/DD/YYYY (American!)
- TSHC needs verify=False (SSL chain issues)
- District courts SSL is fine (verify=True)
- Courts 3 and 4 share establishment codes — DEDUPLICATE results
- Sequential scraping only — 1 second between requests
- Always store raw_html in daily_results for debugging
- TSHC has 3 list types: daily, advance, supplementary (check all 3)
- The spelling on TSHC server is "suplementary" (one 'p')

## Commands
cd backend && pip install -r requirements.txt
cd frontend && npm install
cd backend && uvicorn app.main:app --reload
cd frontend && npm run dev

## File Structure
backend/app/main.py — FastAPI entry point
backend/app/config.py — Environment variables
backend/app/scrapers/tshc.py — TSHC scraper (3 list types)
backend/app/scrapers/district.py — District court scraper (4 courts)
backend/app/scrapers/captcha.py — 2Captcha integration
backend/app/services/orchestrator.py — Daily scrape coordinator
backend/app/services/emailer.py — Email via Resend
backend/app/db/supabase_client.py — Database functions
backend/app/models/schemas.py — Pydantic data models
