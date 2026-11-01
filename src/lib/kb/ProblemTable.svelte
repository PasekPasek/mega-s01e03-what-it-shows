<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import type { Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { groupByProblem, PROBLEM_TITLE, type Problem } from '#lib/kb/problems';

  // issues: problem → link to the ticket filed for it.
  let { ticket, issues = {} }: { ticket: number; issues?: Partial<Record<Problem, { n: number; href: string }>> } = $props();

  const view = $derived(groupByProblem(reports as Report[], ticket, tenantOf, notes.oneDayMove));
  const tags = (t: Record<string, number>) =>
    Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ×${n}`).join(' · ');
</script>

<p class="sum">
  <strong>{view.merged.length}</strong> reports merged into #{ticket}
  ({view.rows - view.merged.length} repeated rows in the export dropped) ·
  <strong>{view.groups.length}</strong> problems
</p>

<table>
  <thead><tr><th>problem</th><th>reports</th><th>tenants</th><th>seen</th><th>intake tagged</th><th>ticket</th></tr></thead>
  <tbody>
    {#each view.groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code> {PROBLEM_TITLE[g.problem]}</td>
        <td><strong>{g.reports.length}</strong>{#each Object.entries(g.alsoIn) as [q, n] (q)}<br /><span class="tags">{n} also in <code>{q}</code></span>{/each}</td>
        <td>{g.tenants}</td>
        <td>{g.firstSeen} → {g.lastSeen}</td>
        <td class="tags">{tags(g.taggedAs)}</td>
        <td>{#if issues[g.problem]}<a href={issues[g.problem]?.href}>#{issues[g.problem]?.n}</a>{:else}none yet{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

{#each view.groups as g (g.problem)}
  {#each Object.entries(g.alsoIn) as [q, n] (q)}
    {#if g.problem === 'shift'}
      <p class="tags">The {n} <code>shift</code> reports are the ones the desk read as a one-day move. They stay counted under <code>{q}</code>, where the desk filed them by tenant, and have their own ticket as well.</p>
    {/if}
  {/each}
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .tags { color: var(--muted); font-size: 0.85em; }
</style>
