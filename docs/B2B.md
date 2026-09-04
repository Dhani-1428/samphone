# B2C vs B2B on Samphone

Same shop (`samphone.pt` + app + `https://samphone.cloud/api`). The difference is who they are, what prices they see, and which emails go out. Website registration: `/register` (Personal B2C or Business B2B). Admin: `/admin/wholesale`.

## Public / B2C (personal)

- Signup: Create account as a personal shopper (`accountType: b2c`).
- Ready immediately — no admin approval.
- Sees retail (public) prices.
- Accessories, Hoco, glass/covers, tools: cost mapped through public price bands on the API (e.g. €0.99–1.90 → €4.90, €50–60 → €89.90).
- Phone repair parts (screens, batteries, cameras, etc.): keep the live/API price, not accessory bands.
- Wholesale fields (`wholesalePrice`, dealer tier, etc.) are stripped from the API for public responses.
- Guest browsing uses the same public prices (unless `REQUIRE_AUTH_FOR_PRICES=1` on the API).

## Business / B2B (wholesale)

- Signup: Business account with company name, VAT/NIF, type, address (`accountType: b2b`).
- Status starts as **pending**. They can browse, but business prices stay locked (retail).
- Admin reviews in **Admin → Wholesale** (`/admin/wholesale`).
  - **Approve** → `wholesaleStatus: approved`, prices unlock, dealer tier set (default **bronze**).
  - **Reject** → stay on public prices; reason emailed.
  - **Suspend** → wholesale off again; retail until re-approved.
- Approved B2B sees live wholesale / API / `b2b_price` as the selling base. Public retail is still stored so admin can toggle Public vs Business.
- Dealer tiers (extra % off wholesale on the storefront):

| Tier | Discount |
|------|----------|
| Bronze | 10% |
| Standard | 12% |
| Silver | 15% |
| Gold | 18% |
| Platinum | 22% |

Admin accounts can preview Public or Business prices in the admin app.

## Email system

All mail is sent from the API (Gmail SMTP), not from WordPress. HTML + plain text. Languages: EN, PT, FR, ES, NL, HI, PA, UR (order emails follow the order language).

### Env (samphone.cloud / VPS)

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<gmail>
SMTP_PASSWORD=<16-char Gmail App Password>
EMAIL_FROM=Samphone <samphone.pt@gmail.com>
SUPPORT_EMAIL=support@samphone.pt
ADMIN_NOTIFY_EMAIL=samphone.pt@gmail.com
SITE_URL=https://www.samphone.pt
# Abandoned cart (on in production/staging)
ENABLE_ABANDONED_CART_EMAILS=1
CART_ABANDON_HOURS=24
```

`ADMIN_NOTIFY_EMAIL` is the inbox for signups and B2B applications (falls back to `samphone.pt@gmail.com`).

### Customer emails

| Event | Who | Meaning |
|-------|-----|---------|
| Personal signup | B2C | Welcome — account ready |
| Business signup | B2B | Business account pending approval |
| B2B approved | B2B | Wholesale unlocked + pricing tier |
| B2B rejected | B2B | Application rejected + reason |
| Order placed | Customer | Order confirmed |
| Order cancelled | Customer | Order cancelled |
| Abandoned cart | Logged-in user | Reminder after 24h idle cart |
| Back in stock | Notify me | When the part is back |

Business applicants do **not** get the B2C welcome; they get the pending-approval email instead.

### Admin emails

| Event | Inbox |
|-------|--------|
| New public signup | `[Samphone] New public signup — …` |
| New B2B application | `[Samphone] Business application — Company (email) — review in Wholesale` |
| New order | Admin copy |
| Order cancelled | Admin copy |

Admin also gets in-app notification and push for wholesale applications (`/admin/wholesale`).

## Flow (website copy)

1. Shop as guest → public prices, no account mail.
2. Personal account → welcome email + admin “new public signup”.
3. Business account → customer “under review” + admin “business application” → approve/reject in Wholesale → decision email → if approved, wholesale prices appear on next login / refresh.
4. Checkout → confirmation to customer + admin.
5. Cart left 24h → reminder (production/staging only).

WordPress does not need a separate mail plugin for these. Keep SMTP + `ADMIN_NOTIFY_EMAIL` + `SITE_URL` on `samphone.cloud` so the website and app share one email system.

See also: `docs/STACK.md`, `samphone.cloud.env.example`.
