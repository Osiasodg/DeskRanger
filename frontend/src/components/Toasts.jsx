export default function Toasts({ toasts }) {
  if (!toasts.length) return null;
  return (
    <div className="toasts" role="status">
      {toasts.map((t) => (
        <div key={t.id} className={`toast panel hit toast-${t.kind}`}>{t.message}</div>
      ))}
    </div>
  );
}
