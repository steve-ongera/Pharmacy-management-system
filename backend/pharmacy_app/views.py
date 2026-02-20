from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta
import requests
import base64
import json
import logging
from decouple import config

from .models import Category, Medicine, Sale, SaleItem, MpesaTransaction
from .serializers import (
    CategorySerializer, MedicineSerializer, MedicineListSerializer,
    SaleSerializer, SaleCreateSerializer, MpesaTransactionSerializer,
    STKPushSerializer, UserSerializer
)

logger = logging.getLogger(__name__)


# ─── Auth ──────────────────────────────────────────────────────────────────────

class CustomTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class CustomTokenView(TokenObtainPairView):
    serializer_class = CustomTokenSerializer


# ─── Category ──────────────────────────────────────────────────────────────────

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']


# ─── Medicine ──────────────────────────────────────────────────────────────────

class MedicineViewSet(viewsets.ModelViewSet):
    queryset = Medicine.objects.select_related('category').filter(is_active=True)
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'generic_name', 'barcode', 'manufacturer']
    ordering_fields = ['name', 'price', 'stock_quantity', 'created_at']
    ordering = ['name']

    def get_serializer_class(self):
        if self.action == 'list':
            return MedicineListSerializer
        return MedicineSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        low_stock = self.request.query_params.get('low_stock')
        if category:
            qs = qs.filter(category_id=category)
        if low_stock == 'true':
            qs = [m for m in qs if m.is_low_stock]
        return qs

    @action(detail=False, methods=['get'])
    def pos_search(self, request):
        """Fast search for POS terminal"""
        query = request.query_params.get('q', '')
        medicines = Medicine.objects.filter(
            Q(name__icontains=query) |
            Q(generic_name__icontains=query) |
            Q(barcode__iexact=query),
            is_active=True,
            stock_quantity__gt=0
        )[:20]
        return Response(MedicineListSerializer(medicines, many=True, context={'request': request}).data)

    @action(detail=True, methods=['patch'])
    def update_stock(self, request, pk=None):
        medicine = self.get_object()
        qty = request.data.get('quantity')
        if qty is None:
            return Response({'error': 'quantity required'}, status=400)
        medicine.stock_quantity = max(0, medicine.stock_quantity + int(qty))
        medicine.save()
        return Response(MedicineSerializer(medicine, context={'request': request}).data)


# ─── Sales ─────────────────────────────────────────────────────────────────────

