export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-8 w-40 rounded-lg bg-gray-200" />
          <div className="mt-2 h-4 w-56 rounded bg-gray-100" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-28 rounded-lg bg-gray-200" />
          <div className="h-10 w-28 rounded-lg bg-gray-200" />
        </div>
      </div>
      <div className="rounded-xl border bg-white p-6">
        <div className="mb-4 h-6 w-40 rounded bg-gray-200" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
