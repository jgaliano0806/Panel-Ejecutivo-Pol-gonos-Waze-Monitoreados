---
description: responsive-design Mobile-first con Tailwind
---

export function Dashboard() {
  return (
    <div className="container mx-auto p-4">
      {/* Mobile: stack vertical, Desktop: grid 3 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard title="Alerts" value={42} />
        <MetricCard title="Jams" value={15} />
        <MetricCard title="Risk" value="HIGH" />
      </div>

      {/* Mobile: full width, Desktop: sidebar + content */}
      <div className="flex flex-col lg:flex-row gap-4 mt-6">
        <aside className="w-full lg:w-64 bg-gray-100 p-4 rounded">
          <Filters />
        </aside>
        <main className="flex-1">
          <MapView />
        </main>
      </div>
    </div>
  );
}
Breakpoints:

sm: 640px
md: 768px
lg: 1024px
xl: 1280px
2xl: 1536px
