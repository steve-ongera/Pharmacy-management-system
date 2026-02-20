"""
Management command to seed the database with sample pharmacy data.
Place this file at: your_app/management/commands/seed_data.py
"""

import os
import random
import glob
from decimal import Decimal
from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.files import File

# Update this import to match your actual app name
from pharmacy_app.models import Category, Medicine, Sale, SaleItem, MpesaTransaction


# ── Path to your local images folder ──────────────────────────────────────────
IMAGES_DIR = r"D:\BACKUP\Complete Projects\Pharmacy_MIS\backend\static\mydawa.com-1771587885054"


def get_random_image_path():
    """Return a random image file path from the images directory, or None."""
    if not os.path.isdir(IMAGES_DIR):
        return None
    patterns = ["*.jpg", "*.jpeg", "*.png", "*.webp", "*.gif"]
    images = []
    for pattern in patterns:
        images.extend(glob.glob(os.path.join(IMAGES_DIR, pattern)))
        images.extend(glob.glob(os.path.join(IMAGES_DIR, "**", pattern), recursive=True))
    return random.choice(images) if images else None


# ── Seed data definitions ──────────────────────────────────────────────────────

CATEGORIES = [
    {"name": "Antibiotics", "description": "Medicines used to treat bacterial infections."},
    {"name": "Analgesics", "description": "Pain relievers and fever reducers."},
    {"name": "Antifungals", "description": "Medicines that treat fungal infections."},
    {"name": "Antivirals", "description": "Medicines used to treat viral infections."},
    {"name": "Vitamins & Supplements", "description": "Nutritional supplements and vitamins."},
    {"name": "Antihypertensives", "description": "Medicines that lower blood pressure."},
    {"name": "Antidiabetics", "description": "Medicines used to manage diabetes."},
    {"name": "Antihistamines", "description": "Medicines that treat allergic reactions."},
    {"name": "Gastrointestinal", "description": "Medicines for digestive and stomach issues."},
    {"name": "Dermatologicals", "description": "Skin care and treatment medicines."},
]

