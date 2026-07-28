# FindEat versioning

FindEat keeps separate semantic versions for the mobile app and business web
app.

## Mobile

- Source of truth: `apps/mobile/app.json` (`expo.version`)
- Synchronized copies: `apps/mobile/package.json` and the root lockfile
- Current release: `1.6.1`
- Do not bump the mobile version for visual-only adjustments.
- Use a patch for fixes and small functional changes, a minor version for a
  meaningful feature release, and a major version only for a breaking release.
- Production EAS builds validate the version before building. EAS manages and
  auto-increments the native store build numbers separately.

Commands:

```sh
npm run version:patch
npm run version:minor
npm run version:major
npm run version:set -- 1.7.0
```

## Web

- Source of truth: `apps/web/package.json`
- Synchronized copies: the root lockfile and `apps/web/package-lock.json`
- Current release: `1.0.0`
- The version is injected into the production bundle and displayed in the
  dashboard sidebar and Settings.
- The web production build validates version synchronization automatically.

Commands:

```sh
npm run version:web:patch
npm run version:web:minor
npm run version:web:major
npm run version:web:set -- 1.1.0
```

Run `npm run version:check` to validate both applications.
