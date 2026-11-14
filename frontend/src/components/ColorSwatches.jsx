import { THEMES, THEME_ORDER } from '../lib/themes';

export default function ColorSwatches({ value, onChange }) {
  return (
    <div id="sws" style={{ display: 'flex', gap: 10 }}>
      {THEME_ORDER.map((k) => (
        <button
          key={k}
          type="button"
          className="sw"
          data-k={k}
          aria-label={`${k} background`}
          aria-pressed={value === k}
          style={{ background: THEMES[k].swatch }}
          onClick={() => onChange(k)}
        />
      ))}
    </div>
  );
}