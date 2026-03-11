#!/usr/bin/env python3
"""
Konekt Product Seeder
Run: python seed_products.py
"""
import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import uuid

load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'konekt_db')

# Product seed data
PRODUCTS = [
    # ==================== PROMOTIONAL MATERIALS ====================
    # Apparel
    {
        "name": "Classic T-Shirt",
        "branch": "Promotional Materials",
        "category": "Apparel",
        "description": "Premium cotton t-shirt perfect for corporate events, team uniforms, and promotional giveaways. Available in multiple colors with customizable print areas.",
        "base_price": 8000,
        "image_url": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800",
        "sizes": ["XS", "S", "M", "L", "XL", "XXL"],
        "colors": [
            {"name": "White", "hex": "#FFFFFF"},
            {"name": "Black", "hex": "#000000"},
            {"name": "Navy", "hex": "#1e3a5f"},
            {"name": "Red", "hex": "#dc2626"},
            {"name": "Gray", "hex": "#6b7280"}
        ],
        "print_methods": ["Screen Print", "DTG", "Embroidery"],
        "min_quantity": 10,
        "is_customizable": True,
        "stock_quantity": 500
    },
    {
        "name": "Polo Shirt",
        "branch": "Promotional Materials",
        "category": "Apparel",
        "description": "Professional polo shirt ideal for corporate uniforms and business events. Features breathable fabric and classic collar design.",
        "base_price": 15000,
        "image_url": "https://images.unsplash.com/photo-1625910513413-5fc7be77e1f6?w=800",
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "colors": [
            {"name": "White", "hex": "#FFFFFF"},
            {"name": "Black", "hex": "#000000"},
            {"name": "Navy", "hex": "#1e3a5f"},
            {"name": "Royal Blue", "hex": "#1d4ed8"}
        ],
        "print_methods": ["Embroidery", "Screen Print"],
        "min_quantity": 10,
        "is_customizable": True,
        "stock_quantity": 300
    },
    {
        "name": "Corporate Hoodie",
        "branch": "Promotional Materials",
        "category": "Apparel",
        "description": "Comfortable premium hoodie for team merchandise and corporate giveaways. Features kangaroo pocket and drawstring hood.",
        "base_price": 25000,
        "image_url": "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800",
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "colors": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Gray", "hex": "#4b5563"},
            {"name": "Navy", "hex": "#1e3a5f"}
        ],
        "print_methods": ["Screen Print", "Embroidery", "DTG"],
        "min_quantity": 5,
        "is_customizable": True,
        "stock_quantity": 150
    },
    # Drinkware
    {
        "name": "Ceramic Mug",
        "branch": "Promotional Materials",
        "category": "Drinkware",
        "description": "Classic 11oz ceramic mug perfect for office use. Dishwasher safe with vibrant full-color print capability.",
        "base_price": 5000,
        "image_url": "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800",
        "sizes": ["11oz", "15oz"],
        "colors": [
            {"name": "White", "hex": "#FFFFFF"},
            {"name": "Black", "hex": "#000000"}
        ],
        "print_methods": ["Sublimation", "Screen Print"],
        "min_quantity": 25,
        "is_customizable": True,
        "stock_quantity": 1000
    },
    {
        "name": "Stainless Steel Tumbler",
        "branch": "Promotional Materials",
        "category": "Drinkware",
        "description": "Double-walled vacuum insulated tumbler. Keeps drinks hot for 6 hours or cold for 12 hours. Premium corporate gift.",
        "base_price": 18000,
        "image_url": "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800",
        "sizes": ["16oz", "20oz"],
        "colors": [
            {"name": "Silver", "hex": "#C0C0C0"},
            {"name": "Black", "hex": "#000000"},
            {"name": "Navy", "hex": "#1e3a5f"},
            {"name": "Rose Gold", "hex": "#b76e79"}
        ],
        "print_methods": ["Laser Engraving", "Screen Print"],
        "min_quantity": 10,
        "is_customizable": True,
        "stock_quantity": 200
    },
    {
        "name": "Sports Water Bottle",
        "branch": "Promotional Materials",
        "category": "Drinkware",
        "description": "BPA-free sports water bottle with flip-top lid. Perfect for fitness events and outdoor promotions.",
        "base_price": 8000,
        "image_url": "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=800",
        "sizes": ["500ml", "750ml"],
        "colors": [
            {"name": "Clear", "hex": "#f0f0f0"},
            {"name": "Blue", "hex": "#2563eb"},
            {"name": "Green", "hex": "#16a34a"},
            {"name": "Orange", "hex": "#ea580c"}
        ],
        "print_methods": ["Screen Print", "Pad Print"],
        "min_quantity": 25,
        "is_customizable": True,
        "stock_quantity": 500
    },
    # Stationery
    {
        "name": "Branded Notebook",
        "branch": "Promotional Materials",
        "category": "Stationery",
        "description": "A5 hardcover notebook with 200 lined pages. Includes ribbon bookmark and elastic closure. Perfect for corporate gifting.",
        "base_price": 8000,
        "image_url": "https://images.unsplash.com/photo-1517842645767-c639042777db?w=800",
        "sizes": ["A5", "A4"],
        "colors": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Navy", "hex": "#1e3a5f"},
            {"name": "Burgundy", "hex": "#722f37"},
            {"name": "Green", "hex": "#166534"}
        ],
        "print_methods": ["Debossing", "Screen Print", "Foil Stamp"],
        "min_quantity": 25,
        "is_customizable": True,
        "stock_quantity": 400
    },
    {
        "name": "Executive Pen Set",
        "branch": "Promotional Materials",
        "category": "Stationery",
        "description": "Premium metal ballpoint pen with twist mechanism. Comes in elegant gift box. Ideal for executive gifts.",
        "base_price": 12000,
        "image_url": "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800",
        "sizes": ["Standard"],
        "colors": [
            {"name": "Silver", "hex": "#C0C0C0"},
            {"name": "Gold", "hex": "#FFD700"},
            {"name": "Black", "hex": "#000000"}
        ],
        "print_methods": ["Laser Engraving", "Pad Print"],
        "min_quantity": 25,
        "is_customizable": True,
        "stock_quantity": 300
    },
    # Caps & Hats
    {
        "name": "Baseball Cap",
        "branch": "Promotional Materials",
        "category": "Caps",
        "description": "Classic 6-panel baseball cap with adjustable strap. Perfect for outdoor events and team merchandise.",
        "base_price": 6000,
        "image_url": "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800",
        "sizes": ["One Size"],
        "colors": [
            {"name": "Black", "hex": "#000000"},
            {"name": "White", "hex": "#FFFFFF"},
            {"name": "Navy", "hex": "#1e3a5f"},
            {"name": "Red", "hex": "#dc2626"},
            {"name": "Khaki", "hex": "#c4a661"}
        ],
        "print_methods": ["Embroidery", "Screen Print"],
        "min_quantity": 25,
        "is_customizable": True,
        "stock_quantity": 600
    },
    # Bags
    {
        "name": "Canvas Tote Bag",
        "branch": "Promotional Materials",
        "category": "Bags",
        "description": "Eco-friendly cotton canvas tote bag. Large print area for maximum brand visibility.",
        "base_price": 7000,
        "image_url": "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800",
        "sizes": ["Standard"],
        "colors": [
            {"name": "Natural", "hex": "#f5f5dc"},
            {"name": "Black", "hex": "#000000"},
            {"name": "Navy", "hex": "#1e3a5f"}
        ],
        "print_methods": ["Screen Print", "DTG"],
        "min_quantity": 50,
        "is_customizable": True,
        "stock_quantity": 800
    },
    {
        "name": "Laptop Backpack",
        "branch": "Promotional Materials",
        "category": "Bags",
        "description": "Professional laptop backpack with padded compartment. USB charging port and multiple pockets. Premium corporate gift.",
        "base_price": 35000,
        "image_url": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800",
        "sizes": ["15 inch", "17 inch"],
        "colors": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Gray", "hex": "#6b7280"}
        ],
        "print_methods": ["Embroidery", "Patch"],
        "min_quantity": 10,
        "is_customizable": True,
        "stock_quantity": 100
    },
    # Signage
    {
        "name": "Roll-Up Banner",
        "branch": "Promotional Materials",
        "category": "Signage",
        "description": "Portable retractable banner stand with full-color print. Perfect for trade shows and events. Includes carrying case.",
        "base_price": 45000,
        "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
        "sizes": ["85x200cm", "100x200cm", "120x200cm"],
        "colors": [],
        "print_methods": ["Digital Print"],
        "min_quantity": 1,
        "is_customizable": True,
        "stock_quantity": 50
    },
    {
        "name": "PVC Banner",
        "branch": "Promotional Materials",
        "category": "Signage",
        "description": "Durable outdoor PVC banner with full-color printing. Weather-resistant with reinforced edges and grommets.",
        "base_price": 20000,
        "image_url": "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
        "sizes": ["1x2m", "2x3m", "3x5m"],
        "colors": [],
        "print_methods": ["Digital Print"],
        "min_quantity": 1,
        "is_customizable": True,
        "stock_quantity": 100
    },
    
    # ==================== OFFICE EQUIPMENT ====================
    {
        "name": "Wireless Mouse",
        "branch": "Office Equipment",
        "category": "Tech Accessories",
        "description": "Ergonomic wireless mouse with customizable logo area. 2.4GHz wireless connectivity with USB receiver.",
        "base_price": 15000,
        "image_url": "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800",
        "sizes": ["Standard"],
        "colors": [
            {"name": "Black", "hex": "#000000"},
            {"name": "White", "hex": "#FFFFFF"},
            {"name": "Silver", "hex": "#C0C0C0"}
        ],
        "print_methods": ["Pad Print", "Laser Engraving"],
        "min_quantity": 25,
        "is_customizable": True,
        "stock_quantity": 200
    },
    {
        "name": "USB Flash Drive",
        "branch": "Office Equipment",
        "category": "Tech Accessories",
        "description": "Custom USB flash drive with your logo. Available in various capacities. Perfect for data distribution and corporate gifts.",
        "base_price": 10000,
        "image_url": "https://images.unsplash.com/photo-1618410320928-25228d811631?w=800",
        "sizes": ["8GB", "16GB", "32GB", "64GB"],
        "colors": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Silver", "hex": "#C0C0C0"},
            {"name": "Blue", "hex": "#2563eb"},
            {"name": "Red", "hex": "#dc2626"}
        ],
        "print_methods": ["Laser Engraving", "Screen Print"],
        "min_quantity": 50,
        "is_customizable": True,
        "stock_quantity": 500
    },
    {
        "name": "Wireless Charger",
        "branch": "Office Equipment",
        "category": "Tech Accessories",
        "description": "10W fast wireless charging pad compatible with all Qi-enabled devices. Large logo print area.",
        "base_price": 20000,
        "image_url": "https://images.unsplash.com/photo-1586816879360-004f5b0c51e5?w=800",
        "sizes": ["Standard"],
        "colors": [
            {"name": "Black", "hex": "#000000"},
            {"name": "White", "hex": "#FFFFFF"}
        ],
        "print_methods": ["Screen Print", "UV Print"],
        "min_quantity": 25,
        "is_customizable": True,
        "stock_quantity": 150
    },
    {
        "name": "Desktop Organizer",
        "branch": "Office Equipment",
        "category": "Desk Organizers",
        "description": "Premium leather-look desk organizer with multiple compartments. Keeps desk tidy and professional.",
        "base_price": 18000,
        "image_url": "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=800",
        "sizes": ["Standard"],
        "colors": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Brown", "hex": "#8B4513"}
        ],
        "print_methods": ["Debossing", "Screen Print"],
        "min_quantity": 10,
        "is_customizable": True,
        "stock_quantity": 100
    },
    {
        "name": "Mouse Pad",
        "branch": "Office Equipment",
        "category": "Desk Organizers",
        "description": "Full-color printed mouse pad with non-slip rubber base. Large surface area perfect for branding.",
        "base_price": 5000,
        "image_url": "https://images.unsplash.com/photo-1563297007-0686b7003af7?w=800",
        "sizes": ["Standard", "XL"],
        "colors": [],
        "print_methods": ["Sublimation"],
        "min_quantity": 25,
        "is_customizable": True,
        "stock_quantity": 400
    },
    {
        "name": "A4 Printing Paper (Ream)",
        "branch": "Office Equipment",
        "category": "Office Supplies",
        "description": "Premium 80gsm A4 printing paper. 500 sheets per ream. Suitable for all printers and copiers.",
        "base_price": 12000,
        "image_url": "https://images.unsplash.com/photo-1568702846914-96b305d2uj68?w=800",
        "sizes": ["A4"],
        "colors": [{"name": "White", "hex": "#FFFFFF"}],
        "print_methods": [],
        "min_quantity": 1,
        "is_customizable": False,
        "stock_quantity": 1000
    },
    
    # ==================== KONEKTSERIES (Ready-to-Buy) ====================
    {
        "name": "KonektSeries Premium Cap",
        "branch": "KonektSeries",
        "category": "Headwear",
        "description": "Exclusive KonektSeries branded cap with embroidered logo. Premium quality snapback design. Limited edition.",
        "base_price": 15000,
        "image_url": "https://images.unsplash.com/photo-1521369909029-2afed882baee?w=800",
        "sizes": ["One Size"],
        "colors": [
            {"name": "Navy Gold", "hex": "#1e3a5f"},
            {"name": "Black Gold", "hex": "#000000"}
        ],
        "print_methods": [],
        "min_quantity": 1,
        "is_customizable": False,
        "stock_quantity": 200
    },
    {
        "name": "KonektSeries Bucket Hat",
        "branch": "KonektSeries",
        "category": "Headwear",
        "description": "Trendy KonektSeries bucket hat with embroidered branding. Perfect for casual wear and outdoor events.",
        "base_price": 12000,
        "image_url": "https://images.unsplash.com/photo-1556306535-0f09a537f0a3?w=800",
        "sizes": ["S/M", "L/XL"],
        "colors": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Khaki", "hex": "#c4a661"}
        ],
        "print_methods": [],
        "min_quantity": 1,
        "is_customizable": False,
        "stock_quantity": 150
    },
    {
        "name": "KonektSeries Shorts",
        "branch": "KonektSeries",
        "category": "Apparel",
        "description": "Comfortable KonektSeries branded shorts with elastic waistband. Perfect for casual and athletic wear.",
        "base_price": 22000,
        "image_url": "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800",
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "colors": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Navy", "hex": "#1e3a5f"},
            {"name": "Gray", "hex": "#6b7280"}
        ],
        "print_methods": [],
        "min_quantity": 1,
        "is_customizable": False,
        "stock_quantity": 200
    },
    {
        "name": "KonektSeries T-Shirt",
        "branch": "KonektSeries",
        "category": "Apparel",
        "description": "Premium KonektSeries branded t-shirt with signature logo. 100% cotton, pre-shrunk for perfect fit.",
        "base_price": 18000,
        "image_url": "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800",
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "colors": [
            {"name": "White", "hex": "#FFFFFF"},
            {"name": "Black", "hex": "#000000"},
            {"name": "Navy", "hex": "#1e3a5f"}
        ],
        "print_methods": [],
        "min_quantity": 1,
        "is_customizable": False,
        "stock_quantity": 300
    },
    {
        "name": "KonektSeries Hoodie",
        "branch": "KonektSeries",
        "category": "Apparel",
        "description": "Premium heavyweight KonektSeries hoodie with embroidered logo. Fleece-lined for extra comfort.",
        "base_price": 38000,
        "image_url": "https://images.unsplash.com/photo-1620799139507-2a76f79a2f4d?w=800",
        "sizes": ["S", "M", "L", "XL", "XXL"],
        "colors": [
            {"name": "Black", "hex": "#000000"},
            {"name": "Navy", "hex": "#1e3a5f"}
        ],
        "print_methods": [],
        "min_quantity": 1,
        "is_customizable": False,
        "stock_quantity": 100
    }
]

