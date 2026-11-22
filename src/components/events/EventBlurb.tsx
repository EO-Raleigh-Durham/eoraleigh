import { parseBlurb, type BlurbSpan } from "@/lib/event-blurb";

function Spans({ spans }: { spans: BlurbSpan[] }) {
  return (
    <>
      {spans.map((s, i) => (s.bold ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>))}
    </>
  );
}

// Renders events.blurb with the opt-in markers from src/lib/event-blurb.ts.
export default function EventBlurb({ blurb }: { blurb: string }) {
  return (
    <div className="evd-body">
      {parseBlurb(blurb).map((block, i) => {
        if (block.kind === "heading") {
          return (
            <h3 key={i} className="evb-heading">
              <Spans spans={block.spans} />
            </h3>
          );
        }
        if (block.kind === "highlight") {
          return (
            <p key={i} className="evb-highlight">
              <Spans spans={block.spans} />
            </p>
          );
        }
        return (
          <p key={i} className="evb-text">
            <Spans spans={block.spans} />
          </p>
        );
      })}
    </div>
  );
}
