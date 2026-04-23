import { PackagePlus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

function AddProductOnboarding() {
  const navigate = useNavigate()

  return (
    <div className="mx-auto flex min-h-[calc(100vh-168px)] w-full max-w-[1240px] items-center justify-center">
      <section className="w-full max-w-xl rounded-[28px] border border-white/6 bg-[#0B0F14] p-6 text-slate-100 shadow-[0_30px_90px_rgba(2,6,23,0.42)] sm:p-8">
        <div className="mx-auto flex max-w-sm flex-col items-center text-center">
          <div className="inline-flex items-center rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-sky-300">
            Step 2 of 3
          </div>

          <div className="mt-5 grid w-full grid-cols-3 gap-2">
            <span className="h-2 rounded-full bg-emerald-400/80" />
            <span className="h-2 rounded-full bg-sky-400/90" />
            <span className="h-2 rounded-full bg-white/10" />
          </div>

          <div className="mt-8 inline-flex h-[72px] w-[72px] items-center justify-center rounded-3xl border border-white/8 bg-white/[0.04]">
            <PackagePlus className="h-9 w-9 text-sky-300" />
          </div>

          <h2 className="mt-8 text-3xl font-semibold tracking-tight text-white">
            Add your first product
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
            Start selling by adding your first product.
          </p>

          <button
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-xl bg-sky-400 px-5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
            type="button"
            onClick={() => navigate('/products/new')}
          >
            + Add Product
          </button>
        </div>
      </section>
    </div>
  )
}

export default AddProductOnboarding
