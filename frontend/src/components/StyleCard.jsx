export default function StyleCard({ id, label, imageSrc, onClick }) {
  return (
    <div className="style-card-wrap">
      <button type="button" className="opt big" onClick={onClick} aria-pressed="false">
        <img alt={`Sample ${label}`} src={imageSrc} />
        <b>{label}</b>
      </button>
    </div>
  );
}