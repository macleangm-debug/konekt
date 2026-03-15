"""
Campaign Marketing Service
Generate share-ready marketing messages for different platforms
"""


def build_campaign_share_message(campaign: dict, platform: str = "generic") -> str:
    """
    Build a platform-optimized marketing message for a campaign.
    
    Platforms: generic, whatsapp, instagram, facebook, linkedin, x
    """
    headline = campaign.get("headline") or campaign.get("name") or "Special Offer"
    description = campaign.get("description") or ""
    reward = campaign.get("reward", {})
    marketing = campaign.get("marketing", {})

    cta = marketing.get("cta") or "Order now with Konekt."
    link = marketing.get("landing_url") or "https://konekt.co.tz"
    promo_code = marketing.get("promo_code") or ""
    hashtags = marketing.get("hashtags", [])
    hashtag_text = " ".join([f"#{h}" if not h.startswith("#") else h for h in hashtags]) if hashtags else ""

    # Build reward text
    reward_text = ""
    reward_type = reward.get("type")

    if reward_type == "percentage_discount":
        value = reward.get("value", 0)
        cap = reward.get("cap", 0)
        if cap:
            reward_text = f"Get {value}% off (up to TZS {cap:,.0f})"
        else:
            reward_text = f"Get {value}% off"
    elif reward_type == "fixed_discount":
        reward_text = f"Get TZS {reward.get('value', 0):,.0f} off"
    elif reward_type == "free_addon":
        addon = reward.get("free_addon_code") or "special bonus"
        reward_text = f"Get a FREE {addon}"

    code_line = f"Use code: {promo_code}" if promo_code else ""

    # Platform-specific formatting
    if platform == "whatsapp":
        parts = [headline]
        if reward_text:
            parts.append(reward_text)
        if code_line:
            parts.append(code_line)
        if description:
            parts.append(description)
        parts.append(cta)
        parts.append(link)
        if hashtag_text:
            parts.append(hashtag_text)
        return "\n\n".join(filter(None, parts))

    if platform == "instagram":
        return f"""{headline}

{reward_text}
{code_line}

{description}

{cta}
{link}

{hashtag_text}""".strip()

    if platform == "facebook":
        return f"""{headline}

{reward_text}
{code_line}

{description}

{cta}
{link}""".strip()

    if platform == "linkedin":
        return f"""{headline}

{description}

{reward_text}
{code_line}

{cta}
{link}""".strip()

    if platform == "x":
        # X/Twitter - keep it short
        short_msg = f"{headline} — {reward_text}"
        if code_line:
            short_msg += f". {code_line}"
        short_msg += f" {link}"
        return short_msg[:280]

    # Generic format
    return f"{headline}. {reward_text}. {code_line} {description} {cta} {link} {hashtag_text}".strip()
