import { defineConfig } from '#q-app/wrappers'
import path from 'node:path'
import fs from 'node:fs'

export default defineConfig((ctx) => {
  return {
    // app boot (/src/boot)
    boot: [
      'axios',
      'affix',
      'auth',
      'i18n',
      'darkmode',
      'lodash',
      'socketio',
      'settings',
      'router-instance'
    ],
    css: [
      'app.scss'
    ],
    extras: [
      'material-icons',
      'material-icons-outlined',
      'material-symbols-outlined',
      'fontawesome-v6',
      'mdi-v7',
      'roboto-font'
    ],
    build: {
      scopeHoisting: true,
      vueRouterMode: 'history',
      vueCompiler: true,
      sourcemap: true,
      // showProgress: true,
      // showWarnings: true,
      // gzip: true,
      // analyze: true,
      // extractCSS: false,
      extendWebpack (cfg) {
        cfg.resolve.alias = {
          ...cfg.resolve.alias,
          '@': path.resolve(__dirname, '.', 'src')
        }
      }
    },
    devServer: {
      https: {
        key: fs.readFileSync(__dirname+'/ssl/server.key'),
        cert: fs.readFileSync(__dirname+'/ssl/server.cert')
      },
      host: "0.0.0.0",
      port: 8081,
      proxy: [
        {
          context: ["/api"],
          target: "http://localhost:5252",
          changeOrigin: true,
          secure: false
        },
        {
          context: ["/socket.io"],
          target: "http://localhost:5252",
          changeOrigin: true,
          secure: false,
          ws: true
        }
      ]
      //open: true // opens browser window automatically
    },
    // framework: 'all' --- includes everything; for dev only!
    framework: {
      autoImportComponentCase: 'combined',
      components: [
        'QAvatar',
        'QBadge',
        'QBanner',
        'QBar',
        'QBreadcrumbs',
        'QBreadcrumbsEl',
        'QBtn',
        'QBtnDropdown',
        'QBtnGroup',
        'QBtnToggle',
        'QCard',
        'QCardActions',
        'QCardSection',
        'QCheckbox',
        'QChip',
        'QDate',
        'QDialog',
        'QDrawer',
        'QEditor',
        'QExpansionItem',
        'QField',
        'QFile',
        'QFooter',
        'QHeader',
        'QIcon',
        'QImg',
        'QInput',
        'QItem',
        'QItemLabel',
        'QItemSection',
        'QKnob',
        'QLayout',
        'QLinearProgress',
        'QList',
        'QMenu',
        'QOptionGroup',
        'QPage',
        'QPageContainer',
        'QPagination',
        'QPageSticky',
        'QPopupEdit',
        'QPopupProxy',
        'QRadio',
        'QRouteTab',
        'QScrollArea',
        'QSelect',
        'QSeparator',
        'QSpace',
        'QSpinner',
        'QSpinnerHourglass',
        'QSpinnerGears',
        'QSplitter',
        'QTab',
        'QTable',
        'QTabPanel',
        'QTabPanels',
        'QTabs',
        'QTd',
        'QTh',
        'QToggle',
        'QToolbar',
        'QToolbarTitle',
        'QTooltip',
        'QTr',
        'QTree',
        'QUploader'
      ],
      directives: [
        'ClosePopup',
        'Ripple'
      ],
      // Quasar plugins
      plugins: [
        'Cookies',
        'Dialog',
        'Loading',
        'LocalStorage',
        'Notify'
      ]
      // iconSet: ctx.theme.mat ? 'material-icons' : 'ionicons'
      // lang: 'de' // Quasar language
    },
    // animations: 'all' --- includes all animations
    animations: [
    ],
    pwa: {
      // workboxPluginMode: 'InjectManifest',
      // workboxOptions: {},
      manifest: {
        // name: 'Quasar App',
        // short_name: 'Quasar-PWA',
        // description: 'Best PWA App in town!',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#027be3',
        icons: [
          {
            'src': 'favicon-pwndoc.png',
            'sizes': '128x128',
            'type': 'image/png'
          },
          {
            'src': 'favicon-pwndoc.png',
            'sizes': '192x192',
            'type': 'image/png'
          },
          {
            'src': 'favicon-pwndoc.png',
            'sizes': '256x256',
            'type': 'image/png'
          },
          {
            'src': 'favicon-pwndoc.png',
            'sizes': '384x384',
            'type': 'image/png'
          },
          {
            'src': 'favicon-pwndoc.png',
            'sizes': '512x512',
            'type': 'image/png'
          }
        ]
      }
    },
    cordova: {
      // id: 'org.cordova.quasar.app'
    },
    electron: {
      // bundler: 'builder', // or 'packager'
      extendWebpack (cfg) {
        // do something with Electron process Webpack cfg
      },
      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options

        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',

        // Window only
        // win32metadata: { ... }
      },
      builder: {
        // https://www.electron.build/configuration/configuration

        // appId: 'quasar-app'
      }
    }
  }
})
