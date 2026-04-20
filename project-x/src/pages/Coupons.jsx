import { useEffect, useState } from 'react'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { createCoupon, deleteCoupon, getCoupons, updateCoupon } from '../utils/api.js'

const initialCouponForm = {
  code: '',
  type: 'percentage',
  value: '',
  minOrderValue: '',
  maxDiscount: '',
  usageLimit: '',
  expiresAt: '',
  isActive: true,
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatToISO(dateStr) {
  if (!dateStr) {
    return null
  }

  const parsedDate = dateStr.includes('/')
    ? (() => {
        const [day, month, year] = dateStr.split('/')
        return new Date(`${year}-${month}-${day}T00:00:00`)
      })()
    : new Date(dateStr)

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error('Invalid date format. Use YYYY-MM-DD')
  }

  return parsedDate.toISOString()
}

function getDateInputFromISO(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toISOString().slice(0, 10)
}

function Coupons() {
  const { currentStore, storeSwitchVersion } = useAppContext()
  const { showToast } = useToast()
  const [coupons, setCoupons] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState(null)
  const [formData, setFormData] = useState(initialCouponForm)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let isCancelled = false

    async function loadCoupons() {
      setCoupons([])
      setIsModalOpen(false)
      setEditingCoupon(null)
      setFormData(initialCouponForm)

      if (!currentStore?.id) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const response = await getCoupons(currentStore.id)
        if (isCancelled) {
          return
        }
        setCoupons(response)
      } catch (error) {
        console.error(error)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadCoupons()

    return () => {
      isCancelled = true
    }
  }, [currentStore?.id, storeSwitchVersion])

  function openCreateModal() {
    setEditingCoupon(null)
    setFormData(initialCouponForm)
    setIsModalOpen(true)
  }

  function openEditModal(coupon) {
    setEditingCoupon(coupon)
    setFormData({
      code: coupon.code,
      type: coupon.type,
      value: String(coupon.value ?? ''),
      minOrderValue: coupon.minOrderValue ? String(coupon.minOrderValue) : '',
      maxDiscount: coupon.maxDiscount ? String(coupon.maxDiscount) : '',
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
      expiresAt: getDateInputFromISO(coupon.expiresAt),
      isActive: Boolean(coupon.isActive),
    })
    setIsModalOpen(true)
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setFormData((currentData) => ({
      ...currentData,
      [name]: type === 'checkbox' ? checked : name === 'code' ? value.toUpperCase() : value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!currentStore?.id) {
      return
    }

    setIsSubmitting(true)

    try {
      const expires_at = formatToISO(formData.expiresAt)
      console.log('Final expiry date:', expires_at)
      if (typeof expires_at !== 'string') {
        throw new Error('Invalid date format. Use YYYY-MM-DD')
      }

      const payload = {
        storeId: currentStore.id,
        code: formData.code.trim().toUpperCase(),
        type: formData.type,
        value: Number(formData.value),
        minOrderValue: Number(formData.minOrderValue) || 0,
        maxDiscount: formData.type === 'percentage' ? Number(formData.maxDiscount) || 0 : 0,
        usageLimit: Number(formData.usageLimit) || 0,
        expires_at,
        isActive: formData.isActive,
      }

      if (editingCoupon) {
        const updatedCoupon = await updateCoupon(editingCoupon.id, payload)
        setCoupons((currentCoupons) =>
          currentCoupons.map((coupon) =>
            coupon.id === updatedCoupon.id ? updatedCoupon : coupon,
          ),
        )
        showToast('Coupon updated', 'success')
      } else {
        const createdCoupon = await createCoupon(payload)
        setCoupons((currentCoupons) => [...currentCoupons, createdCoupon])
        showToast('Coupon created', 'success')
      }

      setIsModalOpen(false)
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(couponId) {
    if (!currentStore?.id) {
      showToast('Select a store first', 'error')
      return
    }

    try {
      await deleteCoupon(couponId, currentStore.id)
      setCoupons((currentCoupons) => currentCoupons.filter((coupon) => coupon.id !== couponId))
      showToast('Coupon deleted', 'success')
    } catch (error) {
      console.error(error)
      showToast(error.message || 'Something went wrong', 'error')
    }
  }

  return (
    <div className="coupons-page">
      <div className="stores-page__header">
        <div>
          <h2>Coupons</h2>
          <p>Create discounts for this store.</p>
        </div>
        <Button onClick={openCreateModal}>Create Coupon</Button>
      </div>

      <SurfaceCard className="stores-list-card">
        {isLoading ? (
          <p className="product-empty-state">Loading coupons...</p>
        ) : coupons.length === 0 ? (
          <p className="product-empty-state">No coupons yet</p>
        ) : (
          <div className="coupons-table">
            <div className="coupons-table__head">
              <span>Code</span>
              <span>Type</span>
              <span>Value</span>
              <span>Usage</span>
              <span>Expiry</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {coupons.map((coupon) => (
              <div className="coupons-table__row" key={coupon.id}>
                <strong>{coupon.code}</strong>
                <span>{coupon.type}</span>
                <span>{coupon.type === 'percentage' ? `${coupon.value}%` : `₹${coupon.value}`}</span>
                <span>
                  {coupon.usedCount || 0} / {coupon.usageLimit || '∞'}
                </span>
                <span>{formatDate(coupon.expiresAt)}</span>
                <span className={`order-badge ${coupon.isActive ? 'order-badge--paid' : 'order-badge--failed'}`}>
                  {coupon.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="coupons-table__actions">
                  <Button size="sm" variant="outline" onClick={() => openEditModal(coupon)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleDelete(coupon.id)}>
                    Delete
                  </Button>
                </span>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>

      {isModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <SurfaceCard
            as="form"
            className="coupon-modal"
            role="dialog"
            aria-modal="true"
            onSubmit={handleSubmit}
          >
            <div className="coupon-modal__header">
              <h3>{editingCoupon ? 'Edit Coupon' : 'Create Coupon'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)}>
                Close
              </button>
            </div>

            <div className="product-form__field">
              <label htmlFor="coupon-code">Code</label>
              <input
                id="coupon-code"
                name="code"
                type="text"
                value={formData.code}
                onChange={handleChange}
                placeholder="SAVE10"
                required
              />
            </div>

            <div className="product-form__columns">
              <div className="product-form__field">
                <label htmlFor="coupon-type">Type</label>
                <select id="coupon-type" name="type" value={formData.type} onChange={handleChange}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>
              <div className="product-form__field">
                <label htmlFor="coupon-value">Value</label>
                <input
                  id="coupon-value"
                  name="value"
                  type="number"
                  min="1"
                  max={formData.type === 'percentage' ? '100' : undefined}
                  value={formData.value}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="product-form__columns">
              <div className="product-form__field">
                <label htmlFor="coupon-min">Min order value</label>
                <input
                  id="coupon-min"
                  name="minOrderValue"
                  type="number"
                  min="0"
                  value={formData.minOrderValue}
                  onChange={handleChange}
                />
              </div>
              {formData.type === 'percentage' ? (
                <div className="product-form__field">
                  <label htmlFor="coupon-max">Max discount</label>
                  <input
                    id="coupon-max"
                    name="maxDiscount"
                    type="number"
                    min="0"
                    value={formData.maxDiscount}
                    onChange={handleChange}
                  />
                </div>
              ) : null}
            </div>

            <div className="product-form__columns">
              <div className="product-form__field">
                <label htmlFor="coupon-limit">Usage limit</label>
                <input
                  id="coupon-limit"
                  name="usageLimit"
                  type="number"
                  min="0"
                  value={formData.usageLimit}
                  onChange={handleChange}
                />
              </div>
              <div className="product-form__field">
                <label htmlFor="coupon-expiry">Expiry date</label>
                <input
                  id="coupon-expiry"
                  name="expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <label className="theme-settings-toggle" htmlFor="coupon-active">
              <div>
                <strong>Active</strong>
                <p>Allow customers to use this coupon.</p>
              </div>
              <input
                id="coupon-active"
                name="isActive"
                type="checkbox"
                checked={formData.isActive}
                onChange={handleChange}
              />
            </label>

            <Button disabled={isSubmitting} type="submit" variant="primary">
              {isSubmitting ? 'Saving...' : editingCoupon ? 'Update Coupon' : 'Create Coupon'}
            </Button>
          </SurfaceCard>
        </div>
      ) : null}
    </div>
  )
}

export default Coupons
