export function Avatar({ code, title }: { code: string; title?: string }) {
  return <span className="avatar" title={title ?? code}>{code}</span>;
}

export function AvatarStack({ codes }: { codes: string[] }) {
  return (
    <span className="avatar-stack">
      {codes.map((c) => <Avatar key={c} code={c} />)}
    </span>
  );
}
