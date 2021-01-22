import UserService from '@/services/user'

export default [
  {path: '/', component: () => import('layouts/home'), meta: {breadcrumb: 'Home'}, children: [
    {path: '', redirect: 'audits' },
    {path: 'audits', component: () => import('pages/audits'), meta: {breadcrumb: 'Audits'}, children: [
      {path: '', name:'audits', component: () => import('pages/audits/list')},
      {path: ':auditId', component: () => import('pages/audits/edit'), meta: {breadcrumb: 'Edit Audit'}, children: [
        {path: '', redirect: 'general'},
        {path: 'general', component: () => import('pages/audits/edit/general')},
        {path: 'network', component: () => import('pages/audits/edit/network')},
        {path: 'findings/add', component: () => import('pages/audits/edit/findings/add')},
        {path: 'findings/:findingId', component: () => import('pages/audits/edit/findings/edit')},
        {path: 'sections/:sectionId', component: () => import('pages/audits/edit/sections')}
      ]}
    ]},
    {path: 'datas', component: () => import('pages/datas'), meta: {breadcrumb: 'Datas'}, children: [
      {path: '', redirect: 'collaborators'},
      {path: 'collaborators', component: () => import('pages/datas/collaborators')},
      {path: 'companies', component: () => import('pages/datas/companies')},
      {path: 'clients', component: () => import('pages/datas/clients')},
      {path: 'templates', component: () => import('pages/datas/templates')},   
      {path: 'dump', component: () => import('pages/datas/dump')},
      {path: 'custom', component: () => import('pages/datas/custom'), beforeEnter(to, from, next) {
        if (UserService.isAdmin()) 
          next()
        else
          next({path: '/audits'})
      }}
    ]},
    {path: 'vulnerabilities', component: () => import('pages/vulnerabilities'), meta: {breadcrumb: 'Vulnerabilities'}},
    {path: 'profile', component: () => import('pages/profile')},
    {path: '403', name: '403', component: () => import('pages/403')},
    {path: '404', name: '404', component: () => import('pages/404')}
  ]},
  {path: '/login', component: () => import('pages/login')},
  {path: '*', redirect: '/'}
]
