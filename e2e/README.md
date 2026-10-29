# Administrator UI tests

Five STC suites / 10 selected scenarios. `support/pages.ts` holds page objects; `support/fixtures.ts` owns signed-in console setup and disposable role cleanup. Data/auth/mutations run through actual UI, with one worker and no retries.

Copy `.env.ui.example` to `.env.ui.local`, fill the real accounts and prepared disposable fixture IDs/names, finish `npm install`, then run `npm run test:ui:headed`. The exact pinned 1.64.1 dependency lock/install still needs a network-enabled machine; temporary cached 1.64.0 was used only for static checks here.

See `../../Petty_Bounty_Brain/wiki/final_progress/automated_ui.md` for fixture preparation and `automated_ui_record.md` there for actual results. All 10 cases remain NOT RUN; test discovery and builds are not UI evidence. Results go to ignored `test-results/` and `playwright-report/`, separate from the Manual record.
