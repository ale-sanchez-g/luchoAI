import { redact } from './redact';

const inActions = (): boolean => process.env.GITHUB_ACTIONS === 'true';

function escapeAnnotation(message: string): string {
  return message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function write(stream: NodeJS.WriteStream, line: string): void {
  stream.write(`${redact(line)}\n`);
}

/** Console logger that emits GitHub Actions annotations when running inside Actions. */
export const log = {
  info(message: string): void {
    write(process.stdout, `[sentinel] ${message}`);
  },
  warn(message: string): void {
    write(
      process.stderr,
      inActions() ? `::warning::${escapeAnnotation(message)}` : `[sentinel] WARN ${message}`,
    );
  },
  error(message: string): void {
    write(
      process.stderr,
      inActions() ? `::error::${escapeAnnotation(message)}` : `[sentinel] ERROR ${message}`,
    );
  },
  group(title: string): void {
    write(process.stdout, inActions() ? `::group::${title}` : `[sentinel] == ${title}`);
  },
  endGroup(): void {
    if (inActions()) {
      write(process.stdout, '::endgroup::');
    }
  },
};
