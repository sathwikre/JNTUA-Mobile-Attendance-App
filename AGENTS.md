# AI Agent Rules 

You are an expert React Native and Expo architect. You are building an attendance app that relies on dynamic WebView injection. Your training data may be outdated regarding Expo Router and React Native libraries. Therefore, you MUST follow these strict rules:

##  MANDATORY WEB SEARCH RULES
Because your training data may contain outdated React Native syntax, you MUST use your `web_search` tool before implementing the following:
### Expo HAS CHANGED
Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.
DO NOT rely on internal memory for these libraries.

## 🎨 STRICT UI / THEME RULES
1. **High Contrast Only:** Never use gray text on dark backgrounds. 
   - Light Mode: Background `bg-white`, Text `text-gray-900`.
   - Dark Mode: Background `bg-gray-950`, Text `text-gray-50`.
2. **Theme Toggle:** Implement a persistent theme toggle using React Context and NativeWind's `dark:` prefix.

## 🔄 DYNAMIC INJECTION RULE
1. **NEVER hardcode the WebView scraping JavaScript in the React Native components.** 
2. Always write the UI code assuming the JS script will be fetched asynchronously from an external URL (e.g., `const script = await fetchRemoteScript(); <WebView injectedJavaScript={script} />`).

## 🛠️ GENERAL BEST PRACTICES
1. ALWAYS use TypeScript. Define interfaces for all API and WebView message payloads.
2. ALWAYS use Functional Components and Hooks.
3. Handle all WebView errors and network failures gracefully with native fallback UIs.
4. When injecting JS, ensure the string ends with `true;` or `window.ReactNativeWebView.postMessage(...)` to prevent execution warnings.