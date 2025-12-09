# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

   Note: This project uses yarn as the package manager. Remove any generated `package-lock.json` files and prefer `yarn install` to avoid mixed lockfile issues which can break CI (Vercel uses yarn by default).

   If deploying to Vercel, the project uses `expo export:web` with the webpack bundler. A webpack alias maps `app/` to the app folder so `expo-router` resolves routes during the export.
2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Deploying to Vercel

This project can be deployed as a static web site on Vercel using Expo's web export.

1. Make sure dependencies are installed at the `app/frontend` folder:

   ```bash
   npm install
   ```

2. Locally build the static site (outputs to `web-build`):

   ```bash
   npm run build
   ```

3. On Vercel, set the root to the `app/frontend` directory (or deploy the repository and choose the `app/frontend` project). Use the following build settings in the Vercel UI:

   - Build Command: npm run build
   - Output Directory: web-build

4. If you use environment variables (API keys, feature flags), add them in the Vercel Project Settings.

Notes: Expo web export creates a plain static site. Some Expo/React Native web features may not be fully supported on static hosting — test the exported site locally before deploying.
