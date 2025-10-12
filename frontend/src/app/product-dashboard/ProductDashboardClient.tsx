"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { useAuth } from '@/hooks/useAuth';
import {
  Product,
  ProductOrder,
  ProductOrderStatus,
  PlanCode,
  PlanPaymentStatus,
} from '@/types';
import ProductFormModal from '@/components/ProductFormModal';
import ConfirmationModal from '@/components/ConfirmationModal/ConfirmationModal';
import styles from './ProductDashboard.module.css';
import { Skeleton, SkeletonGroup } from '@/components/Skeleton/Skeleton';
import { APP_PLANS, PLAN_BY_CODE } from '@/constants/plans';

type TabKey = 'products' | 'orders';
const tabs: { key: TabKey; label: string }[] = [
  { key: 'products', label: 'My Products' },
  { key: 'orders', label: 'Orders' },
];

const statusOptions: ProductOrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

const BANK_DETAILS = {
  bank: 'Capitec Bank',
  accountNumber: '1618097723',
  accountHolder: 'J Msengi',
  whatsapp: '0787770524',
};

const PLAN_PAYMENT_LABELS: Record<PlanPaymentStatus, string> = {
  PENDING_SELECTION: 'Package not selected',
  AWAITING_PROOF: 'Awaiting proof of payment',
  PROOF_SUBMITTED: 'Proof submitted — pending review',
  VERIFIED: 'Payment verified',
};

