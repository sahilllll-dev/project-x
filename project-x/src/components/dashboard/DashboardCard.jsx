function joinClasses(...values) {
  return values.filter(Boolean).join(' ')
}

function DashboardCard({ className = '', children }) {
  return (
    <section
      className={joinClasses(
        'rounded-2xl border border-white/6 bg-[#111827] p-5 shadow-[0_18px_48px_rgba(2,6,23,0.28)]',
        className,
      )}
    >
      {children}
    </section>
  )
}

export default DashboardCard
