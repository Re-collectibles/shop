# Seeing what people search for

The shop uses Google Analytics property `G-82MNWE7W34`. Both the Full Catalogue and New Listings search boxes record searches when a visitor has chosen **Allow**. The website and catalogue continue to be hosted on GitHub.

## Publish and check the connection

1. Merge the search analytics pull request on GitHub and wait for the GitHub Pages deployment to finish.
2. Open the [shop](https://re-collectibles.github.io/shop/), choose **Allow** beside the search box, and search for a book. Pause for at least 1.2 seconds, or press Enter.
3. Sign in to [Google Analytics](https://analytics.google.com/) with the account that owns this property. Open **Reports → Realtime** and look for an event named **search**. Open that event to inspect its parameters.
4. Check a search with no matching books and try the New Listings page too. The event parameters should distinguish the two catalogues and include zero results.

Initial data collection can take up to 30 minutes to appear. Detailed reports and new custom definitions can take 24–48 hours. A browser that declines analytics or blocks Google Analytics will not contribute searches. Local development and copies on other domains also do not contribute.

## Add two report fields once

In **Admin → Data display → Custom definitions → Create custom dimension**, create these two fields. Both use **Event** scope. Type the event parameter exactly as shown if it is not yet offered in the dropdown.

| Dimension name | Event parameter | What it tells you |
| --- | --- | --- |
| Search availability | `search_has_results` | `yes` means at least one match; `no` means no matches |
| Catalogue section | `search_section` | `full_catalogue` or `new_listings` |

Use Google's built-in **Search term** dimension for the words people typed. A separate custom dimension for `search_term` is not needed.

## Save a report of popular searches

1. Open **Explore → Blank** and name it **Book searches**.
2. Under **Variables**, add the dimensions **Search term**, **Event name**, **Search availability** and **Catalogue section**. Add the metric **Event count**.
3. Under **Tab settings**, put **Search term** in **Rows**, **Search availability** in **Columns**, and **Event count** in **Values**.
4. Add a filter: **Event name exactly matches `search`**.
5. Set the date range, for example the last 30 days. Sort by event count to see the most common terms.

This report shows how often a search returned matches or no matches. It counts recorded searches, not unique customers or purchases.

## Find books people want but cannot find

Create a second exploration tab named **No matches in full catalogue**. Use **Search term** as Rows and **Event count** as Values. Filter to all three of:

- **Event name** exactly matches `search`.
- **Search availability** exactly matches `no`.
- **Catalogue section** exactly matches `full_catalogue`.

Sort by Event count, highest first. These are useful leads for books, authors or subjects to list. No matches can also mean a spelling difference. A search with no matches in New Listings may still have matches in the Full Catalogue, which is why this tab filters to the full catalogue.

## How recording works

- The search itself still filters immediately. Recording waits for 1.2 seconds without another input event, or an Enter keypress.
- The `search` event includes `search_term`, `result_count`, `search_has_results` and `search_section`. `result_count` is the exact number of matching catalogue rows, not stock quantity.
- Clearing the search cancels pending recording. Enter after a recorded search does not count it again. Clearing and searching again counts as another search.
- Empty searches, single characters, searches over 100 characters, and obvious email/web addresses are excluded. Numeric and ISBN searches remain eligible. This is a basic filter, not a guarantee that all personal information can be detected.
- The Google tag only loads after permission. Advertising consent and advertising signals are disabled. Automatic initial page views are disabled; URLs supplied to Analytics exclude query strings and fragments.
- Visitors can change their choice through **Privacy & search settings** in the footer. Turning analytics off cancels pending events and removes the cookies created by this integration. The preference is stored locally in the browser.
- Google may still collect its standard technical/session information, and enhanced measurement settings in the Analytics account may add automatic events. Search reports filter to the explicitly sent `search` event.
- Reports are private to authorised Analytics users. Search data is not written to the public GitHub repository. Older searches cannot be recovered, and analytics blockers, declined permission and very quick page exits mean this is a sample of demand.

## Maintenance and local checks

The measurement ID is in `analytics.js`. Include that shared script before either catalogue's search code. Do not add a second copy of the Google tag from the setup wizard: this integration loads it after the visitor chooses Allow.

Run the automated behaviour checks with Node.js:

```sh
node --test tests/analytics.test.cjs
```

Google's references: [search events](https://developers.google.com/analytics/devguides/collection/ga4/reference/events#search), [Search term dimension](https://support.google.com/analytics/table/13948007?hl=en), [custom dimensions](https://support.google.com/analytics/answer/14239696?hl=en), [report processing times](https://support.google.com/analytics/answer/14240153?hl=en), and [basic consent mode](https://developers.google.com/tag-platform/security/guides/consent?consentmode=basic).