# Admin user to seed
ADMIN_USER = {
    "email": "admin@konekt.co.tz",
    "password": "KonektAdmin2026!",  # CHANGE THIS IN PRODUCTION
    "full_name": "Konekt Administrator",
    "role": "admin"
}


async def seed_database():
    """Seed the database with products and admin user"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"Connected to MongoDB: {MONGO_URL}")
    print(f"Database: {DB_NAME}")
    
    # Create indexes
    print("\n📋 Creating indexes...")
    await db.users.create_index("email", unique=True)
    await db.users.create_index("referral_code")
    await db.products.create_index("branch")
    await db.products.create_index("category")
    await db.products.create_index([("name", "text"), ("description", "text")])
    await db.orders.create_index("user_id")
    await db.orders.create_index("current_status")
    await db.orders.create_index("order_number")
    await db.leads.create_index("status")
    await db.leads.create_index("assigned_to")
    await db.quotes.create_index("status")
    await db.sales_tasks.create_index("status")
    await db.sales_tasks.create_index("assigned_to")
    print("✅ Indexes created")
    
    # Seed admin user
    print("\n👤 Seeding admin user...")
    import bcrypt
    existing_admin = await db.users.find_one({"email": ADMIN_USER["email"]})
    if not existing_admin:
        user_id = str(uuid.uuid4())
        admin_doc = {
            "id": user_id,
            "email": ADMIN_USER["email"],
            "password_hash": bcrypt.hashpw(ADMIN_USER["password"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            "full_name": ADMIN_USER["full_name"],
            "phone": None,
            "company": "Konekt Limited",
            "points": 0,
            "credit_balance": 0,
            "referral_code": f"KONEKT-{user_id[:6].upper()}",
            "referred_by": None,
            "total_referrals": 0,
            "role": "admin",
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_doc)
        print(f"✅ Admin user created: {ADMIN_USER['email']}")
        print(f"   Password: {ADMIN_USER['password']}")
    else:
        print(f"⚠️  Admin user already exists: {ADMIN_USER['email']}")
    
    # Seed products
    print(f"\n📦 Seeding {len(PRODUCTS)} products...")
    
    # Clear existing products (optional)
    existing_count = await db.products.count_documents({})
    if existing_count > 0:
        print(f"⚠️  Found {existing_count} existing products. Skipping seed to avoid duplicates.")
        print("   To reseed, clear the products collection first.")
    else:
        for product_data in PRODUCTS:
            product = {
                "id": str(uuid.uuid4()),
                **product_data,
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.products.insert_one(product)
            print(f"   ✅ {product['branch']} > {product['name']}")
        
        print(f"\n✅ Seeded {len(PRODUCTS)} products")
    
    # Print summary
    print("\n" + "="*50)
    print("📊 Database Summary")
    print("="*50)
    users_count = await db.users.count_documents({})
    products_count = await db.products.count_documents({})
    print(f"   Users: {users_count}")
    print(f"   Products: {products_count}")
    
    # Count by branch
    branches = await db.products.distinct("branch")
    for branch in branches:
        count = await db.products.count_documents({"branch": branch})
        print(f"   - {branch}: {count} products")
    
    print("\n✅ Seeding complete!")
    print("\n⚠️  IMPORTANT: Change the admin password before going to production!")
    
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_database())
