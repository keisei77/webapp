import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

import News from '../views/News.vue'
import About from '../views/About.vue'

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      component: News
    },
    {
      path: '/about',
      component: About
    }
  ]
})