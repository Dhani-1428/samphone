"""Simple HTML catalog view for browser testing of /api/products."""
from __future__ import annotations

import html
from typing import Any


def render_products_page(page: dict[str, Any]) -> str:
    items = page.get("items") or []
    total = int(page.get("total") or 0)
    offset = int(page.get("offset") or 0)
    limit = int(page.get("limit") or 24)
    has_more = bool(page.get("has_more"))

    cards = []
    for p in items:
        title = html.escape(str(p.get("title") or "Untitled"))
        brand = html.escape(str(p.get("brand") or ""))
        price = p.get("price")
        price_txt = html.escape(f"€{price:.2f}" if isinstance(price, (int, float)) else "Price on request")
        img = html.escape(str(p.get("image") or ""))
        category = html.escape(str(p.get("category") or ""))
        cards.append(
            f"""
            <article class="card">
              <img src="{img}" alt="{title}" loading="lazy" />
              <h3>{title}</h3>
              <p class="meta">{brand} · {category}</p>
              <p class="price">{price_txt}</p>
            </article>
            """
        )

    prev_off = max(0, offset - limit)
    next_off = offset + limit
    nav = ['<nav class="pager">']
    if offset > 0:
        nav.append(f'<a href="/api/products?limit={limit}&offset={prev_off}">← Previous</a>')
    nav.append(f"<span>Showing {offset + 1}–{offset + len(items)} of {total}</span>")
    if has_more:
        nav.append(f'<a href="/api/products?limit={limit}&offset={next_off}">Next →</a>')
    nav.append("</nav>")

    empty = "" if items else '<p class="empty">No products returned. Check WooCommerce API credentials and backend logs.</p>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="/assets/images/icon.png" />
  <title>Samphone Catalog — {total} products</title>
  <style>
    body {{ font-family: system-ui, sans-serif; margin: 0; background: #f4f6f8; color: #1a1a1a; }}
    header {{ background: #0b5cab; color: #fff; padding: 1rem 1.25rem; }}
    header h1 {{ margin: 0; font-size: 1.25rem; }}
    header p {{ margin: 0.35rem 0 0; opacity: 0.9; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; padding: 1rem; }}
    .card {{ background: #fff; border: 1px solid #dde3ea; border-radius: 8px; overflow: hidden; }}
    .card img {{ width: 100%; height: 180px; object-fit: contain; background: #fff; }}
    .card h3 {{ font-size: 0.95rem; margin: 0.75rem 0.75rem 0.25rem; line-height: 1.3; }}
    .meta, .price {{ margin: 0 0.75rem; font-size: 0.85rem; color: #555; }}
    .price {{ font-weight: 700; color: #0b5cab; margin-bottom: 0.75rem; }}
    .pager {{ display: flex; gap: 1rem; align-items: center; justify-content: center; padding: 1rem; flex-wrap: wrap; }}
    .pager a {{ color: #0b5cab; text-decoration: none; font-weight: 600; }}
    .empty {{ padding: 2rem; text-align: center; color: #666; }}
    code {{ background: #e8eef5; padding: 0.1rem 0.35rem; border-radius: 4px; }}
  </style>
</head>
<body>
  <header>
    <h1>Samphone API Catalog</h1>
    <p>{total} published products · JSON API: <code>/api/products?limit=24&amp;offset=0</code></p>
  </header>
  {empty}
  <div class="grid">{''.join(cards)}</div>
  {''.join(nav)}
</body>
</html>"""
