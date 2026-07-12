export default function PlaceholderPage({ title, note }) {
  return (
    <div className="placeholder-page">
      <h1>{title}</h1>
      <p className="placeholder-note">{note}</p>
    </div>
  );
}
