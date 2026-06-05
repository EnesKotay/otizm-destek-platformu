// vitest.config.ts
import { defineConfig } from "file:///Users/eneskotay/Desktop/autism-master/frontend/node_modules/vitest/dist/config.js";
import react from "file:///Users/eneskotay/Desktop/autism-master/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
var __vite_injected_original_dirname = "/Users/eneskotay/Desktop/autism-master/frontend";
var vitest_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__vite_injected_original_dirname, "./src") }
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/test/**/*.test.ts", "src/test/**/*.test.tsx"],
    pool: "threads",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/services/**", "src/utils/**"]
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9lbmVza290YXkvRGVza3RvcC9hdXRpc20tbWFzdGVyL2Zyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvZW5lc2tvdGF5L0Rlc2t0b3AvYXV0aXNtLW1hc3Rlci9mcm9udGVuZC92aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9lbmVza290YXkvRGVza3RvcC9hdXRpc20tbWFzdGVyL2Zyb250ZW5kL3ZpdGVzdC5jb25maWcudHNcIjsvLy8gPHJlZmVyZW5jZSB0eXBlcz1cInZpdGVzdFwiIC8+XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW3JlYWN0KCldLFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHsgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSB9LFxuICB9LFxuICB0ZXN0OiB7XG4gICAgZ2xvYmFsczogdHJ1ZSxcbiAgICBlbnZpcm9ubWVudDogJ2pzZG9tJyxcbiAgICBzZXR1cEZpbGVzOiBbJy4vc3JjL3Rlc3Qvc2V0dXAudHMnXSxcbiAgICBpbmNsdWRlOiBbJ3NyYy90ZXN0LyoqLyoudGVzdC50cycsICdzcmMvdGVzdC8qKi8qLnRlc3QudHN4J10sXG4gICAgcG9vbDogJ3RocmVhZHMnLFxuICAgIGNvdmVyYWdlOiB7XG4gICAgICBwcm92aWRlcjogJ3Y4JyxcbiAgICAgIHJlcG9ydGVyOiBbJ3RleHQnLCAnaHRtbCddLFxuICAgICAgaW5jbHVkZTogWydzcmMvc2VydmljZXMvKionLCAnc3JjL3V0aWxzLyoqJ10sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFIakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyx3QkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFNBQVM7QUFBQSxJQUNQLE9BQU8sRUFBRSxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPLEVBQUU7QUFBQSxFQUNqRDtBQUFBLEVBQ0EsTUFBTTtBQUFBLElBQ0osU0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsWUFBWSxDQUFDLHFCQUFxQjtBQUFBLElBQ2xDLFNBQVMsQ0FBQyx5QkFBeUIsd0JBQXdCO0FBQUEsSUFDM0QsTUFBTTtBQUFBLElBQ04sVUFBVTtBQUFBLE1BQ1IsVUFBVTtBQUFBLE1BQ1YsVUFBVSxDQUFDLFFBQVEsTUFBTTtBQUFBLE1BQ3pCLFNBQVMsQ0FBQyxtQkFBbUIsY0FBYztBQUFBLElBQzdDO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
