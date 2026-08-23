import { useRef, useState, type ReactNode } from "react";

export function Carousel({ children, gridClass }: { children: ReactNode[]; gridClass: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [ativo, setAtivo] = useState(0);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const largura = el.clientWidth * 0.86;
    setAtivo(Math.min(children.length - 1, Math.max(0, Math.round(el.scrollLeft / largura))));
  };

  return (
    <div>
      <div
        ref={ref}
        onScroll={onScroll}
        className={`flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:grid md:overflow-visible ${gridClass}`}
      >
        {children.map((c, i) => (
          <div key={i} className="w-[86%] shrink-0 snap-start md:w-auto">
            {c}
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex justify-center gap-1.5 md:hidden">
        {children.map((_, i) => (
          <button
            key={i}
            aria-label={`Ir para o cartão ${i + 1}`}
            onClick={() => {
              const el = ref.current;
              if (el) el.scrollTo({ left: i * el.clientWidth * 0.86, behavior: "smooth" });
            }}
            className={`h-1.5 rounded-full transition-all ${i === ativo ? "w-5 bg-primary" : "w-1.5 bg-surface-3"
              }`}
          />
        ))}
      </div>
    </div>
  );
}
