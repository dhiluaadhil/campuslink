export default function TagPicker({ tags = [], selected = [], onChange, min = 3 }) {
  const toggle = (tagId) => {
    if (selected.includes(tagId)) {
      onChange(selected.filter((id) => id !== tagId));
    } else {
      onChange([...selected, tagId]);
    }
  };

  const tagIcons = {
    coding: '💻', sports: '⚽', music: '🎵', art: '🎨',
    gaming: '🎮', entrepreneurship: '🚀', design: '✏️',
    science: '🔬', film: '🎬', literature: '📚',
    politics: '🗳️', travel: '✈️', fitness: '💪',
    cooking: '🍳', photography: '📷',
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {tags.map((tag) => (
          <button
            key={tag.id}
            type="button"
            className={`tag-pill ${selected.includes(tag.id) ? 'selected' : ''}`}
            onClick={() => toggle(tag.id)}
          >
            <span style={{ marginRight: 4 }}>{tagIcons[tag.name] || '🏷️'}</span>
            {tag.name}
          </button>
        ))}
      </div>
      <p style={{ marginTop: 10, fontSize: '0.8rem', color: selected.length >= min ? 'var(--success)' : 'var(--text-muted)' }}>
        {selected.length} / {min} minimum selected
        {selected.length >= min ? ' ✓' : ''}
      </p>
    </div>
  );
}
