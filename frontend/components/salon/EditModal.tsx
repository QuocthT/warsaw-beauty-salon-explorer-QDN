"use client"

import { useState } from "react"
import { X, Save, Loader2 } from "lucide-react"
import type { SalonDetail, SalonUpdateRequest } from "@/types/salon"
import { updateSalon } from "@/lib/api"

interface EditModalProps {
  salon: SalonDetail
  onClose: () => void
  onSaved: (updated: SalonDetail) => void
}

const FIELDS: { key: keyof SalonUpdateRequest; label: string; type?: string }[] = [
  { key: "name",        label: "Name" },
  { key: "address",     label: "Address" },
  { key: "district",    label: "District" },
  { key: "phone",       label: "Phone" },
  { key: "website",     label: "Website", type: "url" },
  { key: "services",    label: "Services (comma-separated)" },
  { key: "priceRange",  label: "Price Range (e.g. $$)" },
  { key: "rating",      label: "Rating (0–5)", type: "number" },
  { key: "reviewCount", label: "Review Count",  type: "number" },
]

export function EditModal({ salon, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState<Record<string, string>>({
    name:        salon.name        ?? "",
    address:     salon.address     ?? "",
    district:    salon.district    ?? "",
    phone:       salon.phone       ?? "",
    website:     salon.website     ?? "",
    services:    salon.services    ?? "",
    priceRange:  salon.priceRange  ?? "",
    rating:      salon.rating      != null ? String(salon.rating)      : "",
    reviewCount: salon.reviewCount != null ? String(salon.reviewCount) : "",
  })

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)

    // Build payload — only include fields that differ from original
    const payload: SalonUpdateRequest = {}
    if (form.name        !== salon.name)                              payload.name        = form.name
    if (form.address     !== salon.address)                           payload.address     = form.address
    if (form.district    !== salon.district)                          payload.district    = form.district
    if (form.phone       !== (salon.phone       ?? ""))               payload.phone       = form.phone
    if (form.website     !== (salon.website     ?? ""))               payload.website     = form.website
    if (form.services    !== (salon.services    ?? ""))               payload.services    = form.services
    if (form.priceRange  !== (salon.priceRange  ?? ""))               payload.priceRange  = form.priceRange
    if (form.rating      !== (salon.rating      != null ? String(salon.rating)      : "")) payload.rating      = Number(form.rating)
    if (form.reviewCount !== (salon.reviewCount != null ? String(salon.reviewCount) : "")) payload.reviewCount = Number(form.reviewCount)

    if (Object.keys(payload).length === 0) {
      onClose()
      return
    }

    try {
      const updated = await updateSalon(salon.id, payload)
      onSaved(updated)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-slide-in">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-lg font-semibold text-ink">Edit Salon</h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Fields */}
        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
          {FIELDS.map(({ key, label, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-muted mb-1.5 uppercase tracking-wide">
                {label}
              </label>
              <input
                type={type ?? "text"}
                value={form[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                step={type === "number" ? (key === "rating" ? "0.1" : "1") : undefined}
                min={type === "number" ? "0" : undefined}
                max={type === "number" && key === "rating" ? "5" : undefined}
                className="w-full px-3 py-2 text-sm bg-cream border border-border rounded-lg
                           focus:outline-none focus:border-rose focus:ring-1 focus:ring-rose/20
                           transition-colors"
              />
            </div>
          ))}

          {error && (
            <p className="text-sm text-rose bg-blush/30 border border-blush rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-muted hover:text-ink transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium
                       bg-rose text-white rounded-lg hover:bg-rose/90
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
