import 'dotenv/config'
import { PROPERTY_MANAGEMENT_DOCUMENTS } from '../../../packages/shared/src/property_management.js'

const token = process.env.APIFY_TOKEN
if (!token) throw new Error('APIFY_TOKEN is required; no crawl was started and no provenance was claimed')

const urls = [...new Set(PROPERTY_MANAGEMENT_DOCUMENTS.flatMap((document) => document.sourceUrls ?? []))]
const actor = 'apify~website-content-crawler'
const runResponse = await fetch(`https://api.apify.com/v2/acts/${actor}/runs?token=${encodeURIComponent(token)}&waitForFinish=120`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    startUrls: urls.map((url) => ({ url })),
    maxCrawlPages: urls.length,
    crawlerType: 'playwright:adaptive',
    removeCookieWarnings: true,
    saveMarkdown: true,
    saveHtml: false,
  }),
})

if (!runResponse.ok) throw new Error(`Apify run request failed (${runResponse.status}): ${await runResponse.text()}`)

const runBody = await runResponse.json() as {
  data?: { id?: string; status?: string; defaultDatasetId?: string }
}
const run = runBody.data
if (!run?.id || !run.defaultDatasetId) throw new Error('Apify returned no run or dataset identifier')
if (run.status !== 'SUCCEEDED') throw new Error(`Apify run ${run.id} finished with status ${run.status ?? 'unknown'}`)

const datasetResponse = await fetch(
  `https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${encodeURIComponent(token)}&clean=true&format=json`
)
if (!datasetResponse.ok) throw new Error(`Apify dataset fetch failed (${datasetResponse.status})`)
const items = await datasetResponse.json() as Array<{ url?: string; markdown?: string; text?: string }>
const covered = new Set(items.map((item) => item.url).filter((url): url is string => Boolean(url)))

console.log(JSON.stringify({
  status: 'verified',
  actor,
  runId: run.id,
  datasetId: run.defaultDatasetId,
  requestedUrls: urls.length,
  returnedItems: items.length,
  urlsWithContent: items.filter((item) => Boolean(item.markdown?.trim() || item.text?.trim())).length,
  missingUrls: urls.filter((url) => !covered.has(url)),
  next: `Set APIFY_RUN_ID=${run.id} before seeding to attach verified crawl provenance.`,
}, null, 2))
