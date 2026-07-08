/**
 * Reads review context straight from each character folder so the workbench
 * shows folder truth (brief.md status, open items) and the latest QC report
 * without a build step. Files are fetched from the dev server; missing files
 * degrade to "unknown" instead of failing the page.
 */
export interface CharacterBriefInfo {
  readonly status: string;
  readonly openItems: readonly string[];
}

export interface CharacterQcInfo {
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export interface QcReport {
  readonly generatedAt?: string;
  readonly characters: Readonly<Record<string, CharacterQcInfo>>;
}

const parseFrontmatter = (markdown: string): CharacterBriefInfo => {
  const match = markdown.match(/^---\n([\s\S]*?)\n---/);

  if (!match) {
    return { status: 'unknown', openItems: [] };
  }

  const frontmatter = match[1];
  const statusMatch = frontmatter.match(/^status:\s*(.+)$/m);
  const openItems: string[] = [];
  const openItemsMatch = frontmatter.match(/^openItems:\n((?:\s+-\s+.*\n?)*)/m);

  if (openItemsMatch) {
    for (const line of openItemsMatch[1].split('\n')) {
      const item = line.match(/^\s+-\s+(.*)$/);

      if (item?.[1]) {
        openItems.push(item[1].trim());
      }
    }
  }

  return {
    status: statusMatch?.[1]?.trim() ?? 'unknown',
    openItems
  };
};

export const fetchCharacterBrief = async (characterId: string): Promise<CharacterBriefInfo> => {
  try {
    const response = await fetch(`/assets/characters/${characterId}/brief.md`);

    if (!response.ok) {
      return { status: 'unknown', openItems: [] };
    }

    return parseFrontmatter(await response.text());
  } catch {
    return { status: 'unknown', openItems: [] };
  }
};

export const fetchQcReport = async (): Promise<QcReport | undefined> => {
  try {
    const response = await fetch('/assets/characters/qc-report.json');

    if (!response.ok) {
      return undefined;
    }

    return (await response.json()) as QcReport;
  } catch {
    return undefined;
  }
};
