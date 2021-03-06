process.env.VUE_ENV = 'server'

const fs = require('fs')
const path = require('path')
const express = require('express')
const favicon = require('serve-favicon')
const serialize = require('serialize-javascript')
const createBundleRenderer = require('vue-server-renderer').createBundleRenderer

let renderer
function createRenderer (fs) {
  const bundlePath = path.resolve(__dirname, 'dist/server-bundle.js')
  return createBundleRenderer(fs.readFileSync(bundlePath, 'utf-8'), {
    cache: require('lru-cache')({ max: 1000 })
  })
}

const app = express()

if (process.env.NODE_ENV !== 'production') {
  const webpack = require('webpack')
  const MFS = require('memory-fs')
  const clientConfig = require('./webpack.client.config')
  const serverConfig = require('./webpack.server.config')

  clientConfig.entry = ['webpack-hot-middleware/client', clientConfig.entry]
  clientConfig.plugins.push(
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin()
  )

  const clientCompiler = webpack(clientConfig)

  app.use(require('webpack-dev-middleware')(clientCompiler, {
    publicPath: clientConfig.output.publicPath,
    stats: {
      colors: true,
      chunks: false
    }
  }))

  app.use(require('webpack-hot-middleware')(clientCompiler))

  // watch and update server renderer
  const serverCompiler = webpack(serverConfig)
  const mfs = new MFS()
  serverCompiler.outputFileSystem = mfs
  serverCompiler.watch({}, (err, stats) = {
    if (err) throw err
    stats = stats.toJson()
    stats.errors.forEach(err => console.error(err))
    stats.warnings.forEach(err => console.warn(err))
    renderer = createRenderer(mfs)
  })
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')))
  renderer = createRenderer(fs)
}

app.use(favicon(path.resolve(__dirname, 'src/assets/keisei.png')))

app.get('*', (req, res) => {
  const context = { url: req.url }
  const renderStream = renderer.renderToStream(context)
  let firstChunk = true
  
  res.write('<!DOCTYPE html><body>')

  renderStream.on('data', chunk => {
    if (firstChunk) {
      // send down initial store state
      if (context.initialState) {
        res.write(`<script>window.__INITIAL_STATE__=${
          serialize(context.initialState, { isJson : true })
        }</script>`)
      }
      firstChunk = false
    }
    res.write(chunk)
  })

  renderStream.on('end', () => {
    res.end(`<script src="/dist/client-bundle.js"></script></body>`)
  })

  renderStream.on('error', err => {
    throw err
  })
})

app.listen(3000, () => {
  console.log('ready at localhost:3000')
})