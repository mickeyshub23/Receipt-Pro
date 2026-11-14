export default function Header({ name, onLogout }) {
  return (
    <header className="appbar">
      <b>Receipt Pro</b>
      <span className="helper">Add your details, pick a style, then preview and download your receipt.</span>
      {name ? <span className="who">Hi, {name}</span> : null}
      {onLogout ? (
        <button type="button" className="btn alt" style={{ padding: '6px 12px', fontSize: 13 }} onClick={onLogout}>
          Log out
        </button>
      ) : null}
    </header>
  );
}