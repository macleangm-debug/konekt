"""
Admin Report Exports — Country Breakdown PDF/JSON
Generates financial and operational reports with country-level breakdown.
"""
import os
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Request, Query
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/api/admin/reports", tags=["Admin Reports"])

mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'konekt_db')
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

COUNTRIES = ["TZ", "KE", "UG"]


def _country_filter(country: str):
    """Build country filter that includes legacy (no country_code) for TZ."""
    if country == "TZ":
        return {"$or": [{"country_code": "TZ"}, {"country_code": {"$exists": False}}, {"country_code": None}, {"country_code": ""}]}
    return {"country_code": country}


@router.get("/summary")
async def report_summary(
    period: str = Query("month", regex="^(week|month|quarter|year)$"),
    country: str = "",
):
    """Generate summary report with revenue, orders, profit breakdown.
    If country is empty, generates breakdown for ALL countries.
    """
    now = datetime.now(timezone.utc)
    
    if period == "week":
        start = (now - timedelta(days=7)).isoformat()
    elif period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    elif period == "quarter":
        q_month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=q_month, day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    else:  # year
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    countries_to_report = [country.upper()] if country else COUNTRIES

    report = {
        "period": period,
        "generated_at": now.isoformat(),
        "start_date": start,
        "countries": {},
        "totals": {"revenue": 0, "orders": 0, "profit": 0, "new_customers": 0, "quotes": 0, "invoices": 0},
    }

    for c in countries_to_report:
        cf = _country_filter(c)
        
        # Revenue
        rev_pipeline = [
            {"$match": {**cf, "status": {"$in": ["delivered", "completed", "paid"]}, "created_at": {"$gte": start}}},
            {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$total", 0]}}}, "count": {"$sum": 1}}},
        ]
        rev = await db.orders.aggregate(rev_pipeline).to_list(1)
        revenue = rev[0]["total"] if rev else 0
        order_count = rev[0]["count"] if rev else 0

        # Profit (revenue - base costs - commissions)
        orders_list = await db.orders.find(
            {**cf, "status": {"$in": ["delivered", "completed", "paid"]}, "created_at": {"$gte": start}}
        ).to_list(5000)
        base_costs = sum(float(o.get("base_cost") or o.get("vendor_cost") or 0) for o in orders_list)
        comms = await db.commissions.find(
            {**cf, "created_at": {"$gte": start}, "status": {"$in": ["earned", "approved", "paid"]}}
        ).to_list(5000)
        commissions_total = sum(float(c_doc.get("amount") or 0) for c_doc in comms)
        profit = revenue - base_costs - commissions_total
        if revenue <= 0:
            profit = 0

        # Quotes
        quotes_count = await db.quotes.count_documents({**cf, "created_at": {"$gte": start}})
        
        # Invoices
        invoices_count = await db.invoices.count_documents({**cf, "created_at": {"$gte": start}})

        # New customers
        new_custs = await db.users.count_documents({**cf, "role": "customer", "created_at": {"$gte": start}})

        # Outstanding
        outstanding_pipeline = [
            {"$match": {**cf, "status": {"$in": ["unpaid", "pending", "sent"]}}},
            {"$group": {"_id": None, "total": {"$sum": {"$toDouble": {"$ifNull": ["$total", 0]}}}}},
        ]
        outstanding_result = await db.invoices.aggregate(outstanding_pipeline).to_list(1)
        outstanding = outstanding_result[0]["total"] if outstanding_result else 0

        country_data = {
            "country_code": c,
            "revenue": round(revenue, 0),
            "orders": order_count,
            "profit": round(profit, 0),
            "base_costs": round(base_costs, 0),
            "commissions": round(commissions_total, 0),
            "quotes": quotes_count,
            "invoices": invoices_count,
            "new_customers": new_custs,
            "outstanding": round(outstanding, 0),
            "margin_pct": round((profit / revenue * 100) if revenue > 0 else 0, 1),
        }
        report["countries"][c] = country_data

        # Totals
        report["totals"]["revenue"] += revenue
        report["totals"]["orders"] += order_count
        report["totals"]["profit"] += profit
        report["totals"]["new_customers"] += new_custs
        report["totals"]["quotes"] += quotes_count
        report["totals"]["invoices"] += invoices_count

    # Round totals
    report["totals"]["revenue"] = round(report["totals"]["revenue"], 0)
    report["totals"]["profit"] = round(report["totals"]["profit"], 0)

    return report


@router.get("/vendors")
async def vendor_report(country: str = ""):
    """Vendor performance report with country breakdown."""
    query = {}
    if country:
        query["country_code"] = country.upper()
    
    vendors = await db.partner_users.find(query).to_list(500)
    
    vendor_stats = []
    for v in vendors:
        vid = v.get("partner_id", "")
        # Count vendor orders
        vo_count = await db.vendor_orders.count_documents({"vendor_id": vid})
        vo_completed = await db.vendor_orders.count_documents({"vendor_id": vid, "status": {"$in": ["delivered", "completed"]}})
        
        vendor_stats.append({
            "vendor_id": vid,
            "name": v.get("company_name") or v.get("full_name") or v.get("name", ""),
            "country_code": v.get("country_code", "TZ"),
            "partner_type": v.get("partner_type", "vendor"),
            "total_orders": vo_count,
            "completed_orders": vo_completed,
            "status": v.get("status", "active"),
        })
    
    return {
        "total_vendors": len(vendor_stats),
        "country_filter": country or "all",
        "vendors": vendor_stats,
    }


@router.get("/customers")
async def customer_report(country: str = "", period: str = "month"):
    """Customer acquisition and activity report."""
    now = datetime.now(timezone.utc)
    if period == "month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    elif period == "quarter":
        q_month = ((now.month - 1) // 3) * 3 + 1
        start = now.replace(month=q_month, day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    else:
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()

    cf = _country_filter(country) if country else {}
    
    total_customers = await db.users.count_documents({**cf, "role": "customer"})
    new_customers = await db.users.count_documents({**cf, "role": "customer", "created_at": {"$gte": start}})
    active_customers = await db.orders.distinct("customer_email", {**cf, "created_at": {"$gte": start}})

    # Top customers by revenue
    top_pipeline = [
        {"$match": {**cf, "status": {"$in": ["delivered", "completed", "paid"]}, "created_at": {"$gte": start}}},
        {"$group": {"_id": "$customer_email", "total_spent": {"$sum": {"$toDouble": {"$ifNull": ["$total", 0]}}}, "order_count": {"$sum": 1}}},
        {"$sort": {"total_spent": -1}},
        {"$limit": 10},
    ]
    top_customers = await db.orders.aggregate(top_pipeline).to_list(10)

    return {
        "period": period,
        "country_filter": country or "all",
        "total_customers": total_customers,
        "new_customers": new_customers,
        "active_customers": len(active_customers),
        "top_customers": [{"email": c["_id"], "total_spent": round(c["total_spent"], 0), "orders": c["order_count"]} for c in top_customers],
    }



# ─── PDF Export ──────────────────────────────────────────────────

@router.get("/country-breakdown/pdf")
async def country_breakdown_pdf(period: str = "month", country: str = ""):
    """Render the country-breakdown summary as a Konekt-branded PDF."""
    from fastapi.responses import StreamingResponse
    from io import BytesIO
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.units import mm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    # Reuse the summary builder directly
    data = await report_summary(period=period, country=country)

    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=18 * mm, bottomMargin=18 * mm)
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("h1", parent=styles["Title"], fontSize=18, textColor=colors.HexColor("#20364D"))
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontSize=12, textColor=colors.HexColor("#20364D"), spaceBefore=10)
    small = ParagraphStyle("small", parent=styles["BodyText"], fontSize=8, textColor=colors.HexColor("#6b7280"))

    story = [
        Paragraph("KONEKT · Country Breakdown", h1),
        Paragraph(f"Period: {period} · Generated {datetime.now(timezone.utc).isoformat()[:19]} UTC", small),
        Spacer(1, 10),
    ]

    # Summary totals
    rollup = data.get("rollup", {}) or {}
    summary_rows = [
        ["Metric", "Value"],
        ["Orders", f"{rollup.get('orders', 0)}"],
        ["Revenue", f"TZS {int(rollup.get('revenue', 0)):,}"],
        ["Paid revenue", f"TZS {int(rollup.get('paid_revenue', 0)):,}"],
        ["Customers", f"{rollup.get('customers', 0)}"],
        ["Avg order value", f"TZS {int(rollup.get('avg_order_value', 0)):,}"],
    ]
    tbl = Table(summary_rows, colWidths=[60 * mm, 60 * mm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#20364D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
        ("BACKGROUND", (0, 1), (0, -1), colors.HexColor("#F5F7FA")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(tbl)
    story.append(Spacer(1, 14))

    # Per-country breakdown
    countries = data.get("countries", {}) or {}
    if countries:
        story.append(Paragraph("Per-country breakdown", h2))
        rows = [["Country", "Orders", "Revenue", "Paid rev.", "Customers", "Avg order"]]
        for cc, cd in countries.items():
            rows.append([
                cc,
                f"{cd.get('orders', 0)}",
                f"{int(cd.get('revenue', 0)):,}",
                f"{int(cd.get('paid_revenue', 0)):,}",
                f"{cd.get('customers', 0)}",
                f"{int(cd.get('avg_order_value', 0)):,}",
            ])
        tbl2 = Table(rows, colWidths=[18 * mm, 22 * mm, 30 * mm, 30 * mm, 22 * mm, 30 * mm])
        tbl2.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#20364D")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#E5E7EB")),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        story.append(tbl2)

    story.append(Spacer(1, 18))
    story.append(Paragraph("Generated by Konekt · konekt.co.tz", small))
    doc.build(story)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="konekt-country-breakdown-{period}.pdf"'},
    )
