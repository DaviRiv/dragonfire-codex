import { buildNumberLabel, readPublicBuildInfo } from "@/lib/build-info";

export function BuildNumber({ className }: { className?: string }) {
  const info = readPublicBuildInfo();
  const label = buildNumberLabel(info);
  return (
    <span
      className={className}
      title={`${label} · ${info.sha}`}
      data-build-number={info.number}
      data-build-sha={info.sha}
    >
      <span className="sr-only">{label} · revision </span>
      <span aria-hidden="true" className="whitespace-nowrap">
        {label}
        <span className="normal-case tracking-normal"> · {info.sha}</span>
      </span>
    </span>
  );
}