class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.prefetch_related('items').select_related('cashier')
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering = ['-created_at']
    http_method_names = ['get', 'post', 'patch', 'head', 'options']

    def get_queryset(self):
        qs = super().get_queryset()
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        payment = self.request.query_params.get('payment_method')
        status_ = self.request.query_params.get('status')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        if payment:
            qs = qs.filter(payment_method=payment)
        if status_:
            qs = qs.filter(status=status_)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = SaleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            # Validate stock
            items_data = data['items']
            medicines = {}
            for item in items_data:
                med = Medicine.objects.select_for_update().get(pk=item['medicine_id'])
                if med.stock_quantity < item['quantity']:
                    return Response(
                        {'error': f"Insufficient stock for {med.name}. Available: {med.stock_quantity}"},
                        status=400
                    )
                medicines[item['medicine_id']] = med

            subtotal = sum(i['unit_price'] * i['quantity'] for i in items_data)
            discount = data.get('discount', 0)
            total = subtotal - discount

            sale = Sale.objects.create(
                cashier=request.user,
                customer_name=data.get('customer_name', 'Walk-in Customer'),
                customer_phone=data.get('customer_phone', ''),
                payment_method=data['payment_method'],
                subtotal=subtotal,
                discount=discount,
                total_amount=total,
                amount_paid=data.get('amount_paid', total),
                change_amount=max(0, data.get('amount_paid', total) - total),
                notes=data.get('notes', ''),
                status='completed' if data['payment_method'] != 'mpesa' else 'pending'
            )

            for item in items_data:
                med = medicines[item['medicine_id']]
                SaleItem.objects.create(
                    sale=sale,
                    medicine=med,
                    medicine_name=med.name,
                    quantity=item['quantity'],
                    unit_price=item['unit_price'],
                    total_price=item['unit_price'] * item['quantity']
                )
                med.stock_quantity -= item['quantity']
                med.save()

        return Response(SaleSerializer(sale, context={'request': request}).data, status=201)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        today = timezone.now().date()
        week_start = today - timedelta(days=6)

        today_sales = Sale.objects.filter(created_at__date=today, status='completed')
        today_total = today_sales.aggregate(total=Sum('total_amount'))['total'] or 0
        today_count = today_sales.count()

        # Sales last 7 days
        weekly = []
        for i in range(7):
            day = week_start + timedelta(days=i)
            day_total = Sale.objects.filter(
                created_at__date=day, status='completed'
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            weekly.append({'date': str(day), 'total': float(day_total)})

        total_medicines = Medicine.objects.filter(is_active=True).count()
        low_stock = sum(1 for m in Medicine.objects.filter(is_active=True) if m.is_low_stock)
        expired = sum(1 for m in Medicine.objects.filter(is_active=True) if m.is_expired)

        # Top 5 medicines this week
        top = SaleItem.objects.filter(
            sale__created_at__date__gte=week_start,
            sale__status='completed'
        ).values('medicine_name').annotate(
            total_qty=Sum('quantity'),
            total_revenue=Sum('total_price')
        ).order_by('-total_qty')[:5]

        # Payment breakdown today
        payment_breakdown = {}
        for method in ['cash', 'mpesa', 'card']:
            amt = today_sales.filter(payment_method=method).aggregate(
                total=Sum('total_amount'))['total'] or 0
            payment_breakdown[method] = float(amt)

        return Response({
            'total_sales_today': float(today_total),
            'total_transactions_today': today_count,
            'total_medicines': total_medicines,
            'low_stock_count': low_stock,
            'expired_count': expired,
            'sales_this_week': weekly,
            'top_medicines': list(top),
            'payment_breakdown': payment_breakdown,
        })


# ─── M-Pesa ────────────────────────────────────────────────────────────────────
import time

# Module-level token cache
_token_cache = {'token': None, 'expires_at': 0}

class MpesaService:
    """Daraja API integration"""

    CONSUMER_KEY = config('MPESA_CONSUMER_KEY', default='')
    CONSUMER_SECRET = config('MPESA_CONSUMER_SECRET', default='')
    SHORTCODE = config('MPESA_SHORTCODE', default='174379')
    PASSKEY = config('MPESA_PASSKEY', default='')
    CALLBACK_URL = config('MPESA_CALLBACK_URL', default='https://yourdomain.com/api/mpesa/callback/')
    ENVIRONMENT = config('MPESA_ENVIRONMENT', default='sandbox')

    @property
    def base_url(self):
        if self.ENVIRONMENT == 'production':
            return 'https://api.safaricom.co.ke'
        return 'https://sandbox.safaricom.co.ke'

    def get_access_token(self):
        # Return cached token if still valid (with 60s buffer)
        if _token_cache['token'] and time.time() < _token_cache['expires_at'] - 60:
            logger.debug("[MPESA] Using cached token")
            return _token_cache['token']

        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        credentials = base64.b64encode(
            f"{self.CONSUMER_KEY}:{self.CONSUMER_SECRET}".encode()
        ).decode()

        resp = requests.get(
            url,
            headers={
                'Authorization': f'Basic {credentials}',
                'User-Agent': 'MyPharmacyApp/1.0',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
            },
            timeout=10
        )
        resp.raise_for_status()
        data = resp.json()

        # Cache for ~1 hour (token expires in 3599s)
        _token_cache['token'] = data['access_token']
        _token_cache['expires_at'] = time.time() + int(data.get('expires_in', 3599))
        
        logger.debug(f"[MPESA] Fresh token cached, expires in {data.get('expires_in')}s")
        return _token_cache['token']

    def get_password(self, timestamp):
        raw = f"{self.SHORTCODE}{self.PASSKEY}{timestamp}"
        logger.debug(f"[MPESA] Password raw string: {self.SHORTCODE} + {self.PASSKEY} + {timestamp}")
        logger.debug(f"[MPESA] Full raw (first 30 chars): {raw[:30]}")
        return base64.b64encode(raw.encode()).decode()

    def stk_push(self, phone: str, amount: int, account_ref: str, description: str):
        token = self.get_access_token()
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        password = self.get_password(timestamp)
        
        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        payload = {
            "BusinessShortCode": self.SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone,
            "PartyB": self.SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": self.CALLBACK_URL,
            "AccountReference": account_ref,
            "TransactionDesc": description
        }
        
        logger.debug(f"[MPESA] STK Push URL: {url}")
        logger.debug(f"[MPESA] STK Push payload: {json.dumps({**payload, 'Password': '***HIDDEN***'})}")
        logger.debug(f"[MPESA] Shortcode: {self.SHORTCODE}")
        logger.debug(f"[MPESA] Passkey (first 10): {self.PASSKEY[:10] if self.PASSKEY else 'EMPTY!'}")
        logger.debug(f"[MPESA] Timestamp: {timestamp}")
        logger.debug(f"[MPESA] Phone: {phone}")
        logger.debug(f"[MPESA] Amount: {amount}")
        logger.debug(f"[MPESA] Callback URL: {self.CALLBACK_URL}")
        logger.debug(f"[MPESA] Environment: {self.ENVIRONMENT}")
        
        try:
            resp = requests.post(
                url,
                json=payload,
                headers={'Authorization': f'Bearer {token}'},
                timeout=30
            )
            logger.debug(f"[MPESA] STK response status: {resp.status_code}")
            logger.debug(f"[MPESA] STK response body: {resp.text}")
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as e:
            logger.error(f"[MPESA] STK Push HTTP error: {e}")
            if e.response is not None:
                logger.error(f"[MPESA] STK error status code: {e.response.status_code}")
                logger.error(f"[MPESA] STK error response body: {e.response.text}")
                try:
                    error_json = e.response.json()
                    logger.error(f"[MPESA] STK error parsed: {error_json}")
                except Exception:
                    pass
            raise

    def query_stk_status(self, checkout_request_id: str):
        token = self.get_access_token()
        timestamp = timezone.now().strftime('%Y%m%d%H%M%S')
        url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
        payload = {
            "BusinessShortCode": self.SHORTCODE,
            "Password": self.get_password(timestamp),
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }
        resp = requests.post(
            url,
            json=payload,
            headers={'Authorization': f'Bearer {token}'},
            timeout=30
        )
        resp.raise_for_status()
        return resp.json()


mpesa_service = MpesaService()


class MpesaViewSet(viewsets.GenericViewSet):
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='stk-push')
    def stk_push(self, request):
        serializer = STKPushSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Normalize phone to 2547XXXXXXXX format
        phone = str(data['phone_number']).strip()
        if phone.startswith('+'):
            phone = phone[1:]
        elif phone.startswith('0'):
            phone = '254' + phone[1:]
        
        amount = max(1, int(data['amount']))
        
        logger.debug(f"[MPESA] STK Push requested — phone: {phone}, amount: {amount}, sale_id: {data['sale_id']}")

        try:
            sale = Sale.objects.get(pk=data['sale_id'])
        except Sale.DoesNotExist:
            logger.error(f"[MPESA] Sale {data['sale_id']} not found")
            return Response({'error': 'Sale not found'}, status=404)

        try:
            resp = mpesa_service.stk_push(
                phone=phone,
                amount=amount,
                account_ref=sale.receipt_number,
                description=f"Pharmacy payment {sale.receipt_number}"
            )
            logger.debug(f"[MPESA] STK full response: {resp}")
        except Exception as e:
            logger.error(f"[MPESA] STK Push exception: {e}")
            return Response({'error': str(e)}, status=500)

        if resp.get('ResponseCode') == '0':
            txn, _ = MpesaTransaction.objects.update_or_create(
                sale=sale,
                defaults={
                    'checkout_request_id': resp['CheckoutRequestID'],
                    'merchant_request_id': resp.get('MerchantRequestID', ''),
                    'phone_number': phone,
                    'amount': amount,
                    'status': 'pending',
                    'result_code': '',
                    'result_description': '',
                }
            )
            return Response({
                'checkout_request_id': txn.checkout_request_id,
                'message': resp.get('CustomerMessage', 'STK push sent'),
                'status': 'pending'
            })
        
        logger.error(f"[MPESA] STK Push failed — ResponseCode: {resp.get('ResponseCode')}, error: {resp.get('errorMessage')} full: {resp}")
        return Response({'error': resp.get('errorMessage', 'STK push failed'), 'raw': resp}, status=400)

    @action(detail=False, methods=['get'], url_path='status/(?P<checkout_id>[^/.]+)')
    def check_status(self, request, checkout_id=None):
        try:
            txn = MpesaTransaction.objects.get(checkout_request_id=checkout_id)
        except MpesaTransaction.DoesNotExist:
            return Response({'error': 'Transaction not found'}, status=404)

        # ✅ Don't call Safaricom if already resolved
        if txn.status in ['success', 'failed', 'cancelled', 'timeout']:
            return Response(MpesaTransactionSerializer(txn).data)

        # Only query Safaricom if still pending
        try:
            resp = mpesa_service.query_stk_status(checkout_id)
            result_code = str(resp.get('ResultCode', ''))
            if result_code == '0':
                txn.status = 'success'
                txn.result_code = result_code
                txn.save()
                if txn.sale:
                    txn.sale.status = 'completed'
                    txn.sale.save()
            elif result_code in ['1032', '1037']:
                txn.status = 'cancelled'
                txn.result_description = resp.get('ResultDesc', '')
                txn.save()
            elif result_code:
                txn.status = 'failed'
                txn.result_description = resp.get('ResultDesc', '')
                txn.save()
        except Exception as e:
            logger.warning(f"Status check error: {e}")

        return Response(MpesaTransactionSerializer(txn).data)

    @action(
        detail=False, methods=['post'], url_path='callback',
        permission_classes=[AllowAny]
    )
    def callback(self, request):
        """M-Pesa callback URL — Safaricom posts here"""
        data = request.data
        body = data.get('Body', {}).get('stkCallback', {})
        checkout_id = body.get('CheckoutRequestID')
        result_code = str(body.get('ResultCode', ''))
        result_desc = body.get('ResultDesc', '')

        try:
            txn = MpesaTransaction.objects.get(checkout_request_id=checkout_id)
        except MpesaTransaction.DoesNotExist:
            return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})

        if result_code == '0':
            callback_metadata = body.get('CallbackMetadata', {}).get('Item', [])
            meta = {item['Name']: item.get('Value') for item in callback_metadata}
            txn.status = 'success'
            txn.mpesa_receipt_number = meta.get('MpesaReceiptNumber', '')
            txn.transaction_date = timezone.now()
            if txn.sale:
                txn.sale.status = 'completed'
                txn.sale.save()
        else:
            txn.status = 'cancelled' if result_code == '1032' else 'failed'

        txn.result_code = result_code
        txn.result_description = result_desc
        txn.save()

        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})