export default function ProductDashboardClient() {
  const { user, authStatus } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const initialTab = (search.get('tab') as TabKey) || 'products';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [sellerPlanCode, setSellerPlanCode] = useState<PlanCode>('STARTER');
  const [sellerPlanStatus, setSellerPlanStatus] = useState<PlanPaymentStatus>('PENDING_SELECTION');
  const [sellerPlanReference, setSellerPlanReference] = useState('');
  const [sellerPlanProofAt, setSellerPlanProofAt] = useState<string | null>(null);
  const [sellerPlanVerifiedAt, setSellerPlanVerifiedAt] = useState<string | null>(null);
  const [sellerPlanPriceCents, setSellerPlanPriceCents] = useState<number | null>(null);
  const [hasSentProof, setHasSentProof] = useState(false);
  const [isPlanUpdating, setIsPlanUpdating] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    setIsProductsLoading(true);
    try {
      const res = await fetch('/api/products/my-products', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch products');
      setProducts(await res.json());
    } catch (error) {
      console.error(error);
      toast.error('Could not load your products.');
    } finally {
      setIsProductsLoading(false);
    }
  }, [user]);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setIsOrdersLoading(true);
    try {
      const res = await fetch('/api/product-orders/seller', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch orders');
      setOrders(await res.json());
    } catch (error) {
      console.error(error);
      toast.error('Could not load orders.');
    } finally {
      setIsOrdersLoading(false);
    }
  }, [user]);

  const fetchSellerPlan = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch('/api/users/me', {
        credentials: 'include',
        cache: 'no-store' as any,
      });
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      const code = (data.sellerPlanCode ?? 'STARTER') as PlanCode;
      const status = (data.sellerPlanPaymentStatus ?? 'PENDING_SELECTION') as PlanPaymentStatus;
      setSellerPlanCode(code);
      setSellerPlanStatus(status);
      setSellerPlanReference(
        data.sellerPlanPaymentReference ?? `${data.firstName ?? ''} ${data.lastName ?? ''}`.trim(),
      );
      setSellerPlanProofAt(data.sellerPlanProofSubmittedAt ?? null);
      setSellerPlanVerifiedAt(data.sellerPlanVerifiedAt ?? null);
      setSellerPlanPriceCents(
        typeof data.sellerPlanPriceCents === 'number' ? data.sellerPlanPriceCents : null,
      );
      setHasSentProof(status === 'PROOF_SUBMITTED' || status === 'VERIFIED');
    } catch (error) {
      console.error(error);
      toast.error('Unable to load your seller package details.');
    }
  }, [user]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    fetchProducts();
  }, [authStatus, fetchProducts]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    fetchSellerPlan();
  }, [authStatus, fetchSellerPlan]);

  useEffect(() => {
    if (authStatus !== 'authenticated') return;
    if (activeTab === 'orders') {
      fetchOrders();
    }
  }, [authStatus, activeTab, fetchOrders]);

  const handleTabChange = (tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(search.toString());
    params.set('tab', tab);
    router.replace(`/product-dashboard?${params.toString()}`);
  };

  const planDetails = PLAN_BY_CODE[sellerPlanCode] ?? APP_PLANS[0];
  const planAmountDisplay = typeof sellerPlanPriceCents === 'number'
    ? `R${(sellerPlanPriceCents / 100).toFixed(2)}`
    : planDetails.price;
  const proofAtDisplay = sellerPlanProofAt
    ? new Date(sellerPlanProofAt).toLocaleString('en-ZA')
    : null;
  const verifiedAtDisplay = sellerPlanVerifiedAt
    ? new Date(sellerPlanVerifiedAt).toLocaleString('en-ZA')
    : null;
  const defaultReference = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const fallbackReference = defaultReference || 'Your business name';
  const effectiveReference = (sellerPlanReference || '').trim() || fallbackReference;

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleProductSaved = (product: Product) => {
    setProducts((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      if (exists) {
        return prev.map((p) => (p.id === product.id ? product : p));
      }
      return [product, ...prev];
    });
    handleModalClose();
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    try {
      const res = await fetch(`/api/products/${deletingProduct.id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete product');
      setProducts((prev) => prev.filter((p) => p.id !== deletingProduct.id));
      toast.success('Product deleted successfully.');
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete product.');
    } finally {
      setDeletingProduct(null);
    }
  };

  const handleCopyReference = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard API unavailable');
      }
      await navigator.clipboard.writeText(effectiveReference);
      toast.success('Reference copied');
    } catch {
      toast.error('Unable to copy reference automatically');
    }
  };

  const handlePlanSubmit = async () => {
    const paymentReference = effectiveReference;
    setIsPlanUpdating(true);
    try {
      const res = await fetch('/api/users/me/seller-plan', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planCode: sellerPlanCode,
          hasSentProof,
          paymentReference,
        }),
      });
      if (!res.ok) throw new Error('Failed to update plan');
      const updated = await res.json();
      const nextCode = (updated.sellerPlanCode ?? sellerPlanCode) as PlanCode;
      const nextStatus = (updated.sellerPlanPaymentStatus ?? sellerPlanStatus) as PlanPaymentStatus;
      setSellerPlanCode(nextCode);
      setSellerPlanStatus(nextStatus);
      setSellerPlanReference(updated.sellerPlanPaymentReference ?? paymentReference);
      setSellerPlanProofAt(updated.sellerPlanProofSubmittedAt ?? null);
      setSellerPlanVerifiedAt(updated.sellerPlanVerifiedAt ?? null);
      setSellerPlanPriceCents(
        typeof updated.sellerPlanPriceCents === 'number'
          ? updated.sellerPlanPriceCents
          : sellerPlanPriceCents,
      );
      setHasSentProof(nextStatus === 'PROOF_SUBMITTED' || nextStatus === 'VERIFIED');
      toast.success('Seller package updated');
    } catch (error) {
      console.error(error);
      toast.error('Could not update your seller package.');
    } finally {
      setIsPlanUpdating(false);
    }
  };

  const handleOrderStatusChange = async (orderId: string, status: ProductOrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/product-orders/${orderId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update order');
      setOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, status } : order)));
      toast.success('Order updated');
    } catch (error) {
      console.error(error);
      toast.error('Could not update order status.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const isLoading = useMemo(() => {
    if (authStatus === 'loading') return true;
    if (activeTab === 'products') return isProductsLoading;
    return false;
  }, [authStatus, activeTab, isProductsLoading]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>Product Dashboard</h1>
        <div className={styles.tabBar} aria-hidden>
          {tabs.map((tab) => (
            <Skeleton
              key={tab.key}
              variant="button"
              style={{ width: '45%' }}
            />
          ))}
        </div>
        <div className={styles.toolbar} aria-hidden>
          <Skeleton variant="button" style={{ width: '30%' }} />
        </div>
        <SkeletonGroup count={3} className={styles.productList}>
          {() => (
            <div className={styles.productCard} aria-hidden>
              <div className={styles.productImageWrapper}>
                <Skeleton style={{ width: '100%', height: '100%' }} />
              </div>
              <div className={styles.productInfo}>
                <Skeleton variant="text" style={{ width: '60%' }} />
                <Skeleton variant="text" style={{ width: '40%' }} />
                <Skeleton variant="text" style={{ width: '30%' }} />
                <div className={styles.actions}>
                  <Skeleton variant="button" style={{ width: '45%' }} />
                  <Skeleton variant="button" style={{ width: '45%' }} />
                </div>
              </div>
            </div>
          )}
        </SkeletonGroup>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Product Dashboard</h1>
      <div className={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tabButton} ${activeTab === tab.key ? styles.activeTab : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className={styles.planSection}>
        <header className={styles.planHeader}>
          <div>
            <h2>Seller package</h2>
            <p>Choose your package, send payment, and submit proof to unlock full marketplace visibility.</p>
          </div>
          <span className={`${styles.planStatusBadge} ${styles[`planStatus_${sellerPlanStatus.toLowerCase()}`]}`}>
            {PLAN_PAYMENT_LABELS[sellerPlanStatus]}
          </span>
        </header>
        <div className={styles.planMeta}>
          <span><strong>Selected package:</strong> {planDetails.name}</span>
          <span><strong>Amount due:</strong> {planAmountDisplay}</span>
          {proofAtDisplay && <span>Proof submitted: {proofAtDisplay}</span>}
          {verifiedAtDisplay && <span>Verified on: {verifiedAtDisplay}</span>}
        </div>
        <div className={styles.planGrid}>
          {APP_PLANS.map((plan) => {
            const isSelected = plan.code === sellerPlanCode;
            return (
              <button
                key={plan.code}
                type="button"
                className={`${styles.planCard} ${isSelected ? styles.selectedPlan : ''}`}
                onClick={() => setSellerPlanCode(plan.code)}
              >
                <span className={styles.planName}>{plan.name}</span>
                <span className={styles.planPrice}>{plan.price}</span>
                <ul className={styles.planFeatures}>
                  <li>Visibility weight: {plan.visibilityWeight}</li>
                  <li>Max listings: {plan.maxListings}</li>
                  {plan.features.slice(0, 2).map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
        <div className={styles.planNotice}>
          {sellerPlanStatus !== 'VERIFIED' && (
            <p className={styles.planWarning}>
              Your products remain hidden until payment is verified.
            </p>
          )}
          <p>
            Pay <strong>{planAmountDisplay}</strong> to <strong>{BANK_DETAILS.bank}</strong> (Account holder: <strong>{BANK_DETAILS.accountHolder}</strong>, Account number: <strong>{BANK_DETAILS.accountNumber}</strong>). Use <strong>{effectiveReference}</strong> as your payment reference and WhatsApp the proof to <strong>{BANK_DETAILS.whatsapp}</strong>.
          </p>
          <div className={styles.planControls}>
            <label className={styles.planReferenceLabel}>
              Payment reference
              <input
                type="text"
                value={sellerPlanReference}
                placeholder={fallbackReference}
                onChange={(e) => setSellerPlanReference(e.target.value)}
                className={styles.planReferenceInput}
              />
            </label>
            <button type="button" className={styles.copyButton} onClick={handleCopyReference}>Copy</button>
            <label className={styles.proofCheckbox}>
              <input
                type="checkbox"
                checked={hasSentProof}
                onChange={(e) => setHasSentProof(e.target.checked)}
                disabled={sellerPlanStatus === 'VERIFIED'}
              />
              I have sent proof via WhatsApp
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePlanSubmit}
              disabled={isPlanUpdating}
            >
              {isPlanUpdating ? 'Saving…' : 'Save package & status'}
            </button>
          </div>
        </div>
      </section>

      {activeTab === 'products' && (
        <>
          <div className={styles.toolbar}>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary"
              disabled={sellerPlanStatus === 'PENDING_SELECTION'}
              title={sellerPlanStatus === 'PENDING_SELECTION' ? 'Select a package and submit proof before adding products.' : undefined}
            >
              Add New Product
            </button>
          </div>
          {sellerPlanStatus === 'PENDING_SELECTION' && (
            <p className={styles.planGuard}>Select a seller package and submit payment proof to unlock product uploads.</p>
          )}
          <div className={styles.productList}>
            {products.map((product) => (
              <div key={product.id} className={styles.productCard}>
                <div className={styles.productImageWrapper}>
                  <Image
                    src={product.images[0] || 'https://via.placeholder.com/150'}
                    alt={product.name}
                    className={styles.productImage}
                    fill
                    sizes="(max-width: 768px) 100vw, 120px"
                  />
                </div>
                <div className={styles.productInfo}>
                  <h2>{product.name}</h2>
                  <p>Price: R{product.price.toFixed(2)}</p>
                  <p>Stock: {product.stock ?? 0}</p>
                  {product.approvalStatus && (
                    <p>
                      Status:{' '}
                      <span className={`${styles.status} ${styles[product.approvalStatus.toLowerCase()]}`}>
                        {product.approvalStatus}
                      </span>
                    </p>
                  )}
                  <div className={styles.actions}>
                    <button onClick={() => { setEditingProduct(product); setIsModalOpen(true); }} className="btn btn-secondary">
                      Edit
                    </button>
                    <button onClick={() => setDeletingProduct(product)} className="btn btn-danger">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'orders' && (
        <div className={styles.ordersSection}>
          {isOrdersLoading ? (
            <SkeletonGroup count={3} className={styles.orderList}>
              {() => (
                <div className={styles.orderCard} aria-hidden>
                  <div className={styles.orderSummary}>
                    <div className={styles.orderImageWrapper}>
                      <Skeleton style={{ width: '100%', height: '100%' }} />
                    </div>
                    <div className={styles.orderDetails}>
                      <Skeleton variant="text" style={{ width: '70%' }} />
                      <Skeleton variant="text" style={{ width: '50%' }} />
                      <Skeleton variant="text" style={{ width: '40%' }} />
                    </div>
                  </div>
                  <div className={styles.statusRow}>
                    <Skeleton variant="text" style={{ width: '35%' }} />
                    <Skeleton variant="button" style={{ width: '45%' }} />
                  </div>
                  <Skeleton variant="text" style={{ width: '60%' }} />
                </div>
              )}
            </SkeletonGroup>
          ) : orders.length === 0 ? (
            <div className={styles.emptyState}>No orders yet.</div>
          ) : (
            <div className={styles.orderList}>
              {orders.map((order) => (
                <div key={order.id} className={styles.orderCard}>
                  <div className={styles.orderSummary}>
                    <div className={styles.orderImageWrapper}>
                      <Image
                        src={order.product.images[0] || 'https://via.placeholder.com/120'}
                        alt={order.product.name}
                        fill
                        sizes="120px"
                      />
                    </div>
                    <div className={styles.orderDetails}>
                      <h3>{order.product.name}</h3>
                      <p>Buyer: {`${order.buyer?.firstName ?? ''} ${order.buyer?.lastName ?? ''}`.trim() || 'Customer'}</p>
                      <p>Quantity: {order.quantity}</p>
                      <p>Total: R{order.totalPrice.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className={styles.statusRow}>
                    <label htmlFor={`order-${order.id}`}>Status</label>
                    <select
                      id={`order-${order.id}`}
                      value={order.status}
                      disabled={updatingOrderId === order.id}
                      onChange={(event) => handleOrderStatusChange(order.id, event.target.value as ProductOrderStatus)}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  {order.notes && <p className={styles.orderNotes}>Notes: {order.notes}</p>}
                  {order.contactPhone && <p className={styles.orderNotes}>Contact: {order.contactPhone}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isModalOpen && (
        <ProductFormModal
          initialData={editingProduct}
          onClose={handleModalClose}
          onProductAdded={handleProductSaved}
        />
      )}

      {deletingProduct && (
        <ConfirmationModal
          message={`Are you sure you want to delete "${deletingProduct.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setDeletingProduct(null)}
          confirmText="Delete"
        />
      )}
    </div>
  );
}
