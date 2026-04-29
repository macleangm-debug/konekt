"""Optional integration loaders.
Keeps backend bootable when emergentintegrations is unavailable.
"""
import importlib


def _load(path: str, name: str):
    mod = importlib.import_module(path)
    return getattr(mod, name)


def get_llm_chat_classes():
    try:
        return _load("emergentintegrations.llm.chat", "LlmChat"), _load("emergentintegrations.llm.chat", "UserMessage")
    except Exception:
        return None, None


def get_image_generation_class():
    try:
        return _load("emergentintegrations.llm.openai.image_generation", "OpenAIImageGeneration")
    except Exception:
        return None


def get_stripe_checkout_classes():
    try:
        return (
            _load("emergentintegrations.payments.stripe.checkout", "StripeCheckout"),
            _load("emergentintegrations.payments.stripe.checkout", "CheckoutSessionRequest"),
        )
    except Exception:
        return None, None
