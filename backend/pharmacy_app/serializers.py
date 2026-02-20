from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Category, Medicine, Sale, SaleItem, MpesaTransaction


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email']


class CategorySerializer(serializers.ModelSerializer):
    medicine_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'medicine_count', 'created_at']

    def get_medicine_count(self, obj):
        return obj.medicines.filter(is_active=True).count()


class MedicineSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    is_low_stock = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = Medicine
        fields = [
            'id', 'name', 'generic_name', 'category', 'category_name',
            'image', 'description', 'manufacturer', 'barcode', 'unit',
            'price', 'cost_price', 'stock_quantity', 'reorder_level',
            'expiry_date', 'requires_prescription', 'is_active',
            'is_low_stock', 'is_expired', 'created_at', 'updated_at'
        ]


class MedicineListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for POS and lists"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    is_low_stock = serializers.ReadOnlyField()

    class Meta:
        model = Medicine
        fields = [
            'id', 'name', 'generic_name', 'category_name', 'image',
            'unit', 'price', 'stock_quantity', 'is_low_stock',
            'requires_prescription', 'barcode'
        ]


class SaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaleItem
        fields = ['id', 'medicine', 'medicine_name', 'quantity', 'unit_price', 'total_price']
        read_only_fields = ['medicine_name', 'total_price']


class SaleItemCreateSerializer(serializers.Serializer):
    medicine_id = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    cashier_name = serializers.CharField(source='cashier.get_full_name', read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id', 'receipt_number', 'cashier', 'cashier_name',
            'customer_name', 'customer_phone', 'payment_method',
            'subtotal', 'discount', 'total_amount', 'amount_paid',
            'change_amount', 'status', 'notes', 'items', 'created_at'
        ]
        read_only_fields = ['receipt_number', 'cashier']


class SaleCreateSerializer(serializers.Serializer):
    customer_name = serializers.CharField(required=False, default='Walk-in Customer')
    customer_phone = serializers.CharField(required=False, allow_blank=True)
    payment_method = serializers.ChoiceField(choices=['cash', 'mpesa', 'card'])
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = serializers.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = serializers.CharField(required=False, allow_blank=True)
    items = SaleItemCreateSerializer(many=True)

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("At least one item is required.")
        return items


class MpesaTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaTransaction
        fields = [
            'id', 'sale', 'checkout_request_id', 'merchant_request_id',
            'phone_number', 'amount', 'mpesa_receipt_number', 'status',
            'result_code', 'result_description', 'transaction_date', 'created_at'
        ]
        read_only_fields = ['checkout_request_id', 'merchant_request_id', 'status']


class STKPushSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    sale_id = serializers.IntegerField()

    def validate_phone_number(self, value):
        phone = value.replace('+', '').replace(' ', '')
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('7') or phone.startswith('1'):
            phone = '254' + phone
        if not phone.startswith('254') or len(phone) != 12:
            raise serializers.ValidationError("Invalid Kenyan phone number. Use format: 07XXXXXXXX or 254XXXXXXXXX")
        return phone


class DashboardStatsSerializer(serializers.Serializer):
    total_sales_today = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_transactions_today = serializers.IntegerField()
    total_medicines = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
    expired_count = serializers.IntegerField()
    sales_this_week = serializers.ListField()
    top_medicines = serializers.ListField()
    payment_breakdown = serializers.DictField()