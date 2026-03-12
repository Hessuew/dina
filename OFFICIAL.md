package.json

{
  "name": "tanstack-router-react-example-with-trpc-react-query",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "pnpm tsx ./src/server/server.ts --watch",
    "build": "pnpm run build:server && pnpm run build:client",
    "build:client": "vite build && tsc --noEmit",
    "build:server": "vite build --mode server",
    "start": "NODE_ENV=production node dist/server/server.js"
  },
  "dependencies": {
    "@tailwindcss/vite": "^4.1.18",
    "@tanstack/react-query": "^5.90.0",
    "@tanstack/react-query-devtools": "^5.90.0",
    "@tanstack/react-router": "^1.166.7",
    "@tanstack/react-router-devtools": "^1.166.7",
    "@tanstack/router-plugin": "^1.166.7",
    "@trpc/client": "^11.4.3",
    "@trpc/server": "^11.4.3",
    "@trpc/tanstack-react-query": "^11.4.3",
    "express": "^4.21.2",
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "redaxios": "^0.5.1",
    "tailwindcss": "^4.1.18",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.23",
    "@types/react": "^19.0.8",
    "@types/react-dom": "^19.0.3",
    "@vitejs/plugin-react": "^4.3.4",
    "tsx": "^4.20.3",
    "vite": "^7.3.1"
  }
}

index.html

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>

main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'

import './styles.css'

import { createRouter } from './router'

// Set up a Router instance
const router = createRouter()

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  )
}

router.tsx

import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink } from '@trpc/client'
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import { Spinner } from './routes/-components/spinner'
import type { AppRouter } from './server/trpc'

export const queryClient = new QueryClient()

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: createTRPCClient({
    links: [
      httpBatchLink({
        // since we are using Vite, the server is running on the same port,
        // this means in dev the url is `http://localhost:3000/trpc`
        // and since its from the same origin, we don't need to explicitly set the full URL
        url: '/trpc',
      }),
    ],
  }),
  queryClient,
})

export function createRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    context: {
      trpc,
      queryClient,
    },
    defaultPendingComponent: () => (
      <div className={`p-2 text-2xl`}>
        <Spinner />
      </div>
    ),
    Wrap: function WrapComponent({ children }) {
      return (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )
    },
  })

  return router
}

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}

server/server.ts

import path from 'node:path'
import url from 'node:url'
import * as fs from 'node:fs'
import express from 'express'
import { trpcMiddleWare } from './trpc'

const PORT =
  typeof process.env.PORT !== 'undefined'
    ? parseInt(process.env.PORT, 10)
    : 3000
const HMR_PORT =
  typeof process.env.HMR_PORT !== 'undefined'
    ? parseInt(process.env.HMR_PORT, 10)
    : 3001

const isTest = process.env.NODE_ENV === 'test' || !!process.env.VITE_TEST_BUILD

const __filename = url.fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const createServer = async (
  root = process.cwd(),
  isProd = process.env.NODE_ENV === 'production',
) => {
  const app = express()

  app.use('/trpc', trpcMiddleWare as any)

  if (!isProd) {
    const vite = await import('vite')
    const viteServer = await vite.createServer({
      root,
      logLevel: isTest ? 'error' : 'info',
      server: {
        middlewareMode: true,
        watch: {
          // During tests we edit the files too fast and sometimes chokidar
          // misses change events, so enforce polling for consistency
          usePolling: true,
          interval: 100,
        },
        hmr: {
          port: HMR_PORT,
        },
      },
      appType: 'custom',
    })

    // Use vite's connect instance as middleware
    app.use(viteServer.middlewares)

    // Handle any requests that don't match an API route by serving the React app's index.html
    app.get('*', async (req, res, next) => {
      try {
        let html = fs.readFileSync(path.resolve(root, 'index.html'), 'utf-8')

        // Transform HTML using Vite plugins.
        html = await viteServer.transformIndexHtml(req.url, html)

        res.send(html)
      } catch (e) {
        return next(e)
      }
    })

    return { app }
  } else {
    app.use(express.static(path.resolve(__dirname, '../client')))

    // Handle any requests that don't match an API route by serving the React app's index.html
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, '../client', 'index.html'))
    })
  }

  return { app }
}

if (!isTest) {
  createServer().then(({ app }) =>
    app.listen(PORT, () => {
      console.info(`Server available at: http://localhost:${PORT}`)
    }),
  )
}

server/trpc.ts

import { initTRPC } from '@trpc/server'
import { createExpressMiddleware } from '@trpc/server/adapters/express'
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express'

const createTRPContext = ({ req, res }: CreateExpressContextOptions) => ({})

type TRPCContext = Awaited<ReturnType<typeof createTRPContext>>

const t = initTRPC.context<TRPCContext>().create()

const POSTS = [
  { id: '1', title: 'First post' },
  { id: '2', title: 'Second post' },
  { id: '3', title: 'Third post' },
  { id: '4', title: 'Fourth post' },
  { id: '5', title: 'Fifth post' },
  { id: '6', title: 'Sixth post' },
  { id: '7', title: 'Seventh post' },
  { id: '8', title: 'Eighth post' },
  { id: '9', title: 'Ninth post' },
  { id: '10', title: 'Tenth post' },
]

export const appRouter = t.router({
  hello: t.procedure.query(() => 'Hello world!'),
  posts: t.procedure.query(async (_) => {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    return POSTS
  }),
  post: t.procedure.input(String).query(async (req) => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    return POSTS.find((p) => p.id === req.input)
  }),
})

export const trpcMiddleWare = createExpressMiddleware({
  router: appRouter,
  createContext: createTRPContext,
})

export type AppRouter = typeof appRouter

routes/__root.tsx

import {
  Link,
  Outlet,
  createRootRouteWithContext,
  useRouterState,
} from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import { Spinner } from './-components/spinner'
import type { TRPCOptionsProxy } from '@trpc/tanstack-react-query'
import type { AppRouter } from '../server/trpc'
import type { QueryClient } from '@tanstack/react-query'

export interface RouterAppContext {
  trpc: TRPCOptionsProxy<AppRouter>
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
})

function RootComponent() {
  const isFetching = useRouterState({ select: (s) => s.isLoading })

  return (
    <>
      <div className={`min-h-screen flex flex-col`}>
        <div className={`flex items-center border-b gap-2`}>
          <h1 className={`text-3xl p-2`}>With tRPC + TanStack Query</h1>
          {/* Show a global spinner when the router is transitioning */}
          <div
            className={`text-3xl duration-300 delay-0 opacity-0 ${
              isFetching ? ` duration-1000 opacity-40` : ''
            }`}
          >
            <Spinner />
          </div>
        </div>
        <div className={`flex-1 flex`}>
          <div className={`divide-y w-56`}>
            {(
              [
                ['/', 'Home'],
                ['/dashboard', 'Dashboard'],
              ] as const
            ).map(([to, label]) => {
              return (
                <div key={to}>
                  <Link
                    to={to}
                    activeOptions={
                      {
                        // If the route points to the root of it's parent,
                        // make sure it's only active if it's exact
                        // exact: to === '.',
                      }
                    }
                    preload="intent"
                    className={`block py-2 px-3 text-blue-700`}
                    // Make "active" links bold
                    activeProps={{ className: `font-bold` }}
                  >
                    {label}
                  </Link>
                </div>
              )
            })}
          </div>
          <div className={`flex-1 border-l border-gray-200`}>
            {/* Render our first route match */}
            <Outlet />
          </div>
        </div>
      </div>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  )
}