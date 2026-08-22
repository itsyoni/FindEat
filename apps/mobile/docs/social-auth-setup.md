# FindEat social authentication setup

The app uses native Google and Apple sign-in. Provider identity tokens are sent
to the FindEat backend, verified there, and exchanged for normal FindEat access
and refresh tokens.

## Google

Create OAuth clients in the same Google Cloud/Firebase project:

- a Web application client (used as the ID-token audience);
- an Android client for every FindEat package variant and signing certificate;
- an iOS client for every FindEat bundle identifier.

Android packages:

- `com.itsyoni.findeat.dev`
- `com.itsyoni.findeat.preview`
- `com.itsyoni.findeat`

iOS uses the same three identifiers. Register both the upload certificate SHA-1
and Google Play App Signing SHA-1 for production Android. Download a matching
`google-services.json` after the Android OAuth clients exist.

Configure each EAS environment with:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `GOOGLE_IOS_URL_SCHEME` only if the URL scheme cannot be derived from the iOS client ID
- `GOOGLE_SERVICES_JSON` pointing to the matching file for that build variant

Configure Railway/backend with:

- `GOOGLE_AUTH_CLIENT_IDS` containing the Web client ID. Multiple accepted IDs
  can be comma-separated during an environment migration.

## Apple

Enable Sign in with Apple for every FindEat App ID in Apple Developer. EAS reads
`ios.usesAppleSignIn` and the Expo config plugin from the project configuration.

The backend accepts the three FindEat native bundle identifiers by default.
Override them, if needed, with comma-separated `APPLE_AUTH_AUDIENCES` values.

## Deploy

1. Deploy the backend migration and backend release.
2. Configure provider credentials in development, preview, and production.
3. Rebuild the native development apps; Expo Go and older development builds do
   not contain the new native sign-in modules.
4. Test first-time signup, returning login, email hiding with Apple, and linking
   a provider to an existing FindEat account with the same verified email.
