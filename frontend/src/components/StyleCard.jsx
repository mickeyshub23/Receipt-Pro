export default function StyleCard({ id, label, imageSrc, onClick }) {
  return (
    <div className="hover-white-card">
      <button type="button" className="opt big" onClick={onClick} aria-pressed="false">
        <img alt={`Sample ${label}`} src={imageSrc} />
        <b>{label}</b>
      </button>
    </div>
  );
}