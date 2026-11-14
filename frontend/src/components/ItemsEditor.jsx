export default function ItemsEditor({ items, showDiscount, onAdd, onChange, onRemove }) {
  return (
    <section className="card">
      <h2>Items</h2>
      <div className="item">
        <span className="hd">Qty</span>
        <span className="hd">Item</span>
        <span className="hd">Price</span>
        {showDiscount ? <span className="hd dx">Disc %</span> : null}
        <span />
      </div>
      {items.map((item, i) => (
        <div className={showDiscount ? 'item' : 'item slim'} key={i}>
          <input type="number" min="0" value={item.q ?? ''} onChange={(e) => onChange(i, 'q', e.target.value)} placeholder="1" />
          <input value={item.d ?? ''} onChange={(e) => onChange(i, 'd', e.target.value)} placeholder="Ankara fabric" />
          <input type="number" min="0" value={item.p ?? ''} onChange={(e) => onChange(i, 'p', e.target.value)} placeholder="4500" />
          {showDiscount ? (
            <input className="dx" type="number" min="0" max="100" value={item.x ?? ''} onChange={(e) => onChange(i, 'x', e.target.value)} placeholder="0" />
          ) : null}
          <button type="button" className="x" onClick={() => onRemove(i)} aria-label="Remove item">&times;</button>
        </div>
      ))}
      <button type="button" className="btn alt" onClick={onAdd}>Add item</button>
    </section>
  );
}