MEDICINES = [
    # Antibiotics
    {"name": "Amoxicillin 500mg", "generic_name": "Amoxicillin", "category": "Antibiotics",
     "unit": "capsule", "price": "85.00", "cost_price": "50.00", "stock_quantity": 200,
     "reorder_level": 30, "expiry_date": date.today() + timedelta(days=365),
     "requires_prescription": True, "manufacturer": "Dawa Limited",
     "description": "Broad-spectrum antibiotic for bacterial infections.", "barcode": "6001001000001"},

    {"name": "Ciprofloxacin 500mg", "generic_name": "Ciprofloxacin", "category": "Antibiotics",
     "unit": "tablet", "price": "120.00", "cost_price": "75.00", "stock_quantity": 150,
     "reorder_level": 25, "expiry_date": date.today() + timedelta(days=400),
     "requires_prescription": True, "manufacturer": "Cosmos Limited",
     "description": "Fluoroquinolone antibiotic for urinary tract and respiratory infections.", "barcode": "6001001000002"},

    {"name": "Metronidazole 400mg", "generic_name": "Metronidazole", "category": "Antibiotics",
     "unit": "tablet", "price": "45.00", "cost_price": "25.00", "stock_quantity": 300,
     "reorder_level": 40, "expiry_date": date.today() + timedelta(days=500),
     "requires_prescription": True, "manufacturer": "Elys Chemical Industries",
     "description": "Antibiotic effective against anaerobic bacteria and protozoa.", "barcode": "6001001000003"},

    {"name": "Azithromycin 250mg", "generic_name": "Azithromycin", "category": "Antibiotics",
     "unit": "tablet", "price": "95.00", "cost_price": "60.00", "stock_quantity": 180,
     "reorder_level": 20, "expiry_date": date.today() + timedelta(days=450),
     "requires_prescription": True, "manufacturer": "Dawa Limited",
     "description": "Macrolide antibiotic for respiratory and skin infections.", "barcode": "6001001000004"},

    # Analgesics
    {"name": "Paracetamol 500mg", "generic_name": "Paracetamol", "category": "Analgesics",
     "unit": "tablet", "price": "20.00", "cost_price": "8.00", "stock_quantity": 500,
     "reorder_level": 100, "expiry_date": date.today() + timedelta(days=730),
     "requires_prescription": False, "manufacturer": "Dawa Limited",
     "description": "Common pain reliever and fever reducer.", "barcode": "6001002000001"},

    {"name": "Ibuprofen 400mg", "generic_name": "Ibuprofen", "category": "Analgesics",
     "unit": "tablet", "price": "35.00", "cost_price": "18.00", "stock_quantity": 350,
     "reorder_level": 50, "expiry_date": date.today() + timedelta(days=600),
     "requires_prescription": False, "manufacturer": "Cosmos Limited",
     "description": "NSAID for pain, fever, and inflammation.", "barcode": "6001002000002"},

    {"name": "Diclofenac 50mg", "generic_name": "Diclofenac Sodium", "category": "Analgesics",
     "unit": "tablet", "price": "55.00", "cost_price": "30.00", "stock_quantity": 200,
     "reorder_level": 30, "expiry_date": date.today() + timedelta(days=480),
     "requires_prescription": True, "manufacturer": "Elys Chemical Industries",
     "description": "NSAID used for arthritis, pain, and inflammation.", "barcode": "6001002000003"},

    {"name": "Tramadol 50mg", "generic_name": "Tramadol HCl", "category": "Analgesics",
     "unit": "capsule", "price": "110.00", "cost_price": "65.00", "stock_quantity": 100,
     "reorder_level": 20, "expiry_date": date.today() + timedelta(days=365),
     "requires_prescription": True, "manufacturer": "Dawa Limited",
     "description": "Opioid analgesic for moderate to severe pain.", "barcode": "6001002000004"},

    # Antifungals
    {"name": "Fluconazole 150mg", "generic_name": "Fluconazole", "category": "Antifungals",
     "unit": "capsule", "price": "150.00", "cost_price": "90.00", "stock_quantity": 120,
     "reorder_level": 15, "expiry_date": date.today() + timedelta(days=400),
     "requires_prescription": True, "manufacturer": "Cosmos Limited",
     "description": "Antifungal for candidiasis and cryptococcal infections.", "barcode": "6001003000001"},

    {"name": "Clotrimazole Cream 1%", "generic_name": "Clotrimazole", "category": "Antifungals",
     "unit": "cream", "price": "180.00", "cost_price": "100.00", "stock_quantity": 80,
     "reorder_level": 10, "expiry_date": date.today() + timedelta(days=720),
     "requires_prescription": False, "manufacturer": "Dawa Limited",
     "description": "Topical antifungal cream for skin and nail infections.", "barcode": "6001003000002"},

    # Vitamins & Supplements
    {"name": "Vitamin C 500mg", "generic_name": "Ascorbic Acid", "category": "Vitamins & Supplements",
     "unit": "tablet", "price": "25.00", "cost_price": "12.00", "stock_quantity": 400,
     "reorder_level": 60, "expiry_date": date.today() + timedelta(days=900),
     "requires_prescription": False, "manufacturer": "Cosmos Limited",
     "description": "Antioxidant vitamin that boosts immune function.", "barcode": "6001005000001"},

    {"name": "Zinc Sulphate 20mg", "generic_name": "Zinc Sulphate", "category": "Vitamins & Supplements",
     "unit": "tablet", "price": "30.00", "cost_price": "15.00", "stock_quantity": 300,
     "reorder_level": 50, "expiry_date": date.today() + timedelta(days=850),
     "requires_prescription": False, "manufacturer": "Elys Chemical Industries",
     "description": "Zinc supplement for immune support and wound healing.", "barcode": "6001005000002"},

    {"name": "Folic Acid 5mg", "generic_name": "Folic Acid", "category": "Vitamins & Supplements",
     "unit": "tablet", "price": "20.00", "cost_price": "9.00", "stock_quantity": 350,
     "reorder_level": 60, "expiry_date": date.today() + timedelta(days=730),
     "requires_prescription": False, "manufacturer": "Dawa Limited",
     "description": "B-vitamin important in pregnancy and red blood cell formation.", "barcode": "6001005000003"},

    {"name": "Multivitamin Syrup 200ml", "generic_name": "Multivitamin", "category": "Vitamins & Supplements",
     "unit": "syrup", "price": "250.00", "cost_price": "150.00", "stock_quantity": 60,
     "reorder_level": 10, "expiry_date": date.today() + timedelta(days=540),
     "requires_prescription": False, "manufacturer": "Cosmos Limited",
     "description": "Comprehensive vitamin and mineral syrup for children.", "barcode": "6001005000004"},

    # Antihypertensives
    {"name": "Amlodipine 5mg", "generic_name": "Amlodipine Besylate", "category": "Antihypertensives",
     "unit": "tablet", "price": "70.00", "cost_price": "40.00", "stock_quantity": 250,
     "reorder_level": 35, "expiry_date": date.today() + timedelta(days=600),
     "requires_prescription": True, "manufacturer": "Dawa Limited",
     "description": "Calcium channel blocker for hypertension and angina.", "barcode": "6001006000001"},

    {"name": "Enalapril 10mg", "generic_name": "Enalapril Maleate", "category": "Antihypertensives",
     "unit": "tablet", "price": "65.00", "cost_price": "38.00", "stock_quantity": 200,
     "reorder_level": 30, "expiry_date": date.today() + timedelta(days=550),
     "requires_prescription": True, "manufacturer": "Cosmos Limited",
     "description": "ACE inhibitor for high blood pressure and heart failure.", "barcode": "6001006000002"},

    {"name": "Losartan 50mg", "generic_name": "Losartan Potassium", "category": "Antihypertensives",
     "unit": "tablet", "price": "90.00", "cost_price": "55.00", "stock_quantity": 180,
     "reorder_level": 25, "expiry_date": date.today() + timedelta(days=500),
     "requires_prescription": True, "manufacturer": "Elys Chemical Industries",
     "description": "ARB for hypertension and kidney protection in diabetics.", "barcode": "6001006000003"},

    # Antidiabetics
    {"name": "Metformin 500mg", "generic_name": "Metformin HCl", "category": "Antidiabetics",
     "unit": "tablet", "price": "40.00", "cost_price": "22.00", "stock_quantity": 300,
     "reorder_level": 50, "expiry_date": date.today() + timedelta(days=700),
     "requires_prescription": True, "manufacturer": "Dawa Limited",
     "description": "First-line oral medication for type 2 diabetes.", "barcode": "6001007000001"},

    {"name": "Glibenclamide 5mg", "generic_name": "Glibenclamide", "category": "Antidiabetics",
     "unit": "tablet", "price": "35.00", "cost_price": "18.00", "stock_quantity": 250,
     "reorder_level": 40, "expiry_date": date.today() + timedelta(days=650),
     "requires_prescription": True, "manufacturer": "Cosmos Limited",
     "description": "Sulphonylurea for type 2 diabetes management.", "barcode": "6001007000002"},

    # Antihistamines
    {"name": "Loratadine 10mg", "generic_name": "Loratadine", "category": "Antihistamines",
     "unit": "tablet", "price": "30.00", "cost_price": "15.00", "stock_quantity": 280,
     "reorder_level": 40, "expiry_date": date.today() + timedelta(days=700),
     "requires_prescription": False, "manufacturer": "Dawa Limited",
     "description": "Non-drowsy antihistamine for allergic rhinitis and urticaria.", "barcode": "6001008000001"},

    {"name": "Chlorphenamine 4mg", "generic_name": "Chlorphenamine Maleate", "category": "Antihistamines",
     "unit": "tablet", "price": "18.00", "cost_price": "8.00", "stock_quantity": 350,
     "reorder_level": 60, "expiry_date": date.today() + timedelta(days=800),
     "requires_prescription": False, "manufacturer": "Elys Chemical Industries",
     "description": "Antihistamine for allergies, hay fever, and cold symptoms.", "barcode": "6001008000002"},

    # Gastrointestinal
    {"name": "Omeprazole 20mg", "generic_name": "Omeprazole", "category": "Gastrointestinal",
     "unit": "capsule", "price": "55.00", "cost_price": "30.00", "stock_quantity": 240,
     "reorder_level": 35, "expiry_date": date.today() + timedelta(days=600),
     "requires_prescription": False, "manufacturer": "Dawa Limited",
     "description": "Proton pump inhibitor for GERD, ulcers, and acid reflux.", "barcode": "6001009000001"},

    {"name": "ORS Sachet", "generic_name": "Oral Rehydration Salts", "category": "Gastrointestinal",
     "unit": "sachet", "price": "15.00", "cost_price": "6.00", "stock_quantity": 500,
     "reorder_level": 100, "expiry_date": date.today() + timedelta(days=1000),
     "requires_prescription": False, "manufacturer": "Cosmos Limited",
     "description": "Oral rehydration therapy for diarrhoea and dehydration.", "barcode": "6001009000002"},

    {"name": "Loperamide 2mg", "generic_name": "Loperamide HCl", "category": "Gastrointestinal",
     "unit": "capsule", "price": "28.00", "cost_price": "14.00", "stock_quantity": 200,
     "reorder_level": 30, "expiry_date": date.today() + timedelta(days=750),
     "requires_prescription": False, "manufacturer": "Elys Chemical Industries",
     "description": "Anti-diarrhoeal agent for acute and chronic diarrhoea.", "barcode": "6001009000003"},

    # Dermatologicals
    {"name": "Hydrocortisone Cream 1%", "generic_name": "Hydrocortisone", "category": "Dermatologicals",
     "unit": "cream", "price": "120.00", "cost_price": "70.00", "stock_quantity": 90,
     "reorder_level": 15, "expiry_date": date.today() + timedelta(days=720),
     "requires_prescription": False, "manufacturer": "Dawa Limited",
     "description": "Mild corticosteroid cream for eczema, rashes, and itching.", "barcode": "6001010000001"},

    {"name": "Benzoyl Peroxide 5% Gel", "generic_name": "Benzoyl Peroxide", "category": "Dermatologicals",
     "unit": "cream", "price": "200.00", "cost_price": "120.00", "stock_quantity": 60,
     "reorder_level": 10, "expiry_date": date.today() + timedelta(days=540),
     "requires_prescription": False, "manufacturer": "Cosmos Limited",
     "description": "Topical gel for acne treatment.", "barcode": "6001010000002"},
]


