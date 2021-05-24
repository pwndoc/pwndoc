/**
 * THIS FILE IS GENERATED AUTOMATICALLY.
 * DO NOT EDIT.
 *
 * You are probably looking on adding startup/initialization code.
 * Use "quasar new boot <name>" and add it there.
 * One boot file per concern. Then reference the file(s) in quasar.conf.js > boot:
 * boot: ['file', ...] // do not add ".js" extension to it.
 *
 * Boot files are your "main.js"
 **/

import 'quasar/dist/quasar.ie.polyfills.js'



import '@quasar/extras/material-icons/material-icons.css'

import '@quasar/extras/fontawesome-v5/fontawesome-v5.css'

import '@quasar/extras/mdi-v4/mdi-v4.css'

import '@quasar/extras/roboto-font/roboto-font.css'




// We load Quasar stylesheet file
import 'quasar/dist/quasar.styl'




import 'src/css/app.styl'


import Vue from 'vue'
import createApp from './app.js'




import qboot_Bootaxios from 'boot/axios'

import qboot_Bootaffix from 'boot/affix'

import qboot_Bootauth from 'boot/auth'

import qboot_Bootlodash from 'boot/lodash'

import qboot_Bootsocketio from 'boot/socketio'












const publicPath = `/`


async function start () {
  const { app, router } = await createApp()

  

  
  let hasRedirected = false
  const redirect = url => {
    hasRedirected = true
    const normalized = Object(url) === url
      ? router.resolve(url).route.fullPath
      : url

    window.location.href = normalized
  }

  const urlPath = window.location.href.replace(window.location.origin, '')
  const bootFiles = [qboot_Bootaxios,qboot_Bootaffix,qboot_Bootauth,qboot_Bootlodash,qboot_Bootsocketio]

  for (let i = 0; hasRedirected === false && i < bootFiles.length; i++) {
    if (typeof bootFiles[i] !== 'function') {
      continue
    }

    try {
      await bootFiles[i]({
        app,
        router,
        
        Vue,
        ssrContext: null,
        redirect,
        urlPath,
        publicPath
      })
    }
    catch (err) {
      if (err && err.url) {
        window.location.href = err.url
        return
      }

      console.error('[Quasar] boot error:', err)
      return
    }
  }

  if (hasRedirected === true) {
    return
  }
  

  

    

    

    
      new Vue(app)
    

    

    

  

}

start()
