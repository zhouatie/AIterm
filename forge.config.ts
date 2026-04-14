import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    appBundleId: 'com.zhoushitie.aiterm',
    icon: path.resolve(__dirname, 'assets/icon'),
    asar: {
      unpack: '**/node_modules/node-pty/**',
    },
    osxSign: {
      identity: '-',
      identityValidation: false,
      optionsForFile: () => ({
        hardenedRuntime: false,
        timestamp: 'none',
      }),
    },
    // macOS TCC (Privacy) — terminal emulators need broad filesystem access so
    // that shell child processes (git, lazygit, etc.) can read any user directory.
    // These strings trigger the system permission dialog when the app first
    // accesses each protected location.  Users can also grant Full Disk Access
    // manually in System Settings → Privacy & Security → Full Disk Access.
    extendInfo: {
      NSDesktopFolderUsageDescription:
        'Terminal sessions need access to your Desktop folder.',
      NSDocumentsFolderUsageDescription:
        'Terminal sessions need access to your Documents folder.',
      NSDownloadsFolderUsageDescription:
        'Terminal sessions need access to your Downloads folder.',
      NSRemovableVolumesUsageDescription:
        'Terminal sessions need access to removable volumes.',
    },
    // Override the VitePlugin's default ignore function.
    // The VitePlugin checks for this — if `ignore` is already set, it skips
    // its own (which excludes everything outside .vite/).
    // We extend it to also include node-pty so that electron-packager copies
    // it into the staging directory, where @electron/rebuild will rebuild it
    // for the correct Electron ABI.
    ignore: (file: string) => {
      if (!file) return false;
      // Include Vite build output
      if (file.startsWith('/.vite')) return false;
      // Include node-pty native module (and let its subtree through)
      if (file === '/node_modules') return false;
      if (file.startsWith('/node_modules/node-pty')) return false;
      // Include rrweb dist files — the live-view HTTP server reads
      // rrweb.min.js and rrweb.css from node_modules at runtime via fs.readFile()
      if (file.startsWith('/node_modules/rrweb')) return false;
      // Exclude everything else (src/, tsconfig, other node_modules, etc.)
      return true;
    },
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
