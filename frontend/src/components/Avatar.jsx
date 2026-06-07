export default function Avatar({ src, username, size = 40 }) {
  if (src) {
    return (
      <img
        src={src}
        alt={username}
        className="avatar"
        style={{ width: size, height: size }}
      />
    );
  }
  const initials = username
    ? username.slice(0, 2).toUpperCase()
    : '??';
  return (
    <div
      className="avatar-fallback"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      title={username}
    >
      {initials}
    </div>
  );
}
