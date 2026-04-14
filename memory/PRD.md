# Konekt B2B E-Commerce Platform — PRD

## Architecture
React (CRA) + TailwindCSS + Shadcn/UI | FastAPI + MongoDB | Stripe + Object Storage | JWT Auth | Resend (Email) | Pillow (Image Processing)

## System Status: LAUNCH READY — FULL CONTENT ENGINE COMPLETE

## Content Studio Expansion — COMPLETE (310 iterations tested)
- **4 content tabs**: Products (29), Services, Group Deals (6), Brand Content (12)
- **12 brand templates** across 5 intents: Authority (3), Trust (3), Urgency (2), Soft Sell (2), Value (2)
- **6 layout renderers**: Product Focus, Promo Focus, Service Focus, Minimal Brand, **Authority** (centered statement), **Trust** (checklist)
- **1:1 square image containers** on all product/service/deal cards
- **Auto-layout selection**: Brand templates auto-select Authority/Trust layouts based on intent
- **Dynamic caption generator**: Brand content = no price, Product/Deal = with price/savings
- **Group Deal progress bars** + badges in Content Studio cards
- **Promo code rules**: Admin = no code, Sales/Affiliate = code injected visually + in captions

## Group Deals Discovery — COMPLETE (309 iterations tested)
- Landing page with hero header, featured deal banner (fallback logic), active grid, trust footer
- Marketplace entry banner with active deal count
- Homepage DealOfTheDayHero with fallback + conditional HomepageGroupDealsSection
- Lazy loading on all deal images

## Product Upload Wizard — COMPLETE (308 iterations tested)
- 6-step flow with dynamic catalog config from Settings Hub
- Image pipeline: Upload → crop → WebP → 3 variants

## Configurable Catalog Settings — COMPLETE
- Settings Hub → Catalog: Units, Categories, Variants, SKU Config

## Vendor Ops Dashboard — ENHANCED
- Toggle publish, Enter Quote CTA, Ready for Sales, inline edit

## All Complete Systems (310+ iterations)
- Vendor Ops Foundation, Image Pipeline, Price Requests
- Structured Names, Terms of Service, Password-Gated Settings
- Affiliate System, Sales Promo Codes, Creative Generator
- Group Deals (quantity closure, repeat buyers)
- Canonical Email Engine, Commission & Margin Engine
- Customer Rating, Track Order

## Credentials
- Admin: `admin@konekt.co.tz` / `KnktcKk_L-hw1wSyquvd!`
- Staff: `staff@konekt.co.tz` / `Staff123!` (code: STAFF2024)
- Affiliate: `qualifier.test@example.com` / `Qualifier123!`

## Backlog
- (P1) First real product listing + first group deal execution
- (P1) State-aware conversational loan entry
- (P2) WhatsApp rich share + OG meta tags for deal previews
- (P2) Remaining configurable settings (quote expiry, lead time)
- (Phase 2) Vendor Ops automation (SLA, scoring)
