export default function DashboardLoading() {
  const panel = 'rounded-2xl border border-border bg-card/60 animate-pulse';
  return (
    <div className="space-y-4">
      <div>
        <div className="h-7 w-32 rounded bg-muted/40" />
        <div className="mt-1 h-4 w-56 rounded bg-muted/30" />
      </div>
      <div className="grid grid-cols-12 gap-3.5">
        <div className={`${panel} col-span-12 lg:col-span-8 h-[290px]`} />
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-3.5">
          <div className={`${panel} h-[88px]`} />
          <div className={`${panel} h-[88px]`} />
          <div className={`${panel} h-[88px]`} />
        </div>
        <div className={`${panel} col-span-12 lg:col-span-7 h-[280px]`} />
        <div className={`${panel} col-span-12 lg:col-span-5 h-[280px]`} />
        <div className={`${panel} col-span-12 md:col-span-6 lg:col-span-4 h-[180px]`} />
        <div className={`${panel} col-span-12 md:col-span-6 lg:col-span-5 h-[180px]`} />
        <div className={`${panel} col-span-12 md:col-span-12 lg:col-span-3 h-[180px]`} />
      </div>
    </div>
  );
}
