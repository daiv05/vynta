import { defineConfig } from 'vitepress'

export default defineConfig({
  srcDir: "pages",

  title: "Vynta Docs",
  description: "Documentation for Vynta — Real-time screen annotation and highlighting for Windows",
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/vynta.svg" }],
    ["link", { rel: "icon", type: "image/png", href: "/vynta.png" }],
  ],
  themeConfig: {
    logo: "/vynta.png",
    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Features', link: '/features/live-draw' },
      { text: 'Architecture', link: '/architecture/overview' },
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
        ]
      },
      {
        text: 'Features',
        items: [
          { text: 'Live Draw', link: '/features/live-draw' },
          { text: 'Cursor Highlight', link: '/features/cursor-highlight' },
          { text: 'Spotlight', link: '/features/spotlight' },
          { text: 'Dynamic Zoom', link: '/features/zoom' },
          { text: 'Whiteboard', link: '/features/whiteboard' },
        ]
      },
      {
        text: 'Architecture',
        items: [
          { text: 'Overview', link: '/architecture/overview' },
          { text: 'Frontend', link: '/architecture/frontend' },
          { text: 'Backend', link: '/architecture/backend' },
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'Keyboard Shortcuts', link: '/reference/shortcuts' },
          { text: 'Settings', link: '/reference/settings' },
          { text: 'Roadmap', link: '/reference/roadmap' },
          { text: 'Contributing', link: '/reference/contributing' },
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/daiv05/vynta' }
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 - Present, David Deras'
    },

    search: {
      provider: 'local'
    }
  }
})
