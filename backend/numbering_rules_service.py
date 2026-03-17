"""
Numbering Rules Service
Handles auto-generation of SKU, quote, invoice, order numbers
"""
from datetime import datetime
import random
import string


def _yy():
    return datetime.utcnow().strftime("%y")


def _yyyy():
    return datetime.utcnow().strftime("%Y")


def _mm():
    return datetime.utcnow().strftime("%m")


def _random_alnum(length: int = 6):
    chars = string.ascii_uppercase + string.digits
    return "".join(random.choice(chars) for _ in range(length))


def apply_numbering_format(
    *,
    format_string: str,
    company_code: str = "KON",
    country_code: str = "TZ",
    entity_code: str = "",
    sequence_number: int | None = None,
    alnum_length: int = 6,
):
    value = format_string or "[CompanyCode]-[CountryCode]-[AlphaNum]"

    replacements = {
        "[CompanyCode]": company_code,
        "[CountryCode]": country_code,
        "[EntityCode]": entity_code,
        "[YY]": _yy(),
        "[YYYY]": _yyyy(),
        "[MM]": _mm(),
        "[AlphaNum]": _random_alnum(alnum_length),
        "[SEQ]": f"{int(sequence_number or 0):06d}",
    }

    for token, replacement in replacements.items():
        value = value.replace(token, replacement)

    return value


async def get_next_sequence(db, *, entity_type: str, country_code: str = "TZ"):
    key = f"{entity_type}:{country_code}:{_yyyy()}"
    existing = await db.number_sequences.find_one({"key": key})

    if not existing:
        doc = {
            "key": key,
            "entity_type": entity_type,
            "country_code": country_code,
            "year": _yyyy(),
            "current_value": 1,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await db.number_sequences.insert_one(doc)
        return 1

    next_value = int(existing.get("current_value", 0)) + 1
    await db.number_sequences.update_one(
        {"_id": existing["_id"]},
        {"$set": {"current_value": next_value, "updated_at": datetime.utcnow()}},
    )
    return next_value


async def generate_entity_number(
    db,
    *,
    entity_type: str,
    company_code: str = "KON",
    country_code: str = "TZ",
    manual_value: str | None = None,
):
    rules = await db.numbering_rules.find_one({"entity_type": entity_type, "is_active": True}) or {}

    allow_manual = bool(rules.get("allow_manual_input", False))
    auto_generate = bool(rules.get("auto_generate", True))

    if manual_value and allow_manual:
        return manual_value

    if not auto_generate:
        return None

    seq = await get_next_sequence(db, entity_type=entity_type, country_code=country_code)

    return apply_numbering_format(
        format_string=rules.get("format_string", "[CompanyCode]-[EntityCode]-[YY]-[SEQ]"),
        company_code=company_code,
        country_code=country_code,
        entity_code=rules.get("entity_code", entity_type.upper()[:3]),
        sequence_number=seq,
        alnum_length=int(rules.get("alnum_length", 6) or 6),
    )
