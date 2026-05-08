import type { ReactNode } from "react";

export function Card({
  title,
  sub,
  right,
  tight,
  children,
  className,
}: {
  title?: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  tight?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const cls = `card${tight ? " card-tight" : ""}${className ? " " + className : ""}`;
  return (
    <section className={cls}>
      {(title || right) && (
        <div className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {sub && <p className="card-sub">{sub}</p>}
          </div>
          {right}
        </div>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}
