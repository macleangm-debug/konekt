"""
PDF Style Helpers
Colors and paragraph styles for commercial documents
"""
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_RIGHT

ACCENT = colors.HexColor("#20364D")
GOLD = colors.HexColor("#D4A843")
TEXT = colors.HexColor("#1F2937")
MUTED = colors.HexColor("#6B7280")
BORDER = colors.HexColor("#D9E2EC")
SOFT_BG = colors.HexColor("#F8FAFC")
LIGHT_BG = colors.HexColor("#F3F6F9")


def build_styles():
    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="DocTitle",
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=ACCENT,
            alignment=TA_LEFT,
            spaceAfter=4,
        )
    )

    styles.add(
        ParagraphStyle(
            name="DocMeta",
            fontName="Helvetica",
            fontSize=9.5,
            leading=12,
            textColor=MUTED,
            alignment=TA_LEFT,
        )
    )

    styles.add(
        ParagraphStyle(
            name="BlockHeading",
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=ACCENT,
            spaceAfter=4,
        )
    )

    styles.add(
        ParagraphStyle(
            name="BodySmall",
            fontName="Helvetica",
            fontSize=9.5,
            leading=12.5,
            textColor=TEXT,
        )
    )

    styles.add(
        ParagraphStyle(
            name="BodyMuted",
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=MUTED,
        )
    )

    styles.add(
        ParagraphStyle(
            name="RightMeta",
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=TEXT,
            alignment=TA_RIGHT,
        )
    )

    styles.add(
        ParagraphStyle(
            name="RightStrong",
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=ACCENT,
            alignment=TA_RIGHT,
        )
    )

    return styles
