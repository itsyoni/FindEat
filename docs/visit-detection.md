# Visit Detection

Visit Detection is an optional, privacy-first restaurant reminder feature. It uses operating-system region monitoring around a limited set of nearby FindEat restaurants. It does not continuously upload GPS samples or build a route history.

## Architecture

- Nearby candidates come from FindEat's restaurant database.
- The backend excludes muted restaurants and ambiguous pairs whose geofences would overlap too closely.
- The device registers at most 18 nearby restaurant regions and refreshes them only after significant movement or a six-hour cache expiry.
- Entry/exit events, approximate times, duration, candidate state, and reminder state stay in local device storage.
- Local candidate records are pruned after 30 days; stale in-progress visits are discarded after 12 hours.
- Only muted restaurant IDs are persisted to the account for cross-device preference sync.
- A visit must last at least 45 minutes. The reminder is scheduled ten minutes after exit.
- A user can request one additional reminder, currently four hours later.
- A seven-day restaurant cooldown prevents repeated reminders.

## Platform behavior

- iOS background geofencing requires `UIBackgroundModes: location` and Always location access. iOS limits the number of monitored regions, so FindEat stays below the platform limit with 18 candidates.
- Android uses background geofencing when "Allow all the time" is granted. Android 11 and newer may route the user to system settings for that choice.
- If background access is unavailable but foreground access exists, FindEat falls back to low-frequency proximity checks only while the app is active.
- Android does not guarantee geofence delivery after the user force-stops the app. Device battery restrictions and OEM behavior can also delay events.
- Background location and task execution require a development or production build; Expo Go is not sufficient for end-to-end testing.

## Store and release setup

1. Rebuild both iOS and Android after changing native location permissions or `expo-task-manager`.
2. In App Store Connect, explain that background location is optional and powers post-visit restaurant reminders. Match the wording in the in-app disclosure and privacy policy.
3. In Google Play Console, complete the Background Location declaration, provide the in-app disclosure flow, and explain the core user benefit. Upload a short demonstration video if Google requests one.
4. Confirm the production build contains `ACCESS_BACKGROUND_LOCATION`, foreground location-service permissions, iOS location background mode, and the Always/When-in-use usage descriptions.
5. Deploy the backend and apply the muted-place migration before enabling the client feature in production.

## Manual QA

- Test foreground-only and full background modes on physical iOS and Android devices.
- Verify permission denial/revocation disables monitoring without deleting muted places.
- Verify a short visit creates no reminder and a qualifying visit reminds only after exit.
- Verify Remind later creates exactly one additional reminder.
- Verify notification taps work after a cold launch and stale/deleted restaurants show the safe empty state.
- Verify Content and Review creation both open with the detected restaurant preselected and editable.
- Verify dense/overlapping restaurant pairs do not produce a confident false reminder.
