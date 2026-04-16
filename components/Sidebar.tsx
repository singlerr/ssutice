import PushButton from './PushButton';

export default function Sidebar() {
  return (
    <aside className="w-60 flex-shrink-0 flex flex-col pt-6 pb-4 pr-4">
      {/* Brand */}
      <div className="mb-6 px-2">
        <p className="text-blue-700 font-bold text-base">SSU Today</p>
        <p className="text-gray-400 text-xs uppercase tracking-widest mt-0.5">Academic Curator</p>
      </div>

      <div className="flex-1" />

      {/* Push subscribe button */}
      <PushButton />
    </aside>
  );
}