class Command(BaseCommand):
    help = "Seed the database with sample pharmacy data (categories, medicines, sales, M-Pesa transactions)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all existing data before seeding.",
        )

    def handle(self, *args, **options):
        if options["flush"]:
            self.stdout.write(self.style.WARNING("Flushing existing data..."))
            MpesaTransaction.objects.all().delete()
            SaleItem.objects.all().delete()
            Sale.objects.all().delete()
            Medicine.objects.all().delete()
            Category.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("Existing data deleted."))

        self._seed_categories()
        self._seed_medicines()
        self._seed_users()
        self._seed_sales()
        self.stdout.write(self.style.SUCCESS("\n✅  Database seeded successfully!"))

    # ── Categories ─────────────────────────────────────────────────────────────

    def _seed_categories(self):
        self.stdout.write("Seeding categories...")
        for data in CATEGORIES:
            Category.objects.get_or_create(name=data["name"], defaults={"description": data["description"]})
        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(CATEGORIES)} categories ready."))

    # ── Medicines ──────────────────────────────────────────────────────────────

    def _seed_medicines(self):
        self.stdout.write("Seeding medicines...")
        created = 0
        for data in MEDICINES:
            category = Category.objects.filter(name=data["category"]).first()
            medicine, was_created = Medicine.objects.get_or_create(
                barcode=data["barcode"],
                defaults={
                    "name": data["name"],
                    "generic_name": data["generic_name"],
                    "category": category,
                    "description": data["description"],
                    "manufacturer": data["manufacturer"],
                    "unit": data["unit"],
                    "price": Decimal(data["price"]),
                    "cost_price": Decimal(data["cost_price"]),
                    "stock_quantity": data["stock_quantity"],
                    "reorder_level": data["reorder_level"],
                    "expiry_date": data["expiry_date"],
                    "requires_prescription": data["requires_prescription"],
                    "is_active": True,
                },
            )

            # Attach a random image if the medicine was just created and has no image
            if was_created and not medicine.image:
                img_path = get_random_image_path()
                if img_path:
                    with open(img_path, "rb") as f:
                        medicine.image.save(os.path.basename(img_path), File(f), save=True)

            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(f"  ✓ {created} new medicines created ({len(MEDICINES)} total defined)."))

    # ── Users / Cashiers ───────────────────────────────────────────────────────

    def _seed_users(self):
        self.stdout.write("Seeding users...")
        users_data = [
            {"username": "admin", "password": "admin1234", "first_name": "Admin", "last_name": "User",
             "email": "admin@pharmacy.co.ke", "is_staff": True, "is_superuser": True},
            {"username": "cashier1", "password": "cashier1234", "first_name": "Jane",
             "last_name": "Mwangi", "email": "jane@pharmacy.co.ke"},
            {"username": "cashier2", "password": "cashier1234", "first_name": "Peter",
             "last_name": "Omondi", "email": "peter@pharmacy.co.ke"},
        ]
        for u in users_data:
            if not User.objects.filter(username=u["username"]).exists():
                User.objects.create_user(**u)
        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(users_data)} users ready."))

    # ── Sales & M-Pesa ─────────────────────────────────────────────────────────

    def _seed_sales(self):
        self.stdout.write("Seeding sales...")
        cashiers = list(User.objects.all())
        medicines = list(Medicine.objects.filter(is_active=True))

        if not medicines:
            self.stdout.write(self.style.WARNING("  No medicines found – skipping sales."))
            return

        customer_names = [
            "Walk-in Customer", "Mary Wanjiku", "James Kamau", "Grace Otieno",
            "David Njoroge", "Fatuma Hassan", "Patrick Mwenda", "Sarah Chebet",
        ]
        customer_phones = ["", "0712345678", "0723456789", "0734567890", "0745678901", "0756789012"]
        payment_methods = ["cash", "mpesa", "card"]
        statuses = ["completed", "completed", "completed", "completed", "refunded", "cancelled"]

        sales_created = 0
        mpesa_created = 0

        for i in range(30):
            cashier = random.choice(cashiers)
            payment_method = random.choice(payment_methods)
            status = random.choice(statuses)
            customer = random.choice(customer_names)
            phone = random.choice(customer_phones)

            # Build sale items first to compute totals
            num_items = random.randint(1, 5)
            cart = []
            subtotal = Decimal("0.00")
            for _ in range(num_items):
                med = random.choice(medicines)
                qty = random.randint(1, 10)
                unit_price = med.price
                total_price = unit_price * qty
                cart.append({"medicine": med, "quantity": qty, "unit_price": unit_price, "total_price": total_price})
                subtotal += total_price

            discount = Decimal(str(round(random.uniform(0, float(subtotal) * 0.1), 2)))
            total_amount = subtotal - discount
            amount_paid = total_amount if status == "completed" else Decimal("0.00")
            change_amount = amount_paid - total_amount if amount_paid >= total_amount else Decimal("0.00")

            # Offset created_at into the past for variety
            days_ago = random.randint(0, 90)

            sale = Sale(
                cashier=cashier,
                customer_name=customer,
                customer_phone=phone,
                payment_method=payment_method,
                subtotal=subtotal,
                discount=discount,
                total_amount=total_amount,
                amount_paid=amount_paid,
                change_amount=change_amount,
                status=status,
            )
            sale.save()  # receipt_number generated inside save()

            # Manually backdate created_at after first save
            Sale.objects.filter(pk=sale.pk).update(
                created_at=timezone.now() - timedelta(days=days_ago)
            )

            # Create sale items
            for item in cart:
                SaleItem.objects.create(
                    sale=sale,
                    medicine=item["medicine"],
                    medicine_name=item["medicine"].name,
                    quantity=item["quantity"],
                    unit_price=item["unit_price"],
                    total_price=item["total_price"],
                )

            # Create M-Pesa transaction for mpesa sales
            if payment_method == "mpesa" and status == "completed":
                import uuid as _uuid
                checkout_id = f"ws_CO_{_uuid.uuid4().hex[:16].upper()}"
                MpesaTransaction.objects.create(
                    sale=sale,
                    checkout_request_id=checkout_id,
                    merchant_request_id=f"MR-{_uuid.uuid4().hex[:8].upper()}",
                    phone_number=phone or "0700000000",
                    amount=total_amount,
                    mpesa_receipt_number=f"QKL{random.randint(1000000, 9999999)}",
                    status="success",
                    result_code="0",
                    result_description="The service request is processed successfully.",
                    transaction_date=timezone.now() - timedelta(days=days_ago),
                )
                mpesa_created += 1

            sales_created += 1

        self.stdout.write(self.style.SUCCESS(
            f"  ✓ {sales_created} sales created, {mpesa_created} M-Pesa transactions created."
        ))