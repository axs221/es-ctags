'use strict'

const fs = require('fs')
const path = require('path')

const tern = require('tern')
const condense = require('tern/lib/condense')

var TERN_ROOT = path.resolve(__dirname, '../node_modules/tern')
const importPlugins = function(plugins) {
  for (var i = 0; i < plugins.length; i++) {
    const mod = require(TERN_ROOT + '/plugin/' + plugins[i] + '.js')
    if (mod && mod.hasOwnProperty('initialize')) {
      mod.initialize(TERN_ROOT)
    }
  }
}

importPlugins(['es_modules'])

module.exports = function condense_(filepaths, callback) {
  if (typeof filepaths === 'string') {
    filepaths = [filepaths]
  }

  const es5server = new tern.Server({})
  const es6server = new tern.Server({
    plugins: {
      es_modules: {},
    },
  })

  filepaths.forEach(filepath => {
    const p = path.resolve(filepath)
    const pname = path.basename(p)
    es5server.addFile(pname, fs.readFileSync(p, 'utf8'))
  })

  es5server.flush(function(err) {
    if (err) {
      callback(err)
    }

    let es5results = filepaths.map(filepath =>
      condense.condense(path.basename(filepath), null, {
        sortOutput: true,
        spans: true,
      }),
    )

    filepaths.forEach(filepath => {
      const p = path.resolve(filepath)
      const pname = path.basename(p)
      es6server.addFile(pname, fs.readFileSync(p, 'utf8'))
    })

    es6server.flush(function(err) {
      if (err) {
        callback(err)
      }

      let es6results = filepaths.map(filepath =>
        condense.condense(path.basename(filepath), null, {
          sortOutput: true,
          spans: true,
        }),
      )

      es5results = es5results[0]
      es6results = es6results[0]
      const combinedResults = Object.assign({}, es5results, es6results)

      callback(null, combinedResults, null, 2)
    })
  })
}
