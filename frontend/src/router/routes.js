import UserService from '@/services/user'

export default [
  {
    path: '/', component: () => import('layouts/home'), meta: {breadcrumb: 'Home'}, children:
    [
      { path: '', redirect: { name: 'audits' } },
      {
        path: 'audits', component: () => import('pages/audits'), meta: {breadcrumb: 'Audits'}, children:
        [
          { path: '', name: 'audits', component: () => import('pages/audits/list')},
          {
            path: ':auditId', component: () => import('pages/audits/edit'), meta: {breadcrumb: 'Edit Audit'}, children:
            [
              { path: '', redirect: { name: 'general'} },
              { path: 'general', name: 'general', component: () => import('pages/audits/edit/general') },
              { path: 'network', name: 'network', component: () => import('pages/audits/edit/network') },
              { path: 'findings/add', name: 'addFindings', component: () => import('pages/audits/edit/findings/add') },
              { path: 'findings/:findingId', name: 'editFinding', component: () => import('pages/audits/edit/findings/edit') },
              { path: 'sections/:sectionId', name: 'editSection', component: () => import('pages/audits/edit/sections') }
            ]
          }
        ]
      },
      {
        path: 'data', component: () => import('pages/data'), meta: {breadcrumb: 'Datas'}, children:
        [
          { path: '', name: 'data', redirect: { name: 'collaborators' } },
          { path: 'collaborators', name: 'collaborators', component: () => import('pages/data/collaborators') },
          { path: 'companies', name: 'companies', component: () => import('pages/data/companies') },
          { path: 'clients', name: 'clients', component: () => import('pages/data/clients') },
          { path: 'templates', name: 'templates', component: () => import('pages/data/templates') },   
          { path: 'dump', name: 'dump', component: () => import('pages/data/dump') },
          { path: 'custom', name: 'custom', component: () => import('pages/data/custom') }
        ]
      },
      { path: 'vulnerabilities', component: () => import('pages/vulnerabilities'), meta: {breadcrumb: 'Vulnerabilities'} },
      { path: 'profile', component: () => import('pages/profile') },
      { path: 'settings', component: () => import('pages/settings') },
      { path: '403', name: '403', component: () => import('pages/403') },
      { path: '404', name: '404', component: () => import('pages/404') }
    ]
  },
  { path: '/login', component: () => import('pages/login') },
  { path: '/:catchAll(.*)*', redirect: '/' }
